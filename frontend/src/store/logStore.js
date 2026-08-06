import { create } from 'zustand';

const useLogStore = create((set) => ({
  frontendLogs: [],
  backendLogs: [],
  
  addFrontendLog: (log) => set((state) => ({
    frontendLogs: [...state.frontendLogs, { ...log, id: Date.now() + Math.random() }].slice(-500)
  })),
  
  addBackendLog: (logText) => set((state) => ({
    backendLogs: [...state.backendLogs, { text: logText, id: Date.now() + Math.random() }].slice(-500)
  })),
  
  clearFrontendLogs: () => set({ frontendLogs: [] }),
  clearBackendLogs: () => set({ backendLogs: [] })
}));

export default useLogStore;
