import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/tauri';

// Detectamos si estamos en Tauri
const isTauri = typeof window !== 'undefined' && window.__TAURI_IPC__ !== undefined;

const useSettingsStore = create(
  persist(
    (set, get) => ({
      theme: 'dark', 
      aiModel: 'gemini-pro',
      temperature: 0.7,
      
      // Ajustes de rutas (Desarrollador)
      basePath: null,
      resolvedBasePath: null,
      enableWsl: false,
      
      // Ajustes de fondo
      bgPath: null, // path local en Tauri
      bgBlur: 10,
      bgOpacity: 50,

      // Ajustes de API
      googleApiKey: null,
      enableSystemIntegration: false,

      // Ajustes de Iconos
      userIconPath: null,
      userIconPosX: 50,
      userIconPosY: 50,
      aiIconPath: null,
      aiIconPosX: 50,
      aiIconPosY: 50,
      
      setTheme: (theme) => set({ theme }),
      setAiModel: (model) => set({ aiModel: model }),
      setTemperature: (temp) => set({ temperature: temp }),
      setBasePath: (path) => set({ basePath: path }),
      setResolvedBasePath: (path) => set({ resolvedBasePath: path }),
      setEnableWsl: (enabled) => set({ enableWsl: enabled }),
      setGoogleApiKey: (key) => set({ googleApiKey: key }),
      setEnableSystemIntegration: (enabled) => set({ enableSystemIntegration: enabled }),
      
      setBgSettings: (settings) => set((state) => ({ ...state, ...settings })),
      setIconSettings: (settings) => set((state) => ({ ...state, ...settings })),
      
      // Acciones de Backend Tauri (Fondos)
      saveBgSettingsToBackend: async () => {
        if (!isTauri) return;
        const { bgPath, bgBlur, bgOpacity } = get();
        try {
          await invoke('save_bg_config', {
            config: {
              path: bgPath,
              blur: bgBlur,
              opacity: bgOpacity
            }
          });
        } catch (e) {
          console.error("Error al guardar bg config:", e);
          throw e; // para que la UI lo cachee
        }
      },
      
      loadBgSettingsFromBackend: async () => {
        if (!isTauri) return;
        try {
          const config = await invoke('load_bg_config');
          set({
            bgPath: config.path,
            bgBlur: config.blur,
            bgOpacity: config.opacity
          });
        } catch (e) {
          console.error("Error al cargar bg config:", e);
        }
      },

      // Acciones de Backend Tauri (Iconos)
      saveIconSettingsToBackend: async () => {
        if (!isTauri) return;
        const { userIconPath, userIconPosX, userIconPosY, aiIconPath, aiIconPosX, aiIconPosY } = get();
        try {
          await invoke('save_icon_config', {
            config: {
              user_icon_path: userIconPath,
              user_icon_pos_x: userIconPosX,
              user_icon_pos_y: userIconPosY,
              ai_icon_path: aiIconPath,
              ai_icon_pos_x: aiIconPosX,
              ai_icon_pos_y: aiIconPosY,
            }
          });
        } catch (e) {
          console.error("Error al guardar icon config:", e);
          throw e;
        }
      },

      loadIconSettingsFromBackend: async () => {
        if (!isTauri) return;
        try {
          const config = await invoke('load_icon_config');
          set({
            userIconPath: config.user_icon_path,
            userIconPosX: config.user_icon_pos_x,
            userIconPosY: config.user_icon_pos_y,
            aiIconPath: config.ai_icon_path,
            aiIconPosX: config.ai_icon_pos_x,
            aiIconPosY: config.ai_icon_pos_y,
          });
        } catch (e) {
          console.error("Error al cargar icon config:", e);
        }
      },

      // Acciones de Backend Tauri (Rutas)
      savePathConfigToBackend: async () => {
        if (!isTauri) return;
        const { basePath } = get();
        try {
          await invoke('save_path_config', {
            config: { base_path: basePath }
          });
          const resolved = await invoke('get_current_base_path');
          set({ resolvedBasePath: resolved });
        } catch (e) {
          console.error("Error al guardar path config:", e);
          throw e;
        }
      },

      loadPathConfigFromBackend: async () => {
        if (!isTauri) return;
        try {
          const config = await invoke('load_path_config');
          const resolved = await invoke('get_current_base_path');
          set({ basePath: config.base_path, resolvedBasePath: resolved });
        } catch (e) {
          console.error("Error al cargar path config:", e);
        }
      },

      saveWslConfigToBackend: async () => {
        if (!isTauri) return;
        const { enableWsl } = get();
        try {
          await invoke('save_wsl_config', {
            config: { enabled: enableWsl }
          });
        } catch (e) {
          console.error("Error al guardar wsl config:", e);
          throw e;
        }
      },

      loadWslConfigFromBackend: async () => {
        if (!isTauri) return;
        try {
          const config = await invoke('load_wsl_config');
          set({ enableWsl: config.enabled });
        } catch (e) {
          console.error("Error al cargar wsl config:", e);
        }
      },

      // Acciones de Backend Tauri (API)
      saveApiConfigToBackend: async () => {
        if (!isTauri) return;
        const { googleApiKey, enableSystemIntegration } = get();
        try {
          await invoke('save_api_config', {
            config: { 
              google_api_key: googleApiKey,
              enable_system_integration: enableSystemIntegration
            }
          });
        } catch (e) {
          console.error("Error al guardar api config:", e);
          throw e;
        }
      },

      loadApiConfigFromBackend: async () => {
        if (!isTauri) return;
        try {
          const config = await invoke('load_api_config');
          set({ 
            googleApiKey: config.google_api_key,
            enableSystemIntegration: config.enable_system_integration || false
          });
        } catch (e) {
          console.error("Error al cargar api config:", e);
        }
      },

      // API Backend Go
      isOnline: false,
      availableModels: [],
      
      checkHealth: async () => {
        try {
          const { ENDPOINTS } = await import('../service/api');
          const response = await fetch(ENDPOINTS.HEALTH);
          if (response.ok) {
            set({ isOnline: true });
          } else {
            set({ isOnline: false });
          }
        } catch (e) {
          set({ isOnline: false });
        }
      },

      fetchModels: async () => {
        const { googleApiKey } = get();
        try {
          const { ENDPOINTS } = await import('../service/api');
          const response = await fetch(ENDPOINTS.MODELS, {
            headers: {
              'X-Google-API-Key': googleApiKey || ''
            }
          });
          if (response.ok) {
            const data = await response.json();
            set({ availableModels: data.models || [] });
          } else {
            console.error("Error cargando modelos, status:", response.status);
          }
        } catch (e) {
          console.error("Error al cargar modelos:", e);
        }
      },

      resetSettings: () => set({
        theme: 'dark',
        aiModel: 'gemini-pro',
        temperature: 0.7,
        bgBlur: 10,
        bgOpacity: 50,
        userIconPosX: 50,
        userIconPosY: 50,
        aiIconPosX: 50,
        aiIconPosY: 50
      })
    }),
    {
      name: 'ia-settings-storage',
    }
  )
);

export default useSettingsStore;
