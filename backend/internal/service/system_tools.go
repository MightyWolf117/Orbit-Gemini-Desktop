package service

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os/exec"
	"runtime"
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/mem"
	"google.golang.org/genai"
)

// GetSystemTools returns the list of system tools available for Gemini
func GetSystemTools() []*genai.FunctionDeclaration {
	return []*genai.FunctionDeclaration{
		{
			Name:        "get_system_metrics",
			Description: "Obtiene el uso actual de CPU, memoria RAM y discos de almacenamiento.",
		},
		{
			Name:        "get_active_services",
			Description: "Obtiene la lista de servicios activos en el sistema operativo.",
		},
		{
			Name:        "get_top_processes",
			Description: "Obtiene los 10 procesos activos con mayor consumo de memoria RAM o CPU.",
		},
		{
			Name:        "get_open_ports",
			Description: "Lista los puertos de red locales actualmente en uso y sus procesos asociados.",
		},
		{
			Name:        "get_hardware_summary",
			Description: "Obtiene especificaciones técnicas generales del equipo (CPU, GPU, RAM total).",
		},
		{
			Name:        "get_approximate_location",
			Description: "Obtiene ubicación aproximada basada en la red pública (Ciudad, País).",
		},
		{
			Name:        "get_disk_usage_details",
			Description: "Retorna el estado de montaje de las particiones (C:, D:) y espacio libre/usado en GB/porcentaje.",
		},
		{
			Name:        "get_wsl_status",
			Description: "Muestra las distribuciones de WSL instaladas y su estado actual.",
		},
		{
			Name:        "get_installed_runtimes",
			Description: "Detecta versiones globales de herramientas en el PATH de Windows (python, go, node, git, docker).",
		},
	}
}


// GetSystemMetrics devuelve el estado de la CPU, RAM y almacenamiento
func GetSystemMetrics() (string, error) {
	// RAM
	v, err := mem.VirtualMemory()
	if err != nil {
		return "", err
	}
	ramStatus := fmt.Sprintf("RAM: Total: %v MB, Free: %v MB, UsedPercent: %.2f%%", v.Total/1024/1024, v.Free/1024/1024, v.UsedPercent)

	// CPU
	c, err := cpu.Percent(time.Second, false)
	cpuStatus := "CPU: Error fetching cpu"
	if err == nil && len(c) > 0 {
		cpuStatus = fmt.Sprintf("CPU: Uso total: %.2f%%", c[0])
	}

	// Almacenamiento (Root / C:)
	var d *disk.UsageStat
	if runtime.GOOS == "windows" {
		d, err = disk.Usage("C:")
	} else {
		d, err = disk.Usage("/")
	}
	diskStatus := "Storage: Error fetching disk"
	if err == nil {
		diskStatus = fmt.Sprintf("Storage (%v): Total: %v GB, Free: %v GB, UsedPercent: %.2f%%", d.Path, d.Total/1024/1024/1024, d.Free/1024/1024/1024, d.UsedPercent)
	}

	return fmt.Sprintf("%s\n%s\n%s", ramStatus, cpuStatus, diskStatus), nil
}

// GetActiveServices devuelve los servicios activos en Windows
func GetActiveServices() (string, error) {
	if runtime.GOOS != "windows" {
		return "Servicios activos solo soportados en Windows", nil
	}
	cmd := exec.Command("powershell", "-Command", "Get-Service | Where-Object {$_.Status -eq 'Running'} | Select-Object Name, DisplayName | ConvertTo-Json")
	out, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("error al obtener servicios: %v, salida: %s", err, string(out))
	}
	// Truncamos la salida para no sobrecargar el modelo
	outputStr := string(out)
	if len(outputStr) > 2000 {
		outputStr = outputStr[:2000] + "...(truncado)"
	}
	return outputStr, nil
}

// GetApproximateLocation devuelve la ubicación (Ciudad, Estado, País) mediante IP (Sin direcciones exactas)
func GetApproximateLocation() (string, error) {
	resp, err := http.Get("http://ip-api.com/json/")
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	var data map[string]interface{}
	if err := json.Unmarshal(body, &data); err != nil {
		return "", err
	}

	if data["status"] == "success" {
		return fmt.Sprintf("Ubicación aproximada: Ciudad: %v, Región: %v, País: %v", data["city"], data["regionName"], data["country"]), nil
	}
	return "No se pudo obtener la ubicación.", nil
}

