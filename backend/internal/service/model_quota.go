package service

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

type ModelStats struct {
	ID                 string `json:"id"`
	DisplayName        string `json:"displayName"`
	Description        string `json:"description"`
	UsageCount         int    `json:"usageCount"`
	EstimatedLimit     int    `json:"estimatedLimit"`
	LimitReached       bool   `json:"limitReached"`
	LimitReached429    bool   `json:"limitReached429"`
	RequiresBilling403 bool   `json:"requiresBilling403"`
	AvailableStatus    string `json:"availableStatus"`
	Status             string `json:"status"`
	QuotaMessage       string `json:"quotaMessage"`
}

type ModelQuotaEntry struct {
	UsageCount         int    `json:"usage_count"`
	LimitReached429    bool   `json:"limit_reached_429"`
	RequiresBilling403 bool   `json:"requires_billing_403"`
	AvailableStatus    string `json:"available_status"`
}

type ModelsConfigFile struct {
	LastResetDate string                      `json:"last_reset_date"`
	Models        map[string]*ModelQuotaEntry `json:"models"`
}

type ModelQuotaService struct {
	configPath string
	mu         sync.RWMutex
	config     *ModelsConfigFile
}

var (
	globalQuotaService *ModelQuotaService
	onceQuota          sync.Once
)

// GetGlobalModelQuotaService devuelve la instancia única del servicio de cuotas
func GetGlobalModelQuotaService() *ModelQuotaService {
	onceQuota.Do(func() {
		homeDir, err := os.UserHomeDir()
		var path string
		if err == nil {
			dir := filepath.Join(homeDir, ".orbit")
			_ = os.MkdirAll(dir, 0755)
			path = filepath.Join(dir, "models_config.json")
		} else {
			path = "models_config.json"
		}
		globalQuotaService = NewModelQuotaService(path)
	})
	return globalQuotaService
}

func NewModelQuotaService(configPath string) *ModelQuotaService {
	s := &ModelQuotaService{
		configPath: configPath,
		config: &ModelsConfigFile{
			LastResetDate: time.Now().Format("2006-01-02"),
			Models:        make(map[string]*ModelQuotaEntry),
		},
	}
	s.loadConfig()
	return s
}

func (s *ModelQuotaService) loadConfig() {
	s.mu.Lock()
	defer s.mu.Unlock()

	data, err := os.ReadFile(s.configPath)
	if err != nil {
		// No existe el archivo o error, mantenemos default
		return
	}

	var cfg ModelsConfigFile
	if err := json.Unmarshal(data, &cfg); err == nil {
		if cfg.Models == nil {
			cfg.Models = make(map[string]*ModelQuotaEntry)
		}
		s.config = &cfg
	}
}

func (s *ModelQuotaService) saveConfigLocked() {
	data, err := json.MarshalIndent(s.config, "", "  ")
	if err == nil {
		_ = os.WriteFile(s.configPath, data, 0644)
	}
}

// checkResetDailyLocked verifica si cambió el día para limpiar los contadores 429 y diarios
func (s *ModelQuotaService) checkResetDailyLocked() {
	today := time.Now().Format("2006-01-02")
	if s.config.LastResetDate != today {
		s.config.LastResetDate = today
		for _, entry := range s.config.Models {
			entry.UsageCount = 0
			entry.LimitReached429 = false
			if entry.AvailableStatus == "🛑 Límite diario alcanzado (429)" || strings.Contains(entry.AvailableStatus, "Límite") {
				entry.AvailableStatus = "Activo"
			}
		}
		s.saveConfigLocked()
	}
}

// GetEstimatedLimit calcula el límite de RPD estimado según Google Gemini API Docs
func GetEstimatedLimit(modelID string, tier string) int {
	tier = strings.ToLower(strings.TrimSpace(tier))
	isPaid := tier == "paid" || tier == "billing" || tier == "facturacion" || tier == "pay-as-you-go"

	if isPaid {
		return 4000000 // Prácticamente ilimitado / 4M RPD
	}

	// Capa Gratuita (Free Tier)
	if strings.Contains(modelID, "pro") && !strings.Contains(modelID, "flash") {
		return 50 // Gemini 1.5 Pro y 2.0 Pro tienen 50 RPD gratis
	}
	// Gemini 1.5 Flash, 2.0 Flash, 1.0 Pro tienen 1,500 RPD gratis
	return 1500
}

