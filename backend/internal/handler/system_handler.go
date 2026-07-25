package handler

import (
	"context"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
	"orbit-backend/internal/service"
)

type SystemHandler struct {
	fallbackApiKey string
}

func NewSystemHandler(fallbackApiKey string) *SystemHandler {
	return &SystemHandler{
		fallbackApiKey: fallbackApiKey,
	}
}

// Health responde un 200 OK para confirmar que el backend está activo
func (h *SystemHandler) Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// Models consulta la API de Google y devuelve los modelos soportados
func (h *SystemHandler) Models(c *gin.Context) {
	apiKey := c.GetHeader("X-Google-API-Key")
	if apiKey == "" {
		apiKey = h.fallbackApiKey
	}
	if apiKey == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "API Key de Google no configurada"})
		return
	}

	ctx := context.Background()
	client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "No se pudo conectar a la API de Gemini"})
		return
	}
	defer client.Close()

	// Recorremos los modelos disponibles (ej. gemini-1.5-flash, gemini-1.5-pro, etc)
	var availableModels []map[string]string
	
	iter := client.ListModels(ctx)
	for {
		m, err := iter.Next()
		if err != nil {
			// iterator.Done se devuelve cuando finaliza en la librería estándar, pero 
			// como no importamos google.golang.org/api/iterator directamente, controlamos el break al fallar.
			break
		}
		
		supported := false
		for _, method := range m.SupportedGenerationMethods {
			if method == "generateContent" {
				supported = true
				break
			}
		}

		name := m.Name
		if !supported || !strings.HasPrefix(name, "models/gemini") || strings.Contains(name, "vision") || strings.Contains(name, "embedding") || strings.Contains(name, "live-preview") {
			continue
		}

		id := strings.TrimPrefix(name, "models/")

		availableModels = append(availableModels, map[string]string{
			"id":           id,
			"displayName":  m.DisplayName,
			"description":  m.Description,
			"status":       "Activo", 
			"quotaMessage": "Para ver su cuota exacta restante comuníquese con el administrador.",
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"models": availableModels,
	})
}

// Runtimes devuelve un mapa de los lenguajes/binarios instalados
func (h *SystemHandler) Runtimes(c *gin.Context) {
	runtimesMap := service.GetInstalledRuntimesMap()
	c.JSON(http.StatusOK, runtimesMap)
}

