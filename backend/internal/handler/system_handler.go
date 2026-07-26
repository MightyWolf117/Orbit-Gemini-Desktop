package handler

import (
	"context"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
	"orbit-backend/internal/service"
	"orbit-backend/internal/tools"
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
	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"service": "orbit-backend",
	})
}

// Models consulta la API de Google y devuelve los modelos soportados
func (h *SystemHandler) Models(c *gin.Context) {
	apiKey := c.GetHeader("X-Google-API-Key")
	if apiKey == "" {
		apiKey = h.fallbackApiKey
	}
	if apiKey == "" {
		c.JSON(http.StatusOK, gin.H{"models": []service.ModelStats{}})
		return
	}

	ctx := context.Background()
	client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error al conectar con la API de Google Gemini"})
		return
	}
	defer client.Close()

	tier := c.Query("tier")
	if tier == "" {
		tier = c.GetHeader("X-Google-API-Tier")
	}
	if tier == "" {
		tier = "free"
	}

	// Recorremos los modelos disponibles (ej. gemini-1.5-flash, gemini-1.5-pro, etc)
	var availableModels []service.ModelStats
	
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

		stats := service.GetGlobalModelQuotaService().GetModelStats(id, m.DisplayName, m.Description, tier)
		availableModels = append(availableModels, stats)
	}

	c.JSON(http.StatusOK, gin.H{
		"models": availableModels,
	})
}

// ResetModelsQuota restablece manualmente el contador de cuotas del día
func (h *SystemHandler) ResetModelsQuota(c *gin.Context) {
	service.GetGlobalModelQuotaService().ResetManual()
	c.JSON(http.StatusOK, gin.H{"status": "ok", "message": "Contadores reiniciados exitosamente"})
}

// Runtimes devuelve un mapa de los lenguajes/binarios instalados
func (h *SystemHandler) Runtimes(c *gin.Context) {
	runtimesMap := service.GetInstalledRuntimesMap()
	c.JSON(http.StatusOK, runtimesMap)
}

// SearchMedia busca contenido multimedia en YouTube
func (h *SystemHandler) SearchMedia(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "El parámetro q es requerido"})
		return
	}
	results, err := tools.SearchYouTubeStructured(query)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"results": results})
}
