package tools

import (
	"encoding/json"
	"fmt"
	"net/url"
	"strings"
)

// SearchWikipedia busca en Wikipedia utilizando la API pública
func SearchWikipedia(query string, lang string) (string, error) {
	if query == "" {
		return "El parámetro 'query' es obligatorio", nil
	}
	if lang == "" {
		lang = "es" // Español por defecto
	}

	encodedQuery := url.QueryEscape(query)
	targetUrl := fmt.Sprintf("https://%s.wikipedia.org/w/api.php?action=query&list=search&srsearch=%s&format=json&utf8=1&srlimit=3", lang, encodedQuery)

	body, err := doHttpGet(targetUrl)
	if err != nil {
		return fmt.Sprintf("Error consultando Wikipedia: %v", err), nil
	}

	var data struct {
		Query struct {
			Search []struct {
				Title   string `json:"title"`
				Snippet string `json:"snippet"`
			} `json:"search"`
		} `json:"query"`
	}

	if err := json.Unmarshal(body, &data); err != nil {
		return "Error al interpretar JSON de Wikipedia.", nil
	}

	if len(data.Query.Search) == 0 {
		return fmt.Sprintf("No se encontraron resultados en Wikipedia (%s) para '%s'.", lang, query), nil
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("Resultados en Wikipedia (%s) para '%s':\n\n", lang, query))
	for _, item := range data.Query.Search {
		// Limpiar etiquetas HTML de snippet
		cleanSnippet := strings.ReplaceAll(item.Snippet, "<span class=\"searchmatch\">", "")
		cleanSnippet = strings.ReplaceAll(cleanSnippet, "</span>", "")
		cleanSnippet = strings.ReplaceAll(cleanSnippet, "&quot;", "\"")
		
		articleUrl := fmt.Sprintf("https://%s.wikipedia.org/wiki/%s", lang, url.PathEscape(item.Title))
		sb.WriteString(fmt.Sprintf("- **%s**\n  Resumen: %s...\n  Enlace: %s\n\n", item.Title, cleanSnippet, articleUrl))
	}

	return sb.String(), nil
}

// SearchAnimeManga busca anime o manga en MyAnimeList vía la API Jikan
func SearchAnimeManga(query string, mediaType string) (string, error) {
	if query == "" {
		return "El parámetro 'query' es obligatorio", nil
	}
	if mediaType != "manga" {
		mediaType = "anime"
	}

	encodedQuery := url.QueryEscape(query)
	targetUrl := fmt.Sprintf("https://api.jikan.moe/v4/%s?q=%s&limit=3", mediaType, encodedQuery)

	body, err := doHttpGet(targetUrl)
	if err != nil {
		return fmt.Sprintf("Error consultando Jikan API (%s): %v", mediaType, err), nil
	}

	var data struct {
		Data []struct {
			Title    string  `json:"title"`
			Synopsis string  `json:"synopsis"`
			Score    float64 `json:"score"`
			URL      string  `json:"url"`
			Episodes int     `json:"episodes"`
			Chapters int     `json:"chapters"`
		} `json:"data"`
	}

	if err := json.Unmarshal(body, &data); err != nil {
		return "Error al interpretar respuesta de Anime/Manga.", nil
	}

	if len(data.Data) == 0 {
		return fmt.Sprintf("No se encontraron resultados de %s para '%s'.", mediaType, query), nil
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("Resultados de %s para '%s':\n\n", strings.ToUpper(mediaType), query))
	for _, item := range data.Data {
		synopsis := item.Synopsis
		if len(synopsis) > 300 {
			synopsis = synopsis[:300] + "..."
		}
		
		details := fmt.Sprintf("Episodios: %d", item.Episodes)
		if mediaType == "manga" {
			details = fmt.Sprintf("Capítulos: %d", item.Chapters)
		}

		sb.WriteString(fmt.Sprintf("- **%s** | ⭐ %.2f | %s\n  Sinopsis: %s\n  Enlace: %s\n\n", item.Title, item.Score, details, synopsis, item.URL))
	}

	return sb.String(), nil
}

// SearchBooks busca libros usando la API de Open Library
func SearchBooks(query string) (string, error) {
	if query == "" {
		return "El parámetro 'query' es obligatorio", nil
	}
	encodedQuery := url.QueryEscape(query)
	targetUrl := fmt.Sprintf("https://openlibrary.org/search.json?q=%s&limit=3", encodedQuery)

	body, err := doHttpGet(targetUrl)
	if err != nil {
		return fmt.Sprintf("Error buscando en Open Library: %v", err), nil
	}

	var data struct {
		Docs []struct {
			Title       string   `json:"title"`
			AuthorName  []string `json:"author_name"`
			FirstPublishYear int `json:"first_publish_year"`
			Key         string   `json:"key"`
		} `json:"docs"`
	}

	if err := json.Unmarshal(body, &data); err != nil {
		return "Error interpretando JSON de Open Library", nil
	}

	if len(data.Docs) == 0 {
		return fmt.Sprintf("No se encontraron libros en Open Library para '%s'.", query), nil
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("Libros encontrados en Open Library para '%s':\n\n", query))
	for _, doc := range data.Docs {
		authors := "Autor desconocido"
		if len(doc.AuthorName) > 0 {
			authors = strings.Join(doc.AuthorName, ", ")
		}
		bookUrl := "https://openlibrary.org" + doc.Key
		sb.WriteString(fmt.Sprintf("- **%s** (%d)\n  Autor(es): %s\n  Enlace: %s\n\n", doc.Title, doc.FirstPublishYear, authors, bookUrl))
	}

	return sb.String(), nil
}

// GetNASAAPOD obtiene la foto astronómica del día de la NASA
func GetNASAAPOD() (string, error) {
	targetUrl := "https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY"

	body, err := doHttpGet(targetUrl)
	if err != nil {
		return fmt.Sprintf("Error conectando con API de NASA: %v", err), nil
	}

	var data struct {
		Title       string `json:"title"`
		Explanation string `json:"explanation"`
		URL         string `json:"url"`
		HDURL       string `json:"hdurl"`
		MediaType   string `json:"media_type"`
		Date        string `json:"date"`
	}

	if err := json.Unmarshal(body, &data); err != nil {
		return "Error interpretando JSON de la NASA", nil
	}

	imgUrl := data.URL
	if data.HDURL != "" {
		imgUrl = data.HDURL
	}

	return fmt.Sprintf("🌌 **NASA Astronomy Picture of the Day (%s)**\n\n**Título:** %s\n**Tipo:** %s\n**URL:** %s\n\n**Explicación:** %s", data.Date, data.Title, data.MediaType, imgUrl, data.Explanation), nil
}
