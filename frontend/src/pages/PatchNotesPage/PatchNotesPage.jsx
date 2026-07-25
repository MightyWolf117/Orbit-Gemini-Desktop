import { FileText, Bug, Zap, CheckCircle } from 'lucide-react';
import styles from './PatchNotesPage.module.scss';

const PatchNotesPage = () => {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Notas del Parche</h1>
        <p className={styles.subtitle}>Versión actual: 1.1.0</p>
      </header>

      <div className={styles.content}>
        <section className={styles.patchSection}>
          <h2 className={styles.versionTitle}>
            Versión 1.1.0 - Actualización de Inteligencia y Sistema
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
