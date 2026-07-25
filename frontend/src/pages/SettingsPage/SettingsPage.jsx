import { useState, useEffect } from 'react';
import { Save, Image as ImageIcon, Upload, User, Bot, FolderOpen, AlertTriangle, ExternalLink, RefreshCw, HelpCircle } from 'lucide-react';
import useSettingsStore from '../../store/settingsStore';
import Modal from '../../components/common/Modal/Modal';
import styles from './SettingsPage.module.scss';
import { invoke } from '@tauri-apps/api/tauri';
import { convertFileSrc } from '@tauri-apps/api/tauri';
import { open } from '@tauri-apps/api/dialog';
import UpdateManager from '../../components/common/UpdateManager/UpdateManager';
import { ENDPOINTS } from '../../service/api';

const isTauri = typeof window !== 'undefined' && window.__TAURI_IPC__ !== undefined;

const SettingsPage = () => {
  const { 
    theme, aiModel, temperature, 
    bgBlur, bgOpacity, bgPath,
    userIconPath, userIconPosX, userIconPosY,
    aiIconPath, aiIconPosX, aiIconPosY,
    basePath, resolvedBasePath, enableWsl, googleApiKey, enableSystemIntegration,
    setTheme, setAiModel, setTemperature, setBgSettings, setIconSettings, setBasePath, setEnableWsl, setGoogleApiKey, setEnableSystemIntegration,
    saveBgSettingsToBackend, saveIconSettingsToBackend, savePathConfigToBackend, loadPathConfigFromBackend, saveWslConfigToBackend, loadWslConfigFromBackend, saveApiConfigToBackend, resetSettings,
    availableModels, fetchModels
  } = useSettingsStore();

  useEffect(() => {
    fetchModels();
    if (isTauri) {
      loadPathConfigFromBackend();
      loadWslConfigFromBackend();
    }
  }, [fetchModels, loadPathConfigFromBackend, loadWslConfigFromBackend]);

  const [modalState, setModalState] = useState({ isOpen: false, title: '', message: '', isError: false });
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [systemWarningModalOpen, setSystemWarningModalOpen] = useState(false);
  const [apiKeyHelpModalOpen, setApiKeyHelpModalOpen] = useState(false);
  const [wslStatus, setWslStatus] = useState(null);
  const [installedRuntimes, setInstalledRuntimes] = useState(null);

  const handleSystemIntegrationToggle = (checked) => {
    if (checked) {
      setSystemWarningModalOpen(true);
    } else {
      setEnableSystemIntegration(false);
    }
  };

  useEffect(() => {
    if (isTauri && enableWsl) {
      invoke('check_wsl_installed').then(res => {
        setWslStatus(res);
      }).catch(() => {
        setWslStatus({ installed: false, has_distro: false, default_distro: null });
      });
    } else {
      setWslStatus(null);
    }
  }, [enableWsl]);

  useEffect(() => {
    if (enableWsl) {
      fetch(ENDPOINTS.RUNTIMES)
        .then(res => res.json())
        .then(data => setInstalledRuntimes(data))
        .catch(err => console.error("Error fetching runtimes", err));
    } else {
      setInstalledRuntimes(null);
    }
  }, [enableWsl]);

  const handleSave = async () => {
    try {
      if (isTauri) {
        await saveBgSettingsToBackend();
        await saveIconSettingsToBackend();
        await savePathConfigToBackend();
        await saveWslConfigToBackend();
        await saveApiConfigToBackend();
      }
      setModalState({
        isOpen: true,
        title: 'Ajustes Guardados',
        message: 'Tus configuraciones han sido guardadas con éxito.',
        isError: false
      });
    } catch (e) {
      setModalState({
        isOpen: true,
        title: 'Error al Guardar',
        message: `Hubo un error al guardar los ajustes: ${e}`,
        isError: true
      });
    }
  };

  const handleSelectFolder = async () => {
    if (!isTauri) return;
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });
      if (selected) {
        setBasePath(selected);
      }
    } catch (e) {
      console.error("Error abriendo selector de carpeta:", e);
    }
  };

  const handleOpenFolder = async () => {
    if (!isTauri || !resolvedBasePath) return;
    try {
      await invoke('open_folder', { path: resolvedBasePath });
    } catch (e) {
      console.error("Error abriendo carpeta:", e);
    }
  };

  const handleFileUpload = async (e, type = 'bg') => {
    const file = e.target.files[0];
    if (!file) return;

    const isIcon = type !== 'bg';
    const MAX_SIZE = (isIcon ? 5 : 50) * 1024 * 1024; // 5MB iconos, 50MB fondo
    
    if (file.size > MAX_SIZE) {
      setModalState({
        isOpen: true,
        title: 'Archivo demasiado grande',
        message: `La imagen pesa más de ${isIcon ? '5MB' : '50MB'}. Por favor selecciona una más pequeña o ubícala manualmente.`,
        isError: true
      });
      return;
    }

    if (!isTauri) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (type === 'bg') setBgSettings({ bgPath: ev.target.result });
        else if (type === 'user') setIconSettings({ userIconPath: ev.target.result });
        else if (type === 'ai') setIconSettings({ aiIconPath: ev.target.result });
      };
      reader.readAsDataURL(file);
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);
      const ext = file.name.split('.').pop();
      
      if (type === 'bg') {
        const savedPath = await invoke('save_background_image', {
          imageBytes: Array.from(uint8Array),
          extension: ext
        });
        setBgSettings({ bgPath: savedPath });
      } else {
        const savedPath = await invoke('save_icon_image', {
          imageBytes: Array.from(uint8Array),
          extension: ext,
          iconType: type
        });
        if (type === 'user') setIconSettings({ userIconPath: savedPath });
        else if (type === 'ai') setIconSettings({ aiIconPath: savedPath });
      }
      
    } catch (err) {
      setModalState({
        isOpen: true,
        title: 'Error al subir imagen',
        message: `No se pudo guardar la imagen: ${err}`,
        isError: true
      });
    }
  };

  const renderIconPreview = (path, posX, posY, defaultIcon) => {
    if (path) {
      const imgUrl = isTauri && !path.startsWith('data:') ? convertFileSrc(path) : path;
      return <div className={styles.iconPreviewImg} style={{ 
        backgroundImage: `url(${imgUrl})`,
        backgroundPosition: `${posX}% ${posY}%`
      }} />;
    }
    return <div className={styles.iconPreviewPlaceholder}>{defaultIcon}</div>;
  };

  return (
    <div className={styles.settingsContainer}>
      <header className={styles.header}>
        <h1 className={styles.title}>Ajustes del Agente</h1>
        <p className={styles.subtitle}>Configura el comportamiento y la apariencia de la interfaz.</p>
      </header>

      <div className={styles.content}>
        
        {/* API Key */}
        <section className={styles.section} style={{ borderColor: !googleApiKey ? '#ef4444' : '#333' }}>
          <h2 className={styles.sectionTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            API Key de Google (Gemini)
            <HelpCircle 
              size={18} 
              style={{ cursor: 'pointer', color: '#3b82f6' }} 
              onClick={() => setApiKeyHelpModalOpen(true)}
              title="¿Cómo obtener mi API Key?"
            />
          </h2>
          <div className={styles.formGroup}>
            <label className={styles.label}>Ingresa tu API Key para poder chatear con la IA:</label>
            <input 
              type="password" 
              className={styles.input} 
              value={googleApiKey || ''} 
              onChange={(e) => setGoogleApiKey(e.target.value)}
              placeholder="AIzaSy..."
            />
            {!googleApiKey && <div className={styles.helpText} style={{ color: '#ef4444' }}>⚠️ API Key requerida para chatear.</div>}
            {googleApiKey && <div className={styles.helpText} style={{ color: '#10b981' }}>✓ API Key configurada.</div>}
          </div>
        </section>

        {/* Sección de Avatares */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <User size={18} style={{marginRight: '8px', verticalAlign: 'middle'}}/>
            Personalización de Avatares (Máx 5MB)
          </h2>
          
          <div className={styles.iconSettingsGrid}>
            <div className={styles.iconSettingsColumn}>
              <h3 className={styles.label}>Avatar del Usuario</h3>
              <div className={styles.iconPreviewContainer}>
                {renderIconPreview(userIconPath, userIconPosX, userIconPosY, <User size={40} />)}
              </div>
              <div className={styles.uploadArea} style={{ padding: '0.5rem', marginBottom: '1rem' }}>
                <Upload size={16} /> <span>Subir</span>
                <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'user')} className={styles.fileInput} />
              </div>
              {userIconPath && (
                <>
                  <div className={styles.formGroup}>
                    <label className={styles.helpText}>Posición X ({userIconPosX}%)</label>
                    <input type="range" className={styles.range} min="0" max="100" value={userIconPosX} onChange={(e) => setIconSettings({ userIconPosX: parseInt(e.target.value) })} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.helpText}>Posición Y ({userIconPosY}%)</label>
                    <input type="range" className={styles.range} min="0" max="100" value={userIconPosY} onChange={(e) => setIconSettings({ userIconPosY: parseInt(e.target.value) })} />
                  </div>
                </>
              )}
            </div>

            <div className={styles.iconSettingsColumn}>
              <h3 className={styles.label}>Avatar de la IA</h3>
              <div className={styles.iconPreviewContainer}>
                {renderIconPreview(aiIconPath, aiIconPosX, aiIconPosY, <Bot size={40} />)}
              </div>
              <div className={styles.uploadArea} style={{ padding: '0.5rem', marginBottom: '1rem' }}>
                <Upload size={16} /> <span>Subir</span>
                <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'ai')} className={styles.fileInput} />
              </div>
              {aiIconPath && (
                <>
                  <div className={styles.formGroup}>
                    <label className={styles.helpText}>Posición X ({aiIconPosX}%)</label>
                    <input type="range" className={styles.range} min="0" max="100" value={aiIconPosX} onChange={(e) => setIconSettings({ aiIconPosX: parseInt(e.target.value) })} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.helpText}>Posición Y ({aiIconPosY}%)</label>
                    <input type="range" className={styles.range} min="0" max="100" value={aiIconPosY} onChange={(e) => setIconSettings({ aiIconPosY: parseInt(e.target.value) })} />
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Sección de Fondo de Pantalla */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <ImageIcon size={18} style={{marginRight: '8px', verticalAlign: 'middle'}}/>
            Fondo de Pantalla
          </h2>
          
          <div className={styles.bgPreviewContainer}>
            <div className={styles.bgPreview} style={{
              backgroundImage: bgPath ? `url(${isTauri && !bgPath.startsWith('data:') ? convertFileSrc(bgPath) : bgPath})` : 'none',
              filter: `blur(${bgBlur}px)`,
              opacity: bgOpacity / 100
            }}></div>
            <div className={styles.bgOverlayText}>Vista Previa</div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Subir nueva imagen (Máx. 50MB)</label>
            <div className={styles.uploadArea}>
              <Upload size={20} />
              <span>Seleccionar archivo</span>
              <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'bg')} className={styles.fileInput} />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Difuminado (Blur: {bgBlur}px)</label>
            <input 
              type="range" className={styles.range} min="0" max="50" step="1" 
              value={bgBlur} onChange={(e) => setBgSettings({ bgBlur: parseInt(e.target.value) })}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Opacidad ({bgOpacity}%)</label>
            <input 
              type="range" className={styles.range} min="10" max="100" step="1" 
              value={bgOpacity} onChange={(e) => setBgSettings({ bgOpacity: parseInt(e.target.value) })}
            />
          </div>
        </section>

        {/* Sección Apariencia original */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Apariencia General</h2>
          <div className={styles.formGroup}>
            <label className={styles.label}>Tema de la interfaz</label>
            <select className={styles.select} value={theme} onChange={(e) => setTheme(e.target.value)}>
              <option value="dark">Oscuro (Moderno)</option>
              <option value="light">Claro</option>
            </select>
          </div>
        </section>

        {/* Sección IA */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Configuración de IA</h2>
          <div className={styles.formGroup}>
            <label className={styles.label}>Modelo preferido</label>
            <select className={styles.select} value={aiModel} onChange={(e) => setAiModel(e.target.value)}>
              {availableModels.length > 0 ? (
                availableModels.map(m => (
                  <option key={m.id} value={m.id}>{m.displayName} ({m.status})</option>
                ))
              ) : (
                <>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash (Rápido)</option>
                </>
              )}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Temperatura ({temperature})</label>
            <input type="range" className={styles.range} min="0" max="1" step="0.1" value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))} />
          </div>
        </section>

        {/* Sección de Opciones de Desarrollador */}
        {isTauri && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <FolderOpen size={18} style={{marginRight: '8px', verticalAlign: 'middle'}}/>
              Opciones de Desarrollador (Rutas de Datos)
            </h2>
            <div className={styles.formGroup}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <label className={styles.label} style={{ marginBottom: 0, marginRight: '8px' }}>Ruta Base de Datos Locales</label>
                <AlertTriangle 
                  size={16} 
                  color="#ffcc00" 
                  style={{ cursor: 'pointer' }}
                  onClick={() => setWarningModalOpen(true)}
                  title="Precaución al cambiar la ruta"
                />
              </div>
              
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <p className={styles.helpText} style={{ flex: 1, margin: 0, padding: '10px 14px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#eee', fontSize: '0.95rem', wordBreak: 'break-all', lineHeight: '1.4' }}>
                  <strong>Ruta en uso:</strong> <br/>
                  {resolvedBasePath || 'Cargando ruta por defecto...'}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button 
                    type="button" 
                    style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer', fontWeight: '500', whiteSpace: 'nowrap' }} 
                    onClick={handleSelectFolder}
                  >
                    Cambiar Ruta
                  </button>
                  <button 
                    type="button" 
                    style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #555', background: 'rgba(255, 255, 255, 0.05)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500', whiteSpace: 'nowrap' }} 
                    onClick={handleOpenFolder} 
                    title="Abrir carpeta en el explorador"
                  >
                    <FolderOpen size={16} /> Ir a carpeta
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.formGroup} style={{ marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <label className={styles.label} style={{ marginBottom: '4px' }}>Ejecución de Código con WSL</label>
                  <p className={styles.helpText} style={{ margin: 0 }}>Permite que el agente ejecute scripts de Python, Bash o JS (Node) en un entorno aislado de Windows Subsystem for Linux.</p>
                  
                  {enableWsl && wslStatus && (
                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {wslStatus.installed ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 8px', borderRadius: '4px', fontSize: '13px' }}>
                          <span>🐧</span> WSL Instalado
                        </div>
                      ) : (
                        <div 
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '4px 8px', borderRadius: '4px', fontSize: '13px', cursor: 'help' }}
                          title="Para instalar WSL:&#10;1. Abre PowerShell como Administrador.&#10;2. Ejecuta 'wsl --install'.&#10;3. Reinicia tu computadora.&#10;O instálalo desde la Microsoft Store."
                        >
                          <span>🐧</span> WSL No Instalado
                        </div>
                      )}

                      {wslStatus.installed && wslStatus.has_distro ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)', padding: '4px 8px', borderRadius: '4px', fontSize: '13px' }}>
                          <span>📦</span> Distro: {wslStatus.default_distro || 'Desconocida'}
                        </div>
                      ) : wslStatus.installed && !wslStatus.has_distro ? (
                        <div 
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '4px 8px', borderRadius: '4px', fontSize: '13px', cursor: 'help' }}
                          title="WSL está instalado, pero no hay distribuciones.&#10;Abre PowerShell y ejecuta:&#10;'wsl --install -d Ubuntu'&#10;O instala una desde la Microsoft Store."
                        >
                          <span>⚠️</span> Sin Distribuciones
                        </div>
                      ) : null}
                    </div>
                  )}
                  {enableWsl && wslStatus === null && (
                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', color: '#aaa', fontSize: '13px' }}>
                      Comprobando WSL...
                    </div>
                  )}

                  {/* Panel de Lenguajes Instalados */}
                  {enableWsl && installedRuntimes && (
                    <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#ddd' }}>Runtimes y Lenguajes Detectados en el Sistema</h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {Object.entries(installedRuntimes).map(([name, isInstalled]) => (
                          <div key={name} style={{
                            display: 'flex', alignItems: 'center', gap: '6px', 
                            padding: '4px 10px', borderRadius: '20px', fontSize: '12px',
                            background: isInstalled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: isInstalled ? '#10b981' : '#ef4444',
                            border: `1px solid ${isInstalled ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                          }}>
                            <span>{name.toUpperCase()}</span>
                            <span>{isInstalled ? '✓' : '✗'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', alignSelf: 'flex-start', marginTop: '6px' }}>
                  <input 
                    type="checkbox" 
                    checked={enableWsl} 
                    onChange={(e) => setEnableWsl(e.target.checked)} 
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                  <span style={{ marginLeft: '8px', color: '#eee', fontWeight: '500' }}>Habilitar WSL</span>
                </label>
              </div>
            </div>

            <div className={styles.formGroup} style={{ marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <label className={styles.label} style={{ marginBottom: '4px' }}>Integración con el Sistema (Herramientas IA)</label>
                  <p className={styles.helpText} style={{ margin: 0, maxWidth: '80%' }}>
                    Permite que el agente de IA lea métricas del sistema (CPU, RAM, Servicios, Ubicación aproximada) mediante Function Calling. 
                    No se permite ejecución de código destructivo.
                  </p>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', alignSelf: 'flex-start', marginTop: '6px' }}>
                  <input 
                    type="checkbox" 
                    checked={enableSystemIntegration} 
                    onChange={(e) => handleSystemIntegrationToggle(e.target.checked)} 
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                  <span style={{ marginLeft: '8px', color: '#eee', fontWeight: '500' }}>Habilitar Integración</span>
                </label>
              </div>
            </div>
          </section>
        )}

        {/* Sección de Atajos de Teclado */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Atajos de Teclado (Hotkeys)</h2>
          <div className={styles.formGroup} style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', color: '#eee', fontSize: '14px' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <td style={{ padding: '8px 0', fontWeight: '500' }}>Nuevo Chat</td>
                  <td style={{ padding: '8px 0', textAlign: 'right' }}><kbd style={{ background: '#333', padding: '2px 6px', borderRadius: '4px', border: '1px solid #555' }}>Ctrl</kbd> + <kbd style={{ background: '#333', padding: '2px 6px', borderRadius: '4px', border: '1px solid #555' }}>N</kbd></td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <td style={{ padding: '8px 0', fontWeight: '500' }}>Volver al Chat (Home)</td>
                  <td style={{ padding: '8px 0', textAlign: 'right' }}><kbd style={{ background: '#333', padding: '2px 6px', borderRadius: '4px', border: '1px solid #555' }}>Ctrl</kbd> + <kbd style={{ background: '#333', padding: '2px 6px', borderRadius: '4px', border: '1px solid #555' }}>H</kbd></td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <td style={{ padding: '8px 0', fontWeight: '500' }}>Abrir Personalidades</td>
                  <td style={{ padding: '8px 0', textAlign: 'right' }}><kbd style={{ background: '#333', padding: '2px 6px', borderRadius: '4px', border: '1px solid #555' }}>Ctrl</kbd> + <kbd style={{ background: '#333', padding: '2px 6px', borderRadius: '4px', border: '1px solid #555' }}>P</kbd></td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 0', fontWeight: '500' }}>Abrir Ajustes</td>
                  <td style={{ padding: '8px 0', textAlign: 'right' }}><kbd style={{ background: '#333', padding: '2px 6px', borderRadius: '4px', border: '1px solid #555' }}>Ctrl</kbd> + <kbd style={{ background: '#333', padding: '2px 6px', borderRadius: '4px', border: '1px solid #555' }}>,</kbd></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

      </div>

      <footer className={styles.footer}>
        <UpdateManager />
        <button className={styles.resetBtn} onClick={resetSettings}>Restablecer Valores</button>
        <button className={styles.saveBtn} onClick={handleSave}>
          <Save size={18} />
          Guardar Cambios
        </button>
      </footer>

      {/* Reemplazo del Alert por el Modal */}
      <Modal 
        isOpen={modalState.isOpen} 
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        title={modalState.title}
        actions={
          <button 
            className={`${styles.modalBtn} ${modalState.isError ? styles.modalBtnError : styles.modalBtnPrimary}`}
            onClick={() => setModalState({ ...modalState, isOpen: false })}
          >
            Entendido
          </button>
        }
      >
        <p>{modalState.message}</p>
      </Modal>

      {/* Modal de Advertencia de Rutas */}
      <Modal 
        isOpen={warningModalOpen} 
        onClose={() => setWarningModalOpen(false)}
        title="Advertencia de Migración"
        actions={
          <button 
            className={`${styles.modalBtn} ${styles.modalBtnPrimary}`}
            onClick={() => setWarningModalOpen(false)}
          >
            Entendido
          </button>
        }
      >
        <p>Si cambias la ruta base, los archivos existentes en la ruta anterior (historial, avatares, fondos) <strong>NO se moverán automáticamente</strong>.</p>
        <p style={{ marginTop: '10px' }}>El sistema empezará a guardar y buscar los datos en la nueva ruta. Deberás configurar nuevamente los ajustes o mover la información manualmente desde tu carpeta anterior.</p>
      </Modal>

      {/* Modal de Advertencia de Integración del Sistema */}
      <Modal 
        isOpen={systemWarningModalOpen} 
        onClose={() => setSystemWarningModalOpen(false)}
        title="Advertencia de Seguridad y Privacidad"
        actions={
          <>
            <button 
              className={`${styles.modalBtn}`}
              style={{ background: 'transparent', border: '1px solid #555', color: '#fff', marginRight: '10px' }}
              onClick={() => {
                setEnableSystemIntegration(false);
                setSystemWarningModalOpen(false);
              }}
            >
              Cancelar
            </button>
            <button 
              className={`${styles.modalBtn} ${styles.modalBtnPrimary}`}
              style={{ background: '#ef4444', border: 'none' }}
              onClick={() => {
                setEnableSystemIntegration(true);
                setSystemWarningModalOpen(false);
              }}
            >
              Aceptar Riesgos
            </button>
          </>
        }
      >
        <p>Al habilitar esta función, permites que los modelos de IA accedan a información local de tu computadora para responder preguntas, lo cual incluye:</p>
        <ul style={{ marginTop: '10px', marginLeft: '20px', color: '#ccc', fontSize: '0.9rem' }}>
          <li>Métricas de hardware (Uso de CPU, memoria RAM, almacenamiento).</li>
          <li>Estado de los servicios activos de Windows.</li>
          <li>Información de red y ubicación aproximada (Ciudad/Localidad basada en IP, sin direcciones exactas ni datos de GPS).</li>
        </ul>
        <p style={{ marginTop: '10px', color: '#ffcc00' }}><strong>Nota Importante:</strong> Aunque nuestra aplicación está diseñada para ser de solo lectura y no extraer contraseñas, la información recopilada será enviada temporalmente al modelo de Google (Gemini) para procesar tus respuestas. Asumes los riesgos relacionados con la ejecución de estas herramientas de IA.</p>
      </Modal>

      {/* Modal de Ayuda para API Key */}
      <Modal
        isOpen={apiKeyHelpModalOpen}
        onClose={() => setApiKeyHelpModalOpen(false)}
        title="¿Cómo obtener tu API Key de Google?"
        width="500px"
      >
        <div style={{ color: '#d1d5db', lineHeight: '1.6' }}>
          <p style={{ marginBottom: '16px' }}>
            Para usar esta aplicación, necesitas una clave de API gratuita de Google (Gemini). Sigue estos pasos:
          </p>
          <ol style={{ marginLeft: '20px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li>Ve a la página de <strong>Google AI Studio</strong>: <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: '#3b82f6', textDecoration: 'none' }}>aistudio.google.com</a></li>
            <li>Inicia sesión con tu cuenta de Google.</li>
            <li>En el menú lateral izquierdo, haz clic en <strong>Get API key</strong>.</li>
            <li>Haz clic en el botón azul <strong>Create API key</strong>.</li>
            <li>Selecciona un proyecto existente o haz clic en "Create API key in new project".</li>
            <li>Copia la clave generada (suele empezar por <code>AIzaSy...</code>).</li>
            <li>Vuelve a esta aplicación y pega la clave en el recuadro correspondiente.</li>
          </ol>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button 
              onClick={() => setApiKeyHelpModalOpen(false)}
              style={{
                background: '#3b82f6', color: 'white', padding: '8px 16px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: '500'
              }}
            >
              ¡Entendido!
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SettingsPage;
