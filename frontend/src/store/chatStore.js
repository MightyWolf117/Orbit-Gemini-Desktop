import { create } from 'zustand';

const useChatStore = create(
  (set) => ({
    chats: [],
    activeChatId: null,

    setChats: (historiales) => set({
      chats: historiales.map(h => ({
        id: h.code.toString(),
        dbId: h.id,
        title: h.nombre,
        titleGenerated: true,
        messages: [],
        personalityId: h.code && h.code > 0 ? h.code.toString() : null,
        isGroupChat: h.is_group_chat || false,
        personalityIds: h.personality_ids || [],
        roomContext: h.room_context || '',
        maxAutoReplies: h.max_auto_replies || 0,
        projectId: h.project_id || null,
        projectContext: h.project_context || null,
        manualTargetId: null,
        tokensUsage: 0,
        updatedAt: new Date(h.created_at).getTime()
      }))
    }),

    setActiveChat: (id) => set({ activeChatId: id }),

    addMessage: (chatId, message) => set((state) => {
      const updatedChats = state.chats.map((chat) => {
        if (chat.id === chatId) {
          return {
            ...chat,
            messages: [...chat.messages, { ...message, id: Date.now(), timestamp: Date.now() }],
            updatedAt: Date.now()
          };
        }
        return chat;
      });
      return { chats: updatedChats };
    }),

    setMessages: (chatId, messages) => set((state) => {
      const updatedChats = state.chats.map((chat) => {
        if (chat.id === chatId) {
          return { ...chat, messages };
        }
        return chat;
      });
      return { chats: updatedChats };
    }),

    createNewChat: () => set((state) => {
      const newChat = {
        id: Date.now().toString(),
        title: 'Nuevo Chat',
        titleGenerated: false,
        messages: [],
        personalityId: null,
        isGroupChat: false,
        personalityIds: [],
        manualTargetId: null,
        tokensUsage: 0,
        updatedAt: Date.now()
      };
      return {
        chats: [newChat, ...state.chats],
        activeChatId: newChat.id
      };
    }),

    createNewGroupChat: (selectedPersonalityIds) => set((state) => {
      const newChat = {
        id: Date.now().toString(),
        title: 'Nueva Sala de Chat',
        titleGenerated: false,
        messages: [],
        personalityId: null,
        isGroupChat: true,
        personalityIds: selectedPersonalityIds || [],
        manualTargetId: null,
        roomContext: '',
        maxAutoReplies: 0,
        tokensUsage: 0,
        updatedAt: Date.now()
      };
      return {
        chats: [newChat, ...state.chats],
        activeChatId: newChat.id
      };
    }),

    updateChatTitle: (chatId, title, dbId) => set((state) => {
      const updatedChats = state.chats.map((chat) => {
        if (chat.id === chatId) {
          return { ...chat, title, dbId, titleGenerated: true, updatedAt: Date.now() };
        }
        return chat;
      });
      return { chats: updatedChats };
    }),

    updateChatPersonality: (chatId, personalityId) => set((state) => {
      const updatedChats = state.chats.map((chat) => {
        if (chat.id === chatId) {
          return { ...chat, personalityId, updatedAt: Date.now() };
        }
        return chat;
      });
      return { chats: updatedChats };
    }),

    updateChatManualTarget: (chatId, manualTargetId) => set((state) => {
      const updatedChats = state.chats.map((chat) => {
        if (chat.id === chatId) {
          return { ...chat, manualTargetId, updatedAt: Date.now() };
        }
        return chat;
      });
      return { chats: updatedChats };
    }),

    updateRoomSettings: (chatId, roomContext, maxAutoReplies) => set((state) => {
      const updatedChats = state.chats.map((chat) => {
        if (chat.id === chatId) {
          return { ...chat, roomContext, maxAutoReplies, updatedAt: Date.now() };
        }
        return chat;
      });
      return { chats: updatedChats };
    }),

    updateChatTokens: (chatId, tokensUsage) => set((state) => {
      const updatedChats = state.chats.map((chat) => {
        if (chat.id === chatId) {
          return { ...chat, tokensUsage };
        }
        return chat;
      });
      return { chats: updatedChats };
    }),

    updateChatProject: (chatId, projectId, projectContext) => set((state) => {
      const updatedChats = state.chats.map((chat) => {
        if (chat.id === chatId) {
          return { ...chat, projectId, projectContext, updatedAt: Date.now() };
        }
        return chat;
      });
      return { chats: updatedChats };
    }),

    deleteChat: (id) => set((state) => {
      const filteredChats = state.chats.filter(chat => chat.id !== id);
      return {
        chats: filteredChats,
        activeChatId: state.activeChatId === id ? (filteredChats[0]?.id || null) : state.activeChatId
      };
    })
  })
);

export default useChatStore;
