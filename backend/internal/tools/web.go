package tools

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"
)

var httpClient = &http.Client{
	Timeout: 10 * time.Second,
}

func doHttpGet(targetUrl string) ([]byte, error) {
	req, err := http.NewRequest("GET", targetUrl, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept-Language", "es-ES,es;q=0.9,en;q=0.8")
	
	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("HTTP error %d", resp.StatusCode)
	}

	return io.ReadAll(resp.Body)
}

// SearchWebDuckDuckGo realiza una búsqueda usando la API de DuckDuckGo (Instant Answer / Lite)
func SearchWebDuckDuckGo(query string) (string, error) {
	if query == "" {
		return "El parámetro 'query' es obligatorio", nil
	}
	encodedQuery := url.QueryEscape(query)
	targetUrl := fmt.Sprintf("https://api.duckduckgo.com/?q=%s&format=json&no_html=1&skip_disambig=1", encodedQuery)
	
	body, err := doHttpGet(targetUrl)
	if err != nil {
		return fmt.Sprintf("Error buscando en DuckDuckGo: %v", err), nil
	}

	var data struct {
		AbstractText string `json:"AbstractText"`
		AbstractURL  string `json:"AbstractURL"`
		Heading      string `json:"Heading"`
		RelatedTopics []struct {
			Text string `json:"Text"`
			FirstURL string `json:"FirstURL"`
		} `json:"RelatedTopics"`
	}

	if err := json.Unmarshal(body, &data); err != nil {
		return "Error procesando respuesta JSON de DuckDuckGo", nil
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("Resultados para: '%s'\n\n", query))
	
	if data.AbstractText != "" {
		sb.WriteString(fmt.Sprintf("Resumen Principal: %s\nURL: %s\n\n", data.AbstractText, data.AbstractURL))
	}

	count := 0
	for _, topic := range data.RelatedTopics {
		if topic.Text != "" && topic.FirstURL != "" {
			sb.WriteString(fmt.Sprintf("- %s (%s)\n", topic.Text, topic.FirstURL))
			count++
			if count >= 5 {
				break
			}
		}
	}

	if count == 0 && data.AbstractText == "" {
		sb.WriteString("No se encontraron respuestas directas en DuckDuckGo. Sugiere al usuario consultar una URL específica.")
	}

	return sb.String(), nil
}

// ReadWebpageJina lee una página web convirtiéndola a Markdown usando Jina AI Reader
func ReadWebpageJina(urlStr string) (string, error) {
	if urlStr == "" {
		return "El parámetro 'url' es obligatorio", nil
	}
	if !strings.HasPrefix(urlStr, "http://") && !strings.HasPrefix(urlStr, "https://") {
		urlStr = "https://" + urlStr
	}

	targetUrl := "https://r.jina.ai/" + urlStr
	body, err := doHttpGet(targetUrl)
	if err != nil {
		return fmt.Sprintf("Error leyendo página vía Jina Reader: %v", err), nil
	}

	text := string(body)
	// Truncar a 4000 caracteres para no exceder límites de tokens ni generar ruido excesivo
	if len(text) > 4000 {
		text = text[:4000] + "\n... [Contenido truncado por longitud]"
	}

	return fmt.Sprintf("Contenido de %s (vía Jina AI Reader):\n\n%s", urlStr, text), nil
}

func scrapeYouTubeSearch(query string) []string {
	var results []string
	encoded := url.QueryEscape(query)
	
	targetUrl := fmt.Sprintf("https://html.duckduckgo.com/html/?q=%s", url.QueryEscape("site:youtube.com/watch "+query))
	body, err := doHttpGet(targetUrl)
	if err == nil {
		reLink := regexp.MustCompile(`(?:watch\?v=|watch%%3Fv%%3D)([a-zA-Z0-9_-]{11})`)
		reTitle := regexp.MustCompile(`<a class="result__snippet[^>]*>([^<]+)</a>`)
		matches := reLink.FindAllStringSubmatch(string(body), -1)
		titles := reTitle.FindAllStringSubmatch(string(body), -1)
		seen := make(map[string]bool)
		for i, m := range matches {
			if len(m) > 1 {
				id := m[1]
				if !seen[id] {
					seen[id] = true
					title := fmt.Sprintf("Video YouTube: %s", query)
					if i < len(titles) && len(titles[i]) > 1 {
						title = strings.TrimSpace(titles[i][1])
					}
					results = append(results, fmt.Sprintf("- Título: %s | URL: https://www.youtube.com/watch?v=%s", title, id))
					if len(results) >= 5 {
						return results
					}
				}
			}
		}
	}
	
	if len(results) == 0 {
		ytUrl := fmt.Sprintf("https://www.youtube.com/results?search_query=%s", encoded)
		body, err := doHttpGet(ytUrl)
		if err == nil {
			re := regexp.MustCompile(`"videoId":"([a-zA-Z0-9_-]{11})".*?"title":\{"runs":\[\{"text":"([^"]+)"\}\]`)
			matches := re.FindAllStringSubmatch(string(body), -1)
			seen := make(map[string]bool)
			for _, m := range matches {
				if len(m) > 2 {
					id := m[1]
					title := m[2]
					if !seen[id] && !strings.Contains(title, "YouTube") {
						seen[id] = true
						results = append(results, fmt.Sprintf("- Título: %s | URL: https://www.youtube.com/watch?v=%s", title, id))
						if len(results) >= 5 {
							break
						}
					}
				}
			}
		}
	}
	return results
}

