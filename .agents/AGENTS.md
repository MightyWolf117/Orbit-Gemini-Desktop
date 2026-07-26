# Reglas del Proyecto Orbit-Desktop / Gemini-Desktop

## Gestión de Releases y Versiones
- **¡IMPORTANTE!** Cada vez que se genere una nueva versión de la aplicación (para GitHub Releases o distribución), se **debe cambiar obligatoriamente la numeración** en el archivo `frontend/src-tauri/tauri.conf.json` (además de `package.json` y `Cargo.toml`). 
- **Razón:** De lo contrario, la función de auto-update (actualización automática) de Tauri no funcionará, ya que el archivo `.msi` o instalador generado jamás subirá de versión y los clientes existentes no detectarán que hay una actualización disponible.
