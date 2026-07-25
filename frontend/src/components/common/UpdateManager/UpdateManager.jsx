import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import Modal from '../Modal/Modal';

const isTauri = typeof window !== 'undefined' && window.__TAURI_IPC__ !== undefined;

const UpdateManager = () => {
  const [modalState, setModalState] = useState({ isOpen: false, title: '', message: '', isError: false, isUpdate: false });
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [appVersion, setAppVersion] = useState('');

  useEffect(() => {
    if (isTauri) {
      import('@tauri-apps/api/app').then(app => app.getVersion().then(setAppVersion));
    }
  }, []);

  const checkForUpdates = async () => {
    if (!isTauri) return;
    setIsCheckingUpdate(true);
    try {
      const { checkUpdate } = await import('@tauri-apps/api/updater');
      const { shouldUpdate, manifest } = await checkUpdate();
      if (shouldUpdate) {
        setModalState({
          isOpen: true,
          title: 'Nueva Actualización Disponible',
          message: `La versión ${manifest?.version} está disponible. La aplicación se reiniciará después de instalarla.`,
          isError: false,
          isUpdate: true
        });
      } else {
        setModalState({
          isOpen: true,
          title: 'Sin actualizaciones',
          message: 'Orbit ya está actualizado a la versión más reciente.',
          isError: false,
          isUpdate: false
        });
      }
    } catch (error) {
      console.error("Error al buscar actualizaciones:", error);
      setModalState({
        isOpen: true,
        title: 'Error de Actualización',
        message: 'No se pudo verificar si hay actualizaciones en este momento.',
        isError: true,
        isUpdate: false
      });
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleInstallUpdate = async () => {
    setModalState({ ...modalState, isOpen: false });
    try {
      const { installUpdate } = await import('@tauri-apps/api/updater');
      const { relaunch } = await import('@tauri-apps/api/process');
      await installUpdate();
      await relaunch();
    } catch (error) {
      console.error("Error al instalar la actualización:", error);
    }
  };

  return (
    <>
      <div style={{ flex: 1, color: '#6E6E77', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span>{appVersion ? `Orbit Versión ${appVersion}` : 'Orbit'}</span>
        {isTauri && (
          <button 
            onClick={checkForUpdates} 
            disabled={isCheckingUpdate}
            style={{ background: 'none', border: '1px solid #2C2C35', color: '#A0A0AB', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem' }}
          >
            <RefreshCw size={14} style={{ animation: isCheckingUpdate ? 'spin 1s linear infinite' : 'none' }} />
            {isCheckingUpdate ? 'Buscando...' : 'Buscar actualizaciones'}
          </button>
        )}
      </div>

      <Modal 
        isOpen={modalState.isOpen} 
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        title={modalState.title}
        actions={
          <>
            {modalState.isUpdate && (
              <button 
                onClick={handleInstallUpdate}
                style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer', marginRight: '10px' }}
              >
                Instalar ahora
              </button>
            )}
            <button 
              onClick={() => setModalState({ ...modalState, isOpen: false })}
              style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', background: modalState.isError ? '#ef4444' : (modalState.isUpdate ? '#444' : '#3b82f6'), color: '#fff', cursor: 'pointer' }}
            >
              {modalState.isUpdate ? 'Más tarde' : 'Entendido'}
            </button>
          </>
        }
      >
        <p>{modalState.message}</p>
      </Modal>
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </>
  );
};

export default UpdateManager;
