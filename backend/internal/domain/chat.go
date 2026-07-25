package domain

import "context"

// Attachment representa un archivo adjunto enviado por el usuario
type Attachment struct {
	MimeType string `json:"mime_type"`
	Data     string `json:"data,omitempty"`     // Base64 para archivos < 20MB
	FileURI  string `json:"file_uri,omitempty"` // URI de Google Files API para >= 20MB
}

// ChatMessage representa un mensaje individual en la conversación
type ChatMessage struct {
	Role        string       `json:"role"`    // "user" o "model"
	Content     string       `json:"content"` // Contenido del mensaje
	Attachments []Attachment `json:"attachments,omitempty"`
}

// ChatRequest representa la solicitud entrante al endpoint de chat
type ChatRequest struct {
	Messages          []ChatMessage `json:"messages"`
	PersonalityPrompt string        `json:"personality_prompt,omitempty"`
	GenerateTitle     bool          `json:"generate_title,omitempty"`
	ChatCode          *int64        `json:"chat_code,omitempty"` // Código único del chat desde el frontend
	Model         string        `json:"model,omitempty"`
	Temperature   *float32      `json:"temperature,omitempty"`
	EnableSystemTools bool      `json:"enable_system_tools,omitempty"`
}

// ChatResponse representa la respuesta que devolvemos al frontend
type ChatResponse struct {
	Response string `json:"response"`
	Title    string `json:"title,omitempty"` // Título generado para el historial, si GenerateTitle era true
	Error     string     `json:"error,omitempty"`
}

// AIService define los métodos de negocio para interactuar con la IA
type AIService interface {
	GenerateResponse(ctx context.Context, req ChatRequest, apiKey string) (*ChatResponse, error)
	UploadFile(ctx context.Context, filePath string, mimeType string, apiKey string) (string, error)
}
