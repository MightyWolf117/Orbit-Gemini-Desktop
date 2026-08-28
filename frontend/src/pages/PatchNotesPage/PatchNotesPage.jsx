import { FileText, Bug, Zap, CheckCircle } from 'lucide-react';
import styles from './PatchNotesPage.module.scss';

const PatchNotesPage = () => {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Notas del Parche</h1>
        <p className={styles.subtitle}>Versión actual: 1.4.0</p>
      </header>

      <div className={styles.content}>
        <section className={styles.patchSection}>
          <h2 className={styles.versionTitle}>
            Versión 1.4.0 - Orbit (Hub Multi-Agente)
          </h2>
          <span className={styles.date}>27 de Agosto, 2026</span>
          
          <div className={styles.category}>
            <h3 className={styles.categoryTitle} style={{ color: '#10b981' }}>
              <Zap size={18} /> Renombre a Orbit y Multi-Proveedor
            </h3>
            <ul className={styles.list}>
              <li><strong>Evolución de Identidad:</strong> "Gemini Desktop" es ahora <strong>Orbit</strong>, un hub integral para agentes de inteligencia artificial independiente de Google.</li>
              <li><strong>Integración Multi-Modelo:</strong> Se integró soporte para guardar claves de OpenAI y Anthropic directamente desde la interfaz, volviendo al sistema agnóstico de proveedores.</li>
              <li><strong>Organización y Proyectos:</strong> Ahora puedes agrupar tus historiales de chat por proyectos/carpetas desde la barra lateral.</li>
              <li><strong>Interacciones de Voz Nativas:</strong> Se habilitó reconocimiento de voz (Speech-to-Text) y sintetizador (Text-to-Speech) nativos del sistema.</li>
              <li><strong>Renderizado de Imágenes:</strong> Soporte nativo para renderizar imágenes generadas o devueltas por los agentes en formato URL/media directamente en el chat.</li>
            </ul>
          </div>
        </section>
<section className={styles.patchSection}>
          <h2 className={styles.versionTitle}>
            Versión 1.2.1 - Sistema Inteligente de Modelos, Cuotas y Tiers
          </h2>
          <span className={styles.date}>26 de Julio, 2026</span>
          
          <div className={styles.category}>
            <h3 className={styles.categoryTitle} style={{ color: '#3b82f6' }}>
              <Zap size={18} /> Control de Cuotas y Alertas Inteligentes (Google Gemini)
            </h3>
            <ul className={styles.list}>
              <li><strong>Conteo Inteligente en Tiempo Real:</strong> Orbit ahora registra automáticamente en disco cada petición exitosa (200 OK) por modelo para calcular tus límites diarios sin saturar tu API.</li>
              <li><strong>Selector de Capa / Tier en Ajustes:</strong> Puedes indicar si utilizas el Tier Gratuito (1,500 RPD en modelos Flash / 50 RPD en Pro) o el Plan con Facturación (Pay-As-You-Go con 4M RPD).</li>
              <li><strong>Panel Inteligente de Cuotas:</strong> Nueva sección en Ajustes con barras de progreso visuales, monitoreo de cuotas por modelo y botón de reinicio manual del día.</li>
              <li><strong>Detección de Error 429 y 403:</strong> Si un modelo alcanza su tope de cuota diario o devuelve error 429, el sistema activa una alerta visual roja para avisarte explícitamente y sugiere cambiar de modelo. Si es un modelo pago (403), lo identifica automáticamente con la etiqueta <em>&quot;solo plan con facturación&quot;</em>.</li>
            </ul>
          </div>
        </section>

        <section className={styles.patchSection}>
          <h2 className={styles.versionTitle}>
            Versión 1.2.0 - Expansión de Conocimiento en Tiempo Real y Reproductor Multimedia
          </h2>
          <span className={styles.date}>25 de Julio, 2026</span>
          
          <div className={styles.category}>
            <h3 className={styles.categoryTitle} style={{ color: '#10b981' }}>
              <Zap size={18} /> 12 Nuevas Herramientas e Inteligencia Externa (Sin Auth)
            </h3>
            <ul className={styles.list}>
              <li><strong>Motor de Búsqueda Web (DuckDuckGo):</strong> Orbit ahora puede realizar búsquedas en internet en tiempo real sin requerir API Keys de pago para obtener noticias o documentación actual.</li>
              <li><strong>Lectura de Páginas Web (Jina AI Reader):</strong> Puedes pegarle cualquier enlace de un artículo o blog a Gemini para que lo lea completo en formato Markdown y te haga resúmenes o análisis técnicos.</li>
              <li><strong>Desarrollo y Repositorios (GitHub):</strong> Capacidad para consultar los últimos problemas (*issues*) abiertos y repositorios recientes de usuarios y proyectos públicos en GitHub.</li>
              <li><strong>Clima para Devs (wttr.in):</strong> Consulta instantánea del clima de tu ciudad desde consola sin clientes pesados ni registro.</li>
              <li><strong>Economía y Divisas:</strong> Consulta de tasas de cambio y conversión internacional en tiempo real con datos de Forex públicos.</li>
              <li><strong>Cultura, Ciencia y Entretenimiento:</strong> Integración de búsqueda enciclopédica en Wikipedia, catálogo mundial de libros (Open Library), base de datos de Anime/Manga (Jikan / MyAnimeList) y la foto espacial del día de la NASA (APOD).</li>
            </ul>
          </div>

          <div className={styles.category}>
            <h3 className={styles.categoryTitle} style={{ color: '#8b5cf6' }}>
              <CheckCircle size={18} /> Reproductor Multimedia y de Música de Fondo
            </h3>
            <ul className={styles.list}>
              <li><strong>Barra Multimedia Flotante y Expandible:</strong> Nuevo reproductor integrado (`MediaDock`) que te permite escuchar música de fondo desde YouTube, Spotify o archivos MP3 de tu PC sin interrumpir tu trabajo al navegar por la app.</li>
              <li><strong>Tarjetas Interactivas de Video en Chat:</strong> Cuando le pidas a la IA que te recomiende un tutorial o una canción, imprimirá una tarjeta con el botón <em>"▶ Reproducir en Orbit"</em> para iniciar el video en segundo plano al instante.</li>
              <li><strong>Arquitectura Limpia y Modular:</strong> Refactorización del backend con un paquete especializado (<code>internal/tools</code>) que separa limpiamente las herramientas externas de los servicios del sistema, evitando archivos monolíticos.</li>
            </ul>
          </div>
        </section>

        <section className={styles.patchSection}>
          <h2 className={styles.versionTitle}>
            Versión 1.1.1 - Actualización de Inteligencia y Sistema
          </h2>
          <span className={styles.date}>24 de Julio, 2026</span>
          
          <div className={styles.category}>
            <h3 className={styles.categoryTitle} style={{ color: '#10b981' }}>
              <Zap size={18} /> Nuevas Características y Mejoras
            </h3>
            <ul className={styles.list}>
              <li><strong>Integración Profunda con el Sistema (WSL y Windows):</strong> La IA ahora puede consultar métricas avanzadas de tu hardware (CPU, GPU, RAM), estado de tus discos duros y puertos de red activos.</li>
              <li><strong>Detección de Lenguajes (Runtimes):</strong> Nuevo panel visual en la página de <em>Ajustes</em> que indica en tiempo real si tienes instalados lenguajes como Python, Node, Go, Java, Git, o Docker.</li>
              <li><strong>Alertas de Código en el Chat:</strong> Si la IA genera un bloque de código para un lenguaje que no tienes instalado, aparecerá una alerta visual (⚠️ Idioma no instalado) junto a los botones de ejecución para evitar errores en WSL.</li>
              <li><strong>Modal de Ayuda para API Key:</strong> Nuevo botón de ayuda en los ajustes con instrucciones detalladas paso a paso sobre cómo obtener una clave de Google AI Studio.</li>
            </ul>
          </div>

          <div className={styles.category}>
            <h3 className={styles.categoryTitle} style={{ color: '#3b82f6' }}>
              <CheckCircle size={18} /> Ajustes Generales
            </h3>
            <ul className={styles.list}>
              <li>Actualización del SDK de Google Gemini (<code>google.golang.org/genai</code>) para resolver problemas de compatibilidad (<em>thought_signature</em>) con modelos recientes como Gemini 1.5 y 2.0.</li>
              <li>Mejora en las políticas de seguridad: la extracción de hardware omite datos sensibles y las opciones avanzadas deben ser aprobadas manualmente por el usuario aceptando los riesgos.</li>
            </ul>
          </div>

          <div className={styles.category}>
            <h3 className={styles.categoryTitle} style={{ color: '#ef4444' }}>
              <Bug size={18} /> Corrección de Errores
            </h3>
            <ul className={styles.list}>
              <li>Se corrigió un error que causaba que la IA alucinara o inventara especificaciones de hardware erróneas al intentar leer el sistema (por ej., mostrando un procesador i7 o un disco HDD que no correspondía).</li>
              <li>Solucionado el fallo de compatibilidad de respuestas de <code>FunctionCalling</code> al backend, permitiendo de nuevo una comunicación bidireccional estable.</li>
              <li>Las métricas de hardware ahora muestran con exactitud la familia real del procesador y el almacenamiento.</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
};

export default PatchNotesPage;

