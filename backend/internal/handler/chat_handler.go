package handler

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"orbit-backend/internal/domain"
	"orbit-backend/internal/service"
)

type ChatHandler struct {
	aiService      domain.AIService
	fallbackApiKey string
}

func NewChatHandler(aiService domain.AIService, fallbackApiKey string) *ChatHandler {
	return &ChatHandler{
		aiService:      aiService,
		fallbackApiKey: fallbackApiKey,
	}
}

func (h *ChatHandler) HandleChat(c *gin.Context) {
	var req domain.ChatRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, domain.ChatResponse{
			Error: "Cuerpo de la petición inválido: " + err.Error(),
		})
		return
	}

	if len(req.Messages) == 0 {
		c.JSON(http.StatusBadRequest, domain.ChatResponse{
			Error: "Se requiere al menos un mensaje en el historial",
		})
		return
	}

	apiKey := c.GetHeader("X-Google-API-Key")
	if apiKey == "" {
		apiKey = h.fallbackApiKey
	}
	if apiKey == "" {
		c.JSON(http.StatusUnauthorized, domain.ChatResponse{
			Error: "API Key de Google no configurada. Por favor, añádela en Ajustes.",
		})
		return
	}

	modelID := req.Model
	if modelID == "" {
		modelID = "gemini-1.5-flash"
	}

	response, err := h.aiService.GenerateResponse(c.Request.Context(), req, apiKey)
	if err != nil {
		errStr := err.Error()
		if strings.Contains(errStr, "429") || strings.Contains(strings.ToLower(errStr), "quota") || strings.Contains(strings.ToLower(errStr), "exhausted") || strings.Contains(errStr, "RATE_LIMIT_EXCEEDED") {
			service.GetGlobalModelQuotaService().Record429(modelID)
		} else if strings.Contains(errStr, "403") || strings.Contains(strings.ToLower(errStr), "billing") || strings.Contains(strings.ToLower(errStr), "permission denied") || strings.Contains(errStr, "CONSUMER_INVALID") {
			service.GetGlobalModelQuotaService().Record403(modelID)
		}

		c.JSON(http.StatusInternalServerError, domain.ChatResponse{
			Error: "Error procesando la solicitud de IA: " + err.Error(),
		})
		return
	}

	service.GetGlobalModelQuotaService().RecordSuccess(modelID)
	c.JSON(http.StatusOK, response)
}
