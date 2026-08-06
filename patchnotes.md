# 🚀 Orbit Desktop - Notas del Parche (Versiones)

## 🌟 Versión 1.3.0 (Group Chats & Dev Console)

### 👥 1. Sistema de "Group Chat Rooms" (Salas Grupales)
- **Modal de Ajustes:** El ícono cerebral de la cabecera ahora permite abrir una configuración local para la sala, donde se inyecta un *Contexto y Reglas de Comportamiento*.
- **Interacciones Contínuas:** Se ha habilitado un selector para definir un "Límite de Auto-Respuestas" (hasta 10). Las personalidades pueden interactuar automáticamente entre ellas por múltiples turnos sin requerir un nuevo prompt manual.
- **Persistencia Robusta:** Se ha mejorado la serialización local (en Tauri/Rust) de los historiales, asegurando que los nombres de los bots, los ajustes del contexto y el contador de respuestas se guarden permanentemente al entrar y salir del chat.
- **Advertencias de Tokens:** Nueva alerta visual indicando que el uso de chats grupales continuos consume un alto nivel de recursos y tokens de la API.

### 🛠️ 2. Consola de Desarrollo Integrada
- **Panel Flotante y Minimizable:** En *Ajustes > Desarrollador* puedes habilitar "Mostrar Consola". Esto habilita un **botón flotante** tipo terminal en la esquina de la pantalla. Al hacer clic, se expande un panel completo que persiste mientras navegas por la app.
- **Logs Backend (SSE):** La consola escucha en tiempo real a `/api/logs/stream`, conectada directamente al motor interno de Go. Visualiza las peticiones de red (200 OK, 429, etc.) como si vieras la terminal cruda.
- **Logs Frontend (React):** Todos los registros de la consola de herramientas de Chrome (`console.log`, `warn`, `error`) también se capturan y organizan en una pestaña separada del panel, permitiendo depurar problemas visuales sin abrir las DevTools.

---

## 🌟 Versión 1.2.1
En la versión **1.2.1** de Orbit, hemos implementado una importante actualización arquitectónica en el sistema de reproducción multimedia y en el control de inteligencia de modelos de Google Gemini. Esta versión elimina por completo las interrupciones de audio en segundo plano, añade un elegante modo **Picture-in-Picture (PiP)**, incorpora búsqueda estructurada de vídeos y estrena un sistema proactivo de monitoreo de cuotas y alertas de uso de IA.

---

## 🎵 1. Reproductor Multimedia Mutante, PiP y Búsqueda Interactiva