// GetModelStats obtiene todas las estadísticas y el estado de cuota de un modelo
func (s *ModelQuotaService) GetModelStats(modelID string, displayName string, description string, tier string) ModelStats {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.checkResetDailyLocked()

	entry, exists := s.config.Models[modelID]
	if !exists {
		entry = &ModelQuotaEntry{
			UsageCount:         0,
			LimitReached429:    false,
			RequiresBilling403: false,
			AvailableStatus:    "Activo",
		}
		s.config.Models[modelID] = entry
	}

	limit := GetEstimatedLimit(modelID, tier)
	limitReached := entry.UsageCount >= limit || entry.LimitReached429

	status := entry.AvailableStatus
	if status == "" || status == "Activo" {
		if entry.RequiresBilling403 {
			status = "solo plan con facturación"
		} else if limitReached {
			status = "🛑 Límite diario alcanzado (429)"
		} else {
			status = fmt.Sprintf("Activo (%d/%d RPD)", entry.UsageCount, limit)
		}
	}

	var quotaMsg string
	if entry.RequiresBilling403 {
		quotaMsg = "🔒 Modelo de pago: No disponible en capa gratuita. Requiere una API Key con facturación (Pay-As-You-Go) en Google Cloud."
	} else if entry.LimitReached429 {
		quotaMsg = "🛑 Límite de cuota excedido (Error 429 devuelto por Google). El acceso a este modelo se restablecerá automáticamente mañana."
	} else if entry.UsageCount >= limit {
		quotaMsg = fmt.Sprintf("⚠️ Has alcanzado el tope diario estimado (%d peticiones) para tu capa '%s'.", limit, tier)
	} else {
		remaining := limit - entry.UsageCount
		quotaMsg = fmt.Sprintf("📊 Cuota diaria: %d de %d peticiones realizadas hoy (%d restantes en capa %s).", entry.UsageCount, limit, remaining, tier)
	}

	return ModelStats{
		ID:                 modelID,
		DisplayName:        displayName,
		Description:        description,
		UsageCount:         entry.UsageCount,
		EstimatedLimit:     limit,
		LimitReached:       limitReached,
		LimitReached429:    entry.LimitReached429,
		RequiresBilling403: entry.RequiresBilling403,
		AvailableStatus:    status,
		Status:             status,
		QuotaMessage:       quotaMsg,
	}
}

// RecordSuccess incrementa el contador del modelo en +1 al responder un 200 OK
func (s *ModelQuotaService) RecordSuccess(modelID string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.checkResetDailyLocked()

	entry, exists := s.config.Models[modelID]
	if !exists {
		entry = &ModelQuotaEntry{AvailableStatus: "Activo"}
		s.config.Models[modelID] = entry
	}
	entry.UsageCount++
	s.saveConfigLocked()
}

// Record429 activa el check booleano diario cuando Google responde 429 Quota Exceeded
func (s *ModelQuotaService) Record429(modelID string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.checkResetDailyLocked()

	entry, exists := s.config.Models[modelID]
	if !exists {
		entry = &ModelQuotaEntry{}
		s.config.Models[modelID] = entry
	}
	entry.LimitReached429 = true
	entry.AvailableStatus = "🛑 Límite diario alcanzado (429)"
	s.saveConfigLocked()
}

// Record403 marca el modelo como solo disponible en plan de pago cuando Google responde 403 / billing
func (s *ModelQuotaService) Record403(modelID string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.checkResetDailyLocked()

	entry, exists := s.config.Models[modelID]
	if !exists {
		entry = &ModelQuotaEntry{}
		s.config.Models[modelID] = entry
	}
	entry.RequiresBilling403 = true
	entry.AvailableStatus = "solo plan con facturación"
	s.saveConfigLocked()
}

// ResetManual reinicia los contadores manualmente (para el botón en la UI)
func (s *ModelQuotaService) ResetManual() {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.config.LastResetDate = time.Now().Format("2006-01-02")
	for _, entry := range s.config.Models {
		entry.UsageCount = 0
		entry.LimitReached429 = false
		if entry.AvailableStatus == "🛑 Límite diario alcanzado (429)" {
			entry.AvailableStatus = "Activo"
		}
	}
	s.saveConfigLocked()
}