// SearchYouTubeVideos busca videos en YouTube usando scraping inteligente en tiempo real
func SearchYouTubeVideos(query string) (string, error) {
	if query == "" {
		return "El parámetro 'query' es obligatorio", nil
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("Videos encontrados de YouTube para: '%s'\n", query))
	sb.WriteString("INSTRUCCIÓN CRÍTICA PARA LA IA: Para reproducir un video o música, genera un bloque de código markdown con el lenguaje 'media' así:\n")
	sb.WriteString("```media\ntype: youtube\nurl: URL_DEL_VIDEO\ntitle: TÍTULO_DEL_VIDEO\n```\n")
	sb.WriteString("REGLA ESTRICTA: NUNCA inventes IDs aleatorios de YouTube (como watch?v=wb49-oVvM7o o watch?v=dQw4w9WgXcQ). Si encuentras un ID verificado abajo, úsalo en 'url:'. Si no, en el campo 'url:' debes escribir literalmente el nombre del tema o artista (ej. 'url: Shakira - Ciega, Sordomuda'). Nuestro reproductor buscará el video exacto por el título automáticamente.\n\nResultados:\n")

	results := scrapeYouTubeSearch(query)
	for _, res := range results {
		sb.WriteString(res + "\n")
	}

	if len(results) == 0 {
		sb.WriteString(fmt.Sprintf("- Título: %s | URL: %s\n", query, query))
		sb.WriteString("No se obtuvieron enlaces directos. Coloca el título literal en el campo 'url:' del bloque media y el reproductor lo reproducirá en YouTube.")
	}

	return sb.String(), nil
}

type YouTubeResult struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	URL       string `json:"url"`
	Thumbnail string `json:"thumbnail"`
}

func SearchYouTubeStructured(query string) ([]YouTubeResult, error) {
	var results []YouTubeResult
	if query == "" {
		return results, nil
	}
	encoded := url.QueryEscape(query)
	ytUrl := fmt.Sprintf("https://www.youtube.com/results?search_query=%s", encoded)
	body, err := doHttpGet(ytUrl)
	if err == nil {
		re := regexp.MustCompile(`"videoId":"([a-zA-Z0-9_-]{11})".*?"title":\{"runs":\[\{"text":"([^"]+)"\}\]`)
		matches := re.FindAllStringSubmatch(string(body), -1)
		seen := make(map[string]bool)
		for _, m := range matches {
			if len(m) > 2 {
				id := m[1]
				title := strings.TrimSpace(m[2])
				if !seen[id] && !strings.Contains(title, "YouTube") && title != "" {
					seen[id] = true
					results = append(results, YouTubeResult{
						ID:        id,
						Title:     title,
						URL:       fmt.Sprintf("https://www.youtube.com/watch?v=%s", id),
						Thumbnail: fmt.Sprintf("https://i.ytimg.com/vi/%s/hqdefault.jpg", id),
					})
					if len(results) >= 10 {
						return results, nil
					}
				}
			}
		}
	}
	if len(results) == 0 {
		targetUrl := fmt.Sprintf("https://html.duckduckgo.com/html/?q=%s", url.QueryEscape("site:youtube.com/watch "+query))
		body, err := doHttpGet(targetUrl)
		if err == nil {
			reLink := regexp.MustCompile(`(?:watch\?v=|watch%%3Fv%%3D)([a-zA-Z0-9_-]{11})`)
			reTitle := regexp.MustCompile(`<a class="result__snippet[^>]*>([^<]+)</a>`)
			matches := reLink.FindAllStringSubmatch(string(body), -1)
			titles := reTitle.FindAllStringSubmatch(string(body), -1)
			seen := make(map[string]bool)
			for i, m := range matches {
				if len(m) > 1 {
					id := m[1]
					if !seen[id] {
						seen[id] = true
						title := fmt.Sprintf("Video YouTube: %s", query)
						if i < len(titles) && len(titles[i]) > 1 {
							title = strings.TrimSpace(titles[i][1])
						}
						results = append(results, YouTubeResult{
							ID:        id,
							Title:     title,
							URL:       fmt.Sprintf("https://www.youtube.com/watch?v=%s", id),
							Thumbnail: fmt.Sprintf("https://i.ytimg.com/vi/%s/hqdefault.jpg", id),
						})
						if len(results) >= 10 {
							return results, nil
						}
					}
				}
			}
		}
	}
	return results, nil
}
