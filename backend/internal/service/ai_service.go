package service

import (
	"context"
	"encoding/base64"
	"fmt"
	"log"
	"strings"

	"google.golang.org/genai"

	"orbit-backend/internal/domain"
)

type aiService struct{}

func NewAIService() domain.AIService {
	return &aiService{}
}

func (s *aiService) GenerateResponse(ctx context.Context, req domain.ChatRequest, apiKey string) (*domain.ChatResponse, error) {
	// Inicializar el cliente de Google Gemini
	client, err := genai.NewClient(ctx, &genai.ClientConfig{
		Backend: genai.BackendGeminiAPI,
		APIKey:  apiKey,
	})
	if err != nil {
		return nil, fmt.Errorf("error inicializando cliente gemini: %w", err)
	}

	modelName := "gemini-1.5-flash"
	if req.Model != "" {
		modelName = req.Model
	}

	config := &genai.GenerateContentConfig{
		Temperature: req.Temperature,
	}

	prompt := req.PersonalityPrompt
	if prompt == "" {
		prompt = "Eres un asistente virtual útil e inteligente."
	}
	config.SystemInstruction = &genai.Content{
		Parts: []*genai.Part{genai.NewPartFromText(prompt)},
	}

	if req.EnableSystemTools {
		config.Tools = []*genai.Tool{
			{
				FunctionDeclarations: GetSystemTools(),
			},
		}
	}

	var history []*genai.Content
	if len(req.Messages) == 0 {
		return nil, fmt.Errorf("la solicitud de chat no contiene mensajes")
	}

	for i := 0; i < len(req.Messages)-1; i++ {
		msg := req.Messages[i]
		role := "user"
		if msg.Role == "model" || msg.Role == "assistant" {
			role = "model"
		}

		parts := []*genai.Part{genai.NewPartFromText(msg.Content)}
		for _, att := range msg.Attachments {
			if att.Data != "" {
				b64data := att.Data
				if idx := strings.Index(b64data, ","); idx != -1 {
					b64data = b64data[idx+1:]
				}
				decoded, err := base64.StdEncoding.DecodeString(b64data)
				if err == nil {
					parts = append(parts, genai.NewPartFromBytes(decoded, att.MimeType))
				} else {
					log.Printf("Error decodificando base64: %v", err)
				}
			} else if att.FileURI != "" {
				parts = append(parts, genai.NewPartFromURI(att.FileURI, att.MimeType))
			}
		}

		history = append(history, &genai.Content{
			Parts: parts,
			Role:  role,
		})
	}

	// Create chat session
	chat, err := client.Chats.Create(ctx, modelName, config, history)
	if err != nil {
		return nil, fmt.Errorf("error iniciando chat: %w", err)
	}

	// Prepare last message
	lastMsg := req.Messages[len(req.Messages)-1]
	lastParts := []*genai.Part{genai.NewPartFromText(lastMsg.Content)}
	for _, att := range lastMsg.Attachments {
		if att.Data != "" {
			b64data := att.Data
			if idx := strings.Index(b64data, ","); idx != -1 {
				b64data = b64data[idx+1:]
			}
			decoded, err := base64.StdEncoding.DecodeString(b64data)
			if err == nil {
				lastParts = append(lastParts, genai.NewPartFromBytes(decoded, att.MimeType))
			}
		} else if att.FileURI != "" {
			lastParts = append(lastParts, genai.NewPartFromURI(att.FileURI, att.MimeType))
		}
	}

	resp, err := chat.Send(ctx, lastParts...)
	if err != nil {
		return nil, fmt.Errorf("error generando respuesta de gemini: %w", err)
	}

	var responseText string
	for {
		if len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil || len(resp.Candidates[0].Content.Parts) == 0 {
			break
		}

		responseText += resp.Text()
		
		functionCalls := resp.FunctionCalls()
		if len(functionCalls) == 0 {
			break
		}

		var fnRespParts []*genai.Part
		for _, fc := range functionCalls {
			var result string
			var fcErr error
			
			funcName := fc.Name
			funcName = strings.TrimPrefix(funcName, "default_api:")

			switch funcName {
			case "get_system_metrics":
				result, fcErr = GetSystemMetrics()
			case "get_active_services":
				result, fcErr = GetActiveServices()
			case "get_approximate_location":
				result, fcErr = GetApproximateLocation()
			case "get_top_processes":
				result, fcErr = GetTopProcesses()
			case "get_hardware_summary":
				result, fcErr = GetHardwareSummary()
			case "get_disk_usage_details":
				result, fcErr = GetDiskUsageDetails()
			case "get_open_ports":
				result, fcErr = GetOpenPorts()
			case "get_wsl_status":
				result, fcErr = GetWSLStatus()
			case "get_installed_runtimes":
				result, fcErr = GetInstalledRuntimes()
			default:
				result = fmt.Sprintf("Función desconocida: %s", fc.Name)
			}

			log.Printf("[AI Tool Call] %s -> Result: %v (Err: %v)", fc.Name, result, fcErr)

			if fcErr != nil {
				result = fmt.Sprintf("Error ejecutando función: %v", fcErr)
			}

			responseMap := map[string]any{"result": result}
			fnRespParts = append(fnRespParts, genai.NewPartFromFunctionResponse(fc.Name, responseMap))
		}

		resp, err = chat.Send(ctx, fnRespParts...)
		if err != nil {
			return nil, fmt.Errorf("error enviando function response a gemini: %w", err)
		}
	}

	var title string
	if req.GenerateTitle && len(req.Messages) > 0 {
		firstMsg := req.Messages[0].Content
		titlePrompt := fmt.Sprintf("Actúa como un sintetizador de textos. Tienes estrictamente prohibido conversar, saludar o dar explicaciones. Resume el siguiente mensaje en un título de MÁXIMO 4 palabras. Tu única respuesta debe ser el título envuelto en etiquetas <title> y </title>.\n\nMensaje: \"%s\"", firstMsg)

		titleResp, err := client.Models.GenerateContent(ctx, "gemma-4-31b-it", []*genai.Content{{Parts: []*genai.Part{genai.NewPartFromText(titlePrompt)}, Role: "user"}}, nil)
		if err == nil && titleResp != nil {
			rawTitle := titleResp.Text()
			
			startIndex := strings.Index(rawTitle, "<title>")
			endIndex := strings.LastIndex(rawTitle, "</title>")
			if startIndex != -1 && endIndex != -1 && endIndex > startIndex {
				rawTitle = rawTitle[startIndex+7 : endIndex]
			} else {
				lines := strings.Split(rawTitle, "\n")
				for _, line := range lines {
					line = strings.TrimSpace(line)
					if len(line) > 0 && len(line) < 50 {
						rawTitle = line
						break
					}
				}
			}

			rawTitle = strings.TrimSpace(rawTitle)
			rawTitle = strings.Trim(rawTitle, "\"")
			rawTitle = strings.Trim(rawTitle, "'")
			rawTitle = strings.Trim(rawTitle, "`")
			rawTitle = strings.Trim(rawTitle, "*")
			rawTitle = strings.Trim(rawTitle, "\n")
			
			if len(rawTitle) > 100 {
				rawTitle = ""
			}

			title = rawTitle
		} else {
			log.Printf("Error generando título: %v", err)
		}

		if title == "" {
			fallbackTitle := firstMsg
			if len(fallbackTitle) > 25 {
				fallbackTitle = fallbackTitle[:22] + "..."
			}
			title = fallbackTitle
		}
	}

	return &domain.ChatResponse{
		Response: responseText,
		Title:    title,
	}, nil
}

func (s *aiService) UploadFile(ctx context.Context, filePath string, mimeType string, apiKey string) (string, error) {
	client, err := genai.NewClient(ctx, &genai.ClientConfig{
		Backend: genai.BackendGeminiAPI,
		APIKey:  apiKey,
	})
	if err != nil {
		return "", fmt.Errorf("error inicializando cliente gemini: %w", err)
	}

	var uploadOpts *genai.UploadFileConfig
	if mimeType != "" {
		uploadOpts = &genai.UploadFileConfig{MIMEType: mimeType}
	}

	file, err := client.Files.UploadFromPath(ctx, filePath, uploadOpts)
	if err != nil {
		return "", fmt.Errorf("error subiendo archivo a Gemini: %w", err)
	}

	return file.URI, nil
}
