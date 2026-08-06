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
	SenderName  string       `json:"sender_name,omitempty"` // Para chats grupales
}

type PersonalityInfo struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Instructions string `json:"instructions"`
}

// ChatRequest representa la solicitud entrante al endpoint de chat
type ChatRequest struct {
	Messages           []ChatMessage     `json:"messages"`
	PersonalityPrompt  string            `json:"personality_prompt,omitempty"` // Mantenido para retrocompatibilidad/chat individual
	IsGroupChat        bool              `json:"is_group_chat,omitempty"`
	GroupPersonalities []PersonalityInfo `json:"group_personalities,omitempty"`
	ManualTarget       string            `json:"manual_target,omitempty"` // ID de personalidad si se usa modo manual
	RoomContext        string            `json:"room_context,omitempty"`
	GenerateTitle      bool              `json:"generate_title,omitempty"`
	ChatCode           *int64            `json:"chat_code,omitempty"`
	Model              string            `json:"model,omitempty"`
	Temperature        *float32          `json:"temperature,omitempty"`
	EnableSystemTools  bool              `json:"enable_system_tools,omitempty"`
}

// ChatResponse representa la respuesta que devolvemos al frontend
type ChatResponse struct {
	Response        string `json:"response"`
	ResponderName   string `json:"responder_name,omitempty"` // Quién respondió en el chat grupal
	Title           string `json:"title,omitempty"`
	Error           string `json:"error,omitempty"`
	PromptTokens    int32  `json:"prompt_tokens,omitempty"`
	CandidateTokens int32  `json:"candidate_tokens,omitempty"`
	TotalTokens     int32  `json:"total_tokens,omitempty"`
}

// AIService define los métodos de negocio para interactuar con la IA
type AIService interface {
	GenerateResponse(ctx context.Context, req ChatRequest, apiKey string) (*ChatResponse, error)
	UploadFile(ctx context.Context, filePath string, mimeType string, apiKey string) (string, error)
}
