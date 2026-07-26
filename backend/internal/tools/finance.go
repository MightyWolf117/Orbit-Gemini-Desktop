package tools

import (
	"encoding/json"
	"fmt"
	"strings"
)

// GetCurrencyRate obtiene tasas de cambio desde la API pública de forex open.er-api.com
func GetCurrencyRate(from string, to string) (string, error) {
	if from == "" {
		from = "USD"
	}
	if to == "" {
		to = "EUR"
	}
	from = strings.ToUpper(strings.TrimSpace(from))
	to = strings.ToUpper(strings.TrimSpace(to))

	targetUrl := fmt.Sprintf("https://open.er-api.com/v6/latest/%s", from)
	body, err := doHttpGet(targetUrl)
	if err != nil {
		return fmt.Sprintf("Error obteniendo tasas de cambio para %s: %v", from, err), nil
	}

	var data struct {
		Result string `json:"result"`
		Base   string `json:"base_code"`
		Rates  map[string]float64 `json:"rates"`
	}

	if err := json.Unmarshal(body, &data); err != nil || data.Result != "success" {
		return fmt.Sprintf("Error consultando divisa base '%s'. Verifica que el código ISO (ej. USD, EUR, MXN, COP, ARS) sea válido.", from), nil
	}

	rate, exists := data.Rates[to]
	if !exists {
		return fmt.Sprintf("No se encontró la tasa de conversión para la divisa destino '%s'.", to), nil
	}

	// También mostramos un top 5 de divisas populares si las piden
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("💱 Tasa de Cambio en Tiempo Real (%s -> %s):\n\n", from, to))
	sb.WriteString(fmt.Sprintf("**1 %s = %.4f %s**\n\n", from, rate, to))
	
	sb.WriteString("Otras conversiones populares desde " + from + ":\n")
	popular := []string{"USD", "EUR", "GBP", "MXN", "COP", "ARS", "JPY", "CAD"}
	for _, p := range popular {
		if p != from && p != to {
			if r, ok := data.Rates[p]; ok {
				sb.WriteString(fmt.Sprintf("- 1 %s = %.4f %s\n", from, r, p))
			}
		}
	}

	return sb.String(), nil
}