### ✨ Persistencia Dinámica en el DOM (Cero Cortes de Audio/Vídeo)
- **El fin de los reinicios al minimizar:** Se reestructuró la arquitectura del reproductor en [MediaPlayerExpanded.jsx](file:///c:/Users/juanp/OneDrive/Escritorio/gemini-escritorio/Gemini-Desktop/frontend/src/components/common/MediaPlayer/MediaPlayerExpanded.jsx). El contenedor que alberga el vídeo (`<iframe />` de YouTube / Spotify) o el audio MP3 ahora es un nodo JSX mutante permanente en el árbol de React.
- Al minimizar el reproductor o navegar entre el chat y los ajustes, el componente **nunca se desmonta del DOM**. Sus clases CSS y dimensiones mutan dinámicamente, evitando que el motor del navegador recargue la URL. La música y los vídeos continúan reproduciéndose exactamente en el segundo donde estaban, sin saltos ni reinicios.

### 🔲 Ventana Flotante Picture-in-Picture (PiP) vs. Modo Solo Audio
- **Vídeo Flotante en 16:9:** Al reproducir un vídeo y minimizar la ventana principal, el reproductor se encoge suavemente en una ventana compacta flotante ubicada en la esquina inferior derecha del escritorio (`bottom: 80px, right: 20px`), manteniéndose visible sobre la interfaz.
- **Control Rápido de Vista (`🔲` / `🎵`):** Se añadió un botón de alternancia tanto en la barra de control flotante de Orbit como en la cabecera del vídeo PiP.
  - **Modo Solo Audio (`🎵`):** Si estás concentrado programando y no necesitas ver el vídeo, pulsa este botón. La ventana de vídeo se oculta silenciosamente en segundo plano sin pausar la reproducción, liberando espacio en tu pantalla.
  - **Volver a PiP (`🔲`):** Pulsa el icono en la barra flotante para que la ventana de vídeo vuelva a aparecer al instante.

### 🔍 Búsqueda Estructurada y Lista de Selección Rápida
- El buscador integrado en la cabecera del reproductor ahora consulta directamente el endpoint especializado del backend (`GET /api/media/search`).
- Al buscar una canción o artista, Orbit despliega una **lista seleccionable de hasta 10 resultados** con sus respectivas miniaturas (*thumbnails*), títulos y botones de reproducción directa. Esto elimina definitivamente los antiguos errores de *"vídeo no disponible"* causados por mandar texto plano al reproductor embebido.

### 🎮 Sincronización Total mediante YouTube Iframe API (`postMessage`)
- Todos los vídeos embebidos ahora se cargan con el parámetro nativo `&enablejsapi=1`.
- Al pulsar los botones de **Play / Pause** o al mover el deslizador de **Volumen** en la barra flotante de Orbit, el sistema envía mandatos remotos (`playVideo`, `pauseVideo`, `setVolume`) vía `postMessage` al iframe en segundo plano, logrando una sincronización perfecta e instantánea sin necesidad de abrir la ventana modal.

---

## 🤖 2. Sistema Inteligente de Modelos, Cuotas y Tiers de Gemini

### 📊 Conteo de Peticiones y Límites por Tier en Tiempo Real
- **Monitoreo Local en Disco:** Orbit ahora contabiliza de forma persistente cada petición exitosa (`200 OK`) por modelo individual, calculando tu consumo diario sin realizar llamadas extra que saturen la API de Google.
- **Selector de Capa / Tier en Ajustes:** Puedes configurar en los ajustes tu nivel de cuenta:
  - **Tier Gratuito (Free):** Ajusta automáticamente las advertencias para los límites estándar de Google (ej. 1,500 RPD en modelos Flash y 50 RPD en Pro).
  - **Plan con Facturación (Pay-As-You-Go):** Expande los topes de monitoreo para aprovechar los límites de hasta 4 millones de peticiones diarias.
- **Panel Visual de Cuotas:** Nueva sección interactiva en Ajustes con barras de progreso de consumo por modelo y opción de reinicio manual o automático diario.

### 🚨 Detección Proactiva de Límite Alcanzado (429) y Restricciones (403)
- **Alerta Explicita de Cuota Agotada (Error 429):** Si un modelo alcanza su tope estimado o la API devuelve un error `429 Too Many Requests`, la interfaz marca automáticamente el modelo como agotado por el día con un indicador visual rojo, informando al usuario y sugiriendo cambiar a un modelo alternativo disponible.
- **Identificación de Modelos de Pago (Error 403):** Si intentas utilizar un modelo exclusivo o de preview restringida sin facturación activa (`403 Forbidden`), Orbit lo clasifica automáticamente en la configuración con la etiqueta **"solo plan con facturación"**, evitando intentos fallidos en el futuro.

---

## 🛡️ 3. Mantenimiento, Estabilidad y Seguridad
- **Auditoría de Dependencias (`npm audit`):** Se auditaron las librerías del frontend y se actualizó la gestión de rutas en `react-router-dom` para prevenir vulnerabilidades de XSS y SSR, garantizando una base sólida para la aplicación de escritorio en Tauri.
- **Compilación Verificada:** Pruebas exhaustivas de compilación tanto en el motor backend de Go (`go build`) como en el empaquetado del frontend en Vite/Tauri (`npm run build`), asegurando un rendimiento óptimo y un peso ligero del bundle (`~335 kB` JS / `~27 kB` CSS).

---

## 📥 Instrucciones de Actualización (Tauri Auto-Updater)
Al instalar o distribuir esta versión, recuerda que el archivo [tauri.conf.json](file:///c:/Users/juanp/OneDrive/Escritorio/gemini-escritorio/Gemini-Desktop/frontend/src-tauri/tauri.conf.json), [package.json](file:///c:/Users/juanp/OneDrive/Escritorio/gemini-escritorio/Gemini-Desktop/frontend/package.json) y `Cargo.toml` ya se encuentran sincronizados en la versión **`1.2.1`**. Los usuarios con versiones anteriores (`1.2.0` o inferiores) recibirán la notificación de actualización automática de forma nativa en su cliente de escritorio Orbit.