// GetTopProcesses devuelve los 10 procesos que más memoria RAM consumen
func GetTopProcesses() (string, error) {
	if runtime.GOOS != "windows" {
		return "Obtención de procesos solo soportada en Windows", nil
	}
	cmd := exec.Command("powershell", "-Command", "Get-Process | Sort-Object WS -Descending | Select-Object -First 10 Name, WS | ConvertTo-Json")
	out, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("error al obtener procesos: %v, salida: %s", err, string(out))
	}
	// Truncar si es necesario (el JSON de 10 elementos debería ser pequeño, pero por seguridad)
	outputStr := string(out)
	if len(outputStr) > 2000 {
		outputStr = outputStr[:2000] + "...(truncado)"
	}
	return outputStr, nil
}

// GetHardwareSummary obtiene resumen de hardware
func GetHardwareSummary() (string, error) {
	if runtime.GOOS != "windows" {
		return "Hardware info solo soportada en Windows", nil
	}
	cmd := exec.Command("powershell", "-Command", "$cpu = Get-CimInstance Win32_Processor; $gpu = Get-CimInstance Win32_VideoController; @{CPU=$cpu.Name; GPU=$gpu.Name} | ConvertTo-Json")
	out, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("error al obtener hardware: %v, salida: %s", err, string(out))
	}
	return string(out), nil
}

// GetDiskUsageDetails obtiene detalles de discos
func GetDiskUsageDetails() (string, error) {
	parts, err := disk.Partitions(false)
	if err != nil {
		return "", err
	}
	var res string
	for _, p := range parts {
		u, err := disk.Usage(p.Mountpoint)
		if err != nil {
			continue
		}
		res += fmt.Sprintf("Disco %s: Total: %vGB, Libre: %vGB, Usado: %.2f%%\n", p.Mountpoint, u.Total/1024/1024/1024, u.Free/1024/1024/1024, u.UsedPercent)
	}
	return res, nil
}

// GetOpenPorts obtiene puertos de red locales escuchando
func GetOpenPorts() (string, error) {
	if runtime.GOOS != "windows" {
		return "GetOpenPorts solo soportado en Windows", nil
	}
	cmd := exec.Command("powershell", "-Command", "Get-NetTCPConnection -State Listen | Select-Object LocalAddress, LocalPort, OwningProcess | Select-Object -First 15 | ConvertTo-Json")
	out, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("error al obtener puertos: %v, salida: %s", err, string(out))
	}
	return string(out), nil
}

// GetWSLStatus obtiene distribuciones WSL
func GetWSLStatus() (string, error) {
	cmd := exec.Command("wsl", "-l", "-v")
	out, err := cmd.CombinedOutput()
	if err != nil {
		return "WSL no está instalado o falló la ejecución.", nil
	}
	return string(out), nil
}

// GetInstalledRuntimes detecta lenguajes y binarios instalados
func GetInstalledRuntimes() (string, error) {
	runtimes := map[string]string{
		"python": "python --version",
		"node":   "node -v",
		"go":     "go version",
		"git":    "git --version",
		"docker": "docker -v",
		"java":   "java -version",
	}

	var results []string
	for name, cmdStr := range runtimes {
		// Ejecutar por CMD
		cmd := exec.Command("cmd", "/C", cmdStr)
		out, err := cmd.CombinedOutput()
		if err != nil {
			results = append(results, fmt.Sprintf("%s: No instalado", name))
		} else {
			// Limpiar salto de linea
			version := string(out)
			if len(version) > 50 {
				version = version[:50] // Truncar si es muy largo
			}
			results = append(results, fmt.Sprintf("%s: %s", name, version))
		}
	}
	return fmt.Sprintf("Runtimes instalados:\n%s", results), nil
}

// GetInstalledRuntimesMap returns a map of runtime names to booleans indicating if they are installed
func GetInstalledRuntimesMap() map[string]bool {
	runtimes := map[string]string{
		"python": "python --version",
		"node":   "node -v",
		"go":     "go version",
		"git":    "git --version",
		"docker": "docker -v",
		"java":   "java -version",
	}

	results := make(map[string]bool)
	for name, cmdStr := range runtimes {
		cmd := exec.Command("cmd", "/C", cmdStr)
		err := cmd.Run()
		results[name] = err == nil
	}
	return results
}

