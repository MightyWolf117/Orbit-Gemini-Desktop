package tools

import (
	"google.golang.org/genai"
)

// GetExternalDeclarations devuelve la lista de declaraciones de las 12 herramientas externas de Orbit
func GetExternalDeclarations() []*genai.FunctionDeclaration {
	return []*genai.FunctionDeclaration{
		{
			Name:        "search_web_duckduckgo",
			Description: "Busca información en internet en tiempo real usando el motor libre DuckDuckGo. Ideal para noticias actuales o documentación.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"query": {Type: genai.TypeString, Description: "Términos de búsqueda en internet"},
				},
				Required: []string{"query"},
			},
		},
		{
			Name:        "read_webpage_jina",
			Description: "Lee una página web o artículo dada su URL y devuelve todo su contenido convertido a Markdown limpio vía Jina AI Reader.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"url": {Type: genai.TypeString, Description: "URL completa o dominio de la página web a leer"},
				},
				Required: []string{"url"},
			},
		},
		{
			Name:        "search_youtube_videos",
			Description: "Busca videos o canciones en YouTube. Devuelve títulos y enlaces para recomendar al usuario y permitir su reproducción en el reproductor de la app.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"query": {Type: genai.TypeString, Description: "Nombre de la canción, artista o tema del video de YouTube a buscar"},
				},
				Required: []string{"query"},
			},
		},
		{
			Name:        "get_github_repo_issues",
			Description: "Obtiene la lista de los últimos problemas (issues) abiertos en un repositorio público de GitHub.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"repo": {Type: genai.TypeString, Description: "Formato 'usuario/repositorio' (ej. facebook/react)"},
				},
				Required: []string{"repo"},
			},
		},
		{
			Name:        "get_github_user_repos",
			Description: "Muestra los repositorios públicos recientes actualizados por un usuario de GitHub.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"username": {Type: genai.TypeString, Description: "Nombre de usuario o perfil en GitHub"},
				},
				Required: []string{"username"},
			},
		},
		{
			Name:        "get_weather",
			Description: "Consulta el clima actual y pronóstico de cualquier ciudad en tiempo real desde wttr.in.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"city": {Type: genai.TypeString, Description: "Nombre de la ciudad (ej. Madrid, Bogota, Buenos Aires, Mexico City)"},
				},
			},
		},
		{
			Name:        "test_mock_api",
			Description: "Realiza una petición de prueba a endpoints públicos de JSONPlaceholder para probar datos simulados con desarrolladores.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"endpoint": {Type: genai.TypeString, Description: "Ruta del endpoint de prueba (ej. 'posts/1', 'users', 'todos/1')"},
				},
			},
		},
		{
			Name:        "search_wikipedia",
			Description: "Busca artículos y conceptos en Wikipedia en el idioma indicado.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"query": {Type: genai.TypeString, Description: "Concepto o tema a buscar en Wikipedia"},
					"lang":  {Type: genai.TypeString, Description: "Código de idioma ISO (ej. 'es' para español, 'en' para inglés). Por defecto 'es'."},
				},
				Required: []string{"query"},
			},
		},
		{
			Name:        "search_anime_manga",
			Description: "Busca información, calificación y sinopsis de series de Anime o Manga vía Jikan API (MyAnimeList).",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"query": {Type: genai.TypeString, Description: "Nombre de la serie de anime o manga"},
					"type":  {Type: genai.TypeString, Description: "Tipo de contenido: 'anime' o 'manga'"},
				},
				Required: []string{"query"},
			},
		},
		{
			Name:        "search_books",
			Description: "Busca libros, novelas y autores en la biblioteca mundial Open Library.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"query": {Type: genai.TypeString, Description: "Título del libro o nombre del autor"},
				},
				Required: []string{"query"},
			},
		},
		{
			Name:        "get_nasa_apod",
			Description: "Obtiene la fotografía astronómica del día de la NASA junto con su explicación científica oficial.",
		},
		{
			Name:        "get_currency_rate",
			Description: "Obtiene la tasa de conversión en tiempo real entre dos divisas o monedas internacionales.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"from": {Type: genai.TypeString, Description: "Código ISO de la moneda origen (ej. USD, EUR, MXN, COP, ARS, CLP)"},
					"to":   {Type: genai.TypeString, Description: "Código ISO de la moneda destino (ej. EUR, USD, COP, MXN)"},
				},
			},
		},
	}
}

func getStringArg(args map[string]any, key string) string {
	if val, ok := args[key]; ok {
		if str, ok := val.(string); ok {
			return str
		}
	}
	return ""
}

// ExecuteExternalTool ejecuta la herramienta correspondiente si está en el registro
func ExecuteExternalTool(funcName string, args map[string]any) (string, error, bool) {
	switch funcName {
	case "search_web_duckduckgo":
		res, err := SearchWebDuckDuckGo(getStringArg(args, "query"))
		return res, err, true
	case "read_webpage_jina":
		res, err := ReadWebpageJina(getStringArg(args, "url"))
		return res, err, true
	case "search_youtube_videos":
		res, err := SearchYouTubeVideos(getStringArg(args, "query"))
		return res, err, true
	case "get_github_repo_issues":
		res, err := GetGitHubRepoIssues(getStringArg(args, "repo"))
		return res, err, true
	case "get_github_user_repos":
		res, err := GetGitHubUserRepos(getStringArg(args, "username"))
		return res, err, true
	case "get_weather":
		res, err := GetWeather(getStringArg(args, "city"))
		return res, err, true
	case "test_mock_api":
		res, err := TestMockAPI(getStringArg(args, "endpoint"))
		return res, err, true
	case "search_wikipedia":
		res, err := SearchWikipedia(getStringArg(args, "query"), getStringArg(args, "lang"))
		return res, err, true
	case "search_anime_manga":
		res, err := SearchAnimeManga(getStringArg(args, "query"), getStringArg(args, "type"))
		return res, err, true
	case "search_books":
		res, err := SearchBooks(getStringArg(args, "query"))
		return res, err, true
	case "get_nasa_apod":
		res, err := GetNASAAPOD()
		return res, err, true
	case "get_currency_rate":
		res, err := GetCurrencyRate(getStringArg(args, "from"), getStringArg(args, "to"))
		return res, err, true
	}
	return "", nil, false
}
