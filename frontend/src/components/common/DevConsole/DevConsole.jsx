import { useState, useEffect, useRef } from 'react';
import useSettingsStore from '../../../store/settingsStore';
import useLogStore from '../../../store/logStore';
import { X, Trash2, Terminal } from 'lucide-react';
import styles from './DevConsole.module.scss';
import { ENDPOINTS } from '../../../service/api';

const DevConsole = () => {
  const { enableDevConsole } = useSettingsStore();
  const { frontendLogs, backendLogs, addFrontendLog, addBackendLog, clearFrontendLogs, clearBackendLogs } = useLogStore();
  const [activeTab, setActiveTab] = useState('frontend');
  const [isExpanded, setIsExpanded] = useState(false);
  const logEndRef = useRef(null);

  // Interceptar console.log, console.warn, console.error
  useEffect(() => {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    console.log = (...args) => {
      addFrontendLog({ type: 'log', message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') });
      originalLog.apply(console, args);
    };
    console.warn = (...args) => {
      addFrontendLog({ type: 'warn', message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') });
      originalWarn.apply(console, args);
    };
    console.error = (...args) => {
      addFrontendLog({ type: 'error', message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') });
      originalError.apply(console, args);
    };

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, [addFrontendLog]);

  // SSE para logs del backend
  useEffect(() => {
    if (!enableDevConsole) return;
    
    // Asumimos que ENDPOINTS.CHAT es algo como http://127.0.0.1:8080/api/chat
    const baseUrl = ENDPOINTS.CHAT.replace('/api/chat', '');
    const source = new EventSource(`${baseUrl}/api/logs/stream`);
    
    source.onmessage = (event) => {
      addBackendLog(event.data);
    };
    source.onerror = (err) => {
      console.error("SSE Logs Error:", err);
      // No agregamos un log para evitar bucles si falla
    };

    return () => {
      source.close();
    };
  }, [enableDevConsole, addBackendLog]);

  // Auto-scroll al final
  useEffect(() => {
    if (logEndRef.current && isExpanded) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [frontendLogs, backendLogs, activeTab, isExpanded]);

  if (!enableDevConsole) return null;

  const logsToDisplay = activeTab === 'frontend' ? frontendLogs : backendLogs;

  if (!isExpanded) {
    return (
      <button 
        className={styles.floatingBtn}
        onClick={() => setIsExpanded(true)}
        title="Abrir Consola de Desarrollo"
      >
        <Terminal size={24} />
      </button>
    );
  }

  return (
    <div className={`${styles.consoleOverlay} ${isExpanded ? styles.open : ''}`}>
      <div className={styles.consoleContainer}>
        <div className={styles.consoleHeader}>
          <div className={styles.tabs}>
            <button 
              className={`${styles.tabBtn} ${activeTab === 'frontend' ? styles.active : ''}`}
              onClick={() => setActiveTab('frontend')}
            >
              Frontend
            </button>
            <button 
              className={`${styles.tabBtn} ${activeTab === 'backend' ? styles.active : ''}`}
              onClick={() => setActiveTab('backend')}
            >
              Backend
            </button>
          </div>
          
          <div className={styles.headerActions}>
            <button 
              className={styles.actionBtn}
              onClick={() => activeTab === 'frontend' ? clearFrontendLogs() : clearBackendLogs()}
              title="Limpiar logs"
            >
              <Trash2 size={16} />
            </button>
            <button 
              className={styles.closeBtn}
              onClick={() => setIsExpanded(false)}
              title="Minimizar"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        <div className={styles.consoleBody}>
          {logsToDisplay.length === 0 ? (
            <div className={styles.emptyState}>No hay logs disponibles</div>
          ) : (
            logsToDisplay.map((log) => (
              <div 
                key={log.id} 
                className={`${styles.logEntry} ${activeTab === 'frontend' ? styles[log.type] : styles.log}`}
              >
                {activeTab === 'frontend' ? log.message : log.text}
              </div>
            ))
          )}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
};

export default DevConsole;
