package main

import (
	"log"

	"orbit-backend/internal/config"
	"orbit-backend/internal/handler"
	"orbit-backend/internal/service"

	"github.com/gin-gonic/gin"
)

func main() {
	// 1. Cargar Configuración (variables de entorno)
	cfg := config.LoadConfig()

	// 2. Inicializar Servicio (Gemini)
	aiService := service.NewAIService()

	// 3. Inicializar Handlers
	chatHandler := handler.NewChatHandler(aiService, cfg.GoogleAPIKey)
	systemHandler := handler.NewSystemHandler(cfg.GoogleAPIKey)
	fileHandler := handler.NewFileHandler(aiService, cfg.GoogleAPIKey)

	// 5. Configurar el Servidor y Enrutador Gin
	gin.SetMode(gin.ReleaseMode) // Cambiar a gin.DebugMode si necesitas ver los logs detallados
	router := gin.Default()

	// Middleware global (CORS) - Básico para permitir que el frontend de Tauri se conecte
	router.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, PATCH, SELECT")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Google-API-Key, X-Google-API-Tier")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// Agrupamos las rutas bajo /api (Sin límite de peticiones para entorno local)
	api := router.Group("/api")
	{
		// Health Check
		api.GET("/health", systemHandler.Health)

		// Modelos
		api.GET("/models", systemHandler.Models)
		api.POST("/models/reset", systemHandler.ResetModelsQuota)

		// Runtimes instalados
		api.GET("/runtimes", systemHandler.Runtimes)

		// Búsqueda multimedia
		api.GET("/media/search", systemHandler.SearchMedia)

		// Subida de Archivos a Gemini
		api.POST("/upload", fileHandler.HandleUpload)

		// Chat IA
		api.POST("/chat", chatHandler.HandleChat)
	}

	address := "127.0.0.1:" + cfg.Port
	log.Printf("Iniciando servidor de Orbit en http://%s...", address)

	if err := router.Run(address); err != nil {
		log.Fatalf("Error al arrancar el servidor: %v", err)
	}
}
