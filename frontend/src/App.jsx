import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar/Sidebar';
import ChatPage from './pages/ChatPage/ChatPage';
import SettingsPage from './pages/SettingsPage/SettingsPage';
import PersonalityPage from './pages/PersonalityPage/PersonalityPage';
import PatchNotesPage from './pages/PatchNotesPage/PatchNotesPage';
import styles from './App.module.scss';
import useSettingsStore from './store/settingsStore';
import { useEffect, useState } from 'react';
import { convertFileSrc } from '@tauri-apps/api/tauri';
import HotkeyManager from './components/common/HotkeyManager/HotkeyManager';
import MediaPlayer from './components/common/MediaPlayer/MediaPlayer';

import DevConsole from './components/common/DevConsole/DevConsole';

// Detectar entorno Tauri
const isTauri = typeof window !== 'undefined' && window.__TAURI_IPC__ !== undefined;

const ProtectedRoutes = () => {
  const { googleApiKey } = useSettingsStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Si no hay API Key y no estamos en la página de ajustes
    if (!googleApiKey && location.pathname !== '/settings') {
      navigate('/settings');
    }
  }, [googleApiKey, location.pathname, navigate]);

  return (
    <Routes>
      <Route path="/" element={<ChatPage />} />
      <Route path="/personalities" element={<PersonalityPage />} />
      <Route path="/patch-notes" element={<PatchNotesPage />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  );
};

function App() {
  const { theme, bgPath, bgBlur, bgOpacity, loadBgSettingsFromBackend, loadIconSettingsFromBackend, loadApiConfigFromBackend, googleApiKey } = useSettingsStore();

  useEffect(() => {
    document.body.className = `theme-${theme}`;
  }, [theme]);

  // Cargar settings del backend al iniciar la app (Tauri)
  useEffect(() => {
    if (isTauri) {
      loadBgSettingsFromBackend();
      loadIconSettingsFromBackend();
      loadApiConfigFromBackend();
    }
  }, [loadBgSettingsFromBackend, loadIconSettingsFromBackend, loadApiConfigFromBackend]);

  const [showSplash, setShowSplash] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Iniciar desvanecimiento a los 9 segundos
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 9000);

    // Desmontar completamente a los 10 segundos
    const removeTimer = setTimeout(() => {
      setShowSplash(false);
    }, 10000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  // Construir la URL del fondo (data:image o local filesystem via Tauri)
  let backgroundUrl = 'none';
  if (bgPath) {
    backgroundUrl = `url(${isTauri && !bgPath.startsWith('data:') ? convertFileSrc(bgPath) : bgPath})`;
  }

  return (
    <Router>
      <HotkeyManager />
      <MediaPlayer />
      <DevConsole />
      {/* Capa base de fondo */}
      <div 
        className={styles.globalBackground}
        style={{
          backgroundImage: backgroundUrl,
          filter: `blur(${bgBlur}px)`,
          opacity: bgOpacity / 100
        }}
      />
      
      {showSplash && (
        <div className={`${styles.splashScreen} ${isFadingOut ? styles.fadeOut : ''}`}>
          <h1 className={styles.splashTitle}>Orbit</h1>
          <p className={styles.splashDisclaimer}>
            Disclaimer: Orbit is an independent open-source project and is not affiliated with, sponsored, or endorsed by Google LLC.
          </p>
        </div>
      )}
      
      <div className={styles.appLayout}>
        <Sidebar />
        <main className={styles.mainContent}>
          <ProtectedRoutes />
        </main>
      </div>
    </Router>
  );
}

export default App;
