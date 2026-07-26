import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useMediaStore = create(
  persist(
    (set, get) => ({
      currentMedia: null, // { type: 'youtube' | 'spotify' | 'mp3', url: string, title: string, id?: string }
      isPlaying: false,
      volume: 80,
      isExpanded: false,
      pipMode: true,

      playMedia: (media) => {
        set({
          currentMedia: media,
          isPlaying: true,
          isExpanded: false, // al reproducir un nuevo medio, inicia en vista flotante/PiP
          pipMode: media?.type === 'youtube' || media?.type === 'video'
        });
      },

      togglePlay: () => {
        const { isPlaying, currentMedia } = get();
        if (!currentMedia) return;
        set({ isPlaying: !isPlaying });
      },

      setIsPlaying: (val) => set({ isPlaying: val }),

      setVolume: (val) => set({ volume: val }),

      toggleExpanded: () => {
        set(state => ({ isExpanded: !state.isExpanded }));
      },

      setExpanded: (val) => set({ isExpanded: val }),

      togglePip: () => {
        set(state => ({ pipMode: !state.pipMode }));
      },

      setPipMode: (val) => set({ pipMode: val }),

      closeMedia: () => {
        set({
          currentMedia: null,
          isPlaying: false,
          isExpanded: false
        });
      }
    }),
    {
      name: 'orbit-media-storage',
      partialize: (state) => ({
        volume: state.volume,
        currentMedia: state.currentMedia,
        pipMode: state.pipMode
      })
    }
  )
);

export default useMediaStore;
