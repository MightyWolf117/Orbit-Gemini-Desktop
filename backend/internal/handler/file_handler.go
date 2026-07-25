package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"orbit-backend/internal/domain"
)

type FileHandler struct {
	aiService      domain.AIService
	fallbackApiKey string
}

func NewFileHandler(aiService domain.AIService, fallbackApiKey string) *FileHandler {
	return &FileHandler{
		aiService:      aiService,
		fallbackApiKey: fallbackApiKey,
	}
}

type UploadRequest struct {
	FilePath string `json:"file_path"`
	MimeType string `json:"mime_type"`
}

type UploadResponse struct {
	URI   string `json:"uri,omitempty"`
	Error string `json:"error,omitempty"`
}

func (h *FileHandler) HandleUpload(c *gin.Context) {
	var req UploadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, UploadResponse{
			Error: "Cuerpo de la petición inválido: " + err.Error(),
		})
		return
	}

	apiKey := c.GetHeader("X-Google-API-Key")
	if apiKey == "" {
		apiKey = h.fallbackApiKey
	}
	if apiKey == "" {
		c.JSON(http.StatusUnauthorized, UploadResponse{
			Error: "API Key de Google no configurada. Por favor, añádela en Ajustes.",
		})
		return
	}

	if req.FilePath == "" {
		c.JSON(http.StatusBadRequest, UploadResponse{
			Error: "Se requiere la ruta del archivo",
		})
		return
	}

	uri, err := h.aiService.UploadFile(c.Request.Context(), req.FilePath, req.MimeType, apiKey)
	if err != nil {
		c.JSON(http.StatusInternalServerError, UploadResponse{
			Error: "Error subiendo archivo a Gemini: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, UploadResponse{
		URI: uri,
	})
}
