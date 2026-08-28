package tools

import (
	"fmt"
	"os/exec"
)

// GetDiskUsage obtiene la informacion de los discos locales usando PowerShell
func GetDiskUsage() (string, error) {
	cmd := exec.Command("powershell", "-NoProfile", "-Command", "Get-WmiObject Win32_LogicalDisk | Select-Object DeviceID, VolumeName, FileSystem, FreeSpace, Size | ConvertTo-Json")
	out, err := cmd.Output()
	if err != nil {
		return fmt.Sprintf("Error ejecutando comando de disco: %v", err), nil
	}
	return string(out), nil
}

// GetLargeApps obtiene la lista de apps que m�s espacio ocupan
func GetLargeApps() (string, error) {
	script := "Get-ItemProperty HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*, HKLM:\\Software\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* | Select-Object DisplayName, EstimatedSize | Where-Object { $_.EstimatedSize -gt 0 -and $_.DisplayName -ne $null } | Sort-Object EstimatedSize -Descending | Select-Object -First 20 | ConvertTo-Json"
	cmd := exec.Command("powershell", "-NoProfile", "-Command", script)
	out, err := cmd.Output()
	if err != nil {
		return fmt.Sprintf("Error ejecutando comando de apps: %v", err), nil
	}
	return string(out), nil
}
