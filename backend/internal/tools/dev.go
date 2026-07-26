package tools

import (
	"encoding/json"
	"fmt"
	"net/url"
	"strings"
)

// GetGitHubRepoIssues obtiene los issues abiertos de un repositorio
func GetGitHubRepoIssues(repo string) (string, error) {
	if repo == "" || !strings.Contains(repo, "/") {
		return "El formato debe ser 'usuario/repositorio' (ej. facebook/react)", nil
	}

	targetUrl := fmt.Sprintf("https://api.github.com/repos/%s/issues?state=open&per_page=5&sort=updated", repo)
	body, err := doHttpGet(targetUrl)
	if err != nil {
		return fmt.Sprintf("Error al consultar repositorio GitHub: %v", err), nil
	}

	var issues []struct {
		Number  int    `json:"number"`
		Title   string `json:"title"`
		State   string `json:"state"`
		HTMLURL string `json:"html_url"`
		User    struct {
			Login string `json:"login"`
		} `json:"user"`
	}

	if err := json.Unmarshal(body, &issues); err != nil {
		return "Error al interpretar JSON de GitHub. Puede que el repositorio no exista o se haya excedido el límite de API anónima.", nil
	}

	if len(issues) == 0 {
		return fmt.Sprintf("El repositorio %s no tiene issues abiertos recientes o no es público.", repo), nil
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("Últimos 5 issues abiertos en %s:\n\n", repo))
	for _, iss := range issues {
		sb.WriteString(fmt.Sprintf("#%d: %s (por @%s)\nEnlace: %s\n\n", iss.Number, iss.Title, iss.User.Login, iss.HTMLURL))
	}

	return sb.String(), nil
}

// GetGitHubUserRepos obtiene los repositorios públicos de un usuario en GitHub
func GetGitHubUserRepos(username string) (string, error) {
	if username == "" {
		return "El parámetro 'username' es obligatorio", nil
	}

	targetUrl := fmt.Sprintf("https://api.github.com/users/%s/repos?sort=updated&per_page=5", username)
	body, err := doHttpGet(targetUrl)
	if err != nil {
		return fmt.Sprintf("Error consultando usuario de GitHub: %v", err), nil
	}

	var repos []struct {
		Name        string `json:"name"`
		Description string `json:"description"`
		HTMLURL     string `json:"html_url"`
		Stargazers  int    `json:"stargazers_count"`
		Language    string `json:"language"`
	}

	if err := json.Unmarshal(body, &repos); err != nil {
		return "Error interpretando JSON de repositorios.", nil
	}

	if len(repos) == 0 {
		return fmt.Sprintf("El usuario %s no tiene repositorios públicos.", username), nil
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("Repositorios actualizados recientemente de @%s:\n\n", username))
	for _, r := range repos {
		desc := r.Description
		if desc == "" {
			desc = "Sin descripción"
		}
		sb.WriteString(fmt.Sprintf("- %s (%s) | ⭐ %d\n  Descripción: %s\n  Enlace: %s\n\n", r.Name, r.Language, r.Stargazers, desc, r.HTMLURL))
	}

	return sb.String(), nil
}

// GetWeather consulta el clima desde wttr.in en formato texto plano limpio
func GetWeather(city string) (string, error) {
	if city == "" {
		city = "" // wttr.in detecta IP por defecto si está vacío
	}
	encodedCity := url.PathEscape(city)
	targetUrl := fmt.Sprintf("https://wttr.in/%s?format=%%l:+%%c++%%t,++Humedad:++%%h,++Viento:++%%w", encodedCity)

	body, err := doHttpGet(targetUrl)
	if err != nil {
		return fmt.Sprintf("Error obteniendo clima para %s: %v", city, err), nil
	}

	return fmt.Sprintf("Reporte de clima: %s", string(body)), nil
}

// TestMockAPI hace peticiones de prueba a JSONPlaceholder
func TestMockAPI(endpoint string) (string, error) {
	if endpoint == "" {
		endpoint = "posts/1"
	}
	endpoint = strings.TrimPrefix(endpoint, "/")
	targetUrl := fmt.Sprintf("https://jsonplaceholder.typicode.com/%s", endpoint)

	body, err := doHttpGet(targetUrl)
	if err != nil {
		return fmt.Sprintf("Error consultando mock API (%s): %v", targetUrl, err), nil
	}

	text := string(body)
	if len(text) > 1500 {
		text = text[:1500] + "\n... [Respuesta JSON truncada]"
	}

	return fmt.Sprintf("Respuesta de Mock API (%s):\n```json\n%s\n```", targetUrl, text), nil
}
