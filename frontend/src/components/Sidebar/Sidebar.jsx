import { Link, useNavigate, useLocation } from 'react-router-dom';
import { PlusCircle, Settings, MessageSquare, Trash2, Users, Edit2, Check, X, FileText, Music, FolderPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import useChatStore from '../../store/chatStore';
import useSettingsStore from '../../store/settingsStore';
import useMediaStore from '../../store/mediaStore';
import { ENDPOINTS } from '../../service/api';
import Modal from '../../components/common/Modal/Modal';
import styles from './Sidebar.module.scss';

const Sidebar = () => {
  const { chats, setChats, activeChatId, setActiveChat, createNewChat, deleteChat, updateChatTitle, updateChatProject } = useChatStore();
  const { isOnline, checkHealth } = useSettingsStore();
  const { toggleExpanded } = useMediaStore();
  const location = useLocation();
  const [editingChatId, setEditingChatId] = useState(null);
  const [editTitleValue, setEditTitleValue] = useState("");
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, chat: null });
  const [projectModal, setProjectModal] = useState({ isOpen: false, chat: null, projectName: "" });

  const handleSaveTitle = async (chat) => {
    if (!editTitleValue.trim() || editTitleValue === chat.title) {
      setEditingChatId(null);
      return;
    }
    const newTitle = editTitleValue.trim();
    
    // Save to global state
    updateChatTitle(chat.id, newTitle, chat.dbId);
    
    // Save locally via Tauri
    if (typeof window !== 'undefined' && window.__TAURI_IPC__) {
      try {
        const { invoke } = await import('@tauri-apps/api/tauri');
        await invoke('save_historial', {
          historial: {
            id: chat.dbId || 0,
            created_at: chat.updatedAt || "", // Fallback
            nombre: newTitle,
            code: parseInt(chat.id),
            is_group_chat: chat.isGroupChat || false,
            personality_ids: chat.personalityIds || [],
            room_context: chat.roomContext || '',
            max_auto_replies: chat.maxAutoReplies || 0
          }
        });
      } catch (e) {
        console.error("Error updating title locally", e);
      }
    }
    setEditingChatId(null);
  };

  const handleAssignProject = async () => {
    const chat = projectModal.chat;
    const projectName = projectModal.projectName.trim();
    if (!chat) return;

    updateChatProject(chat.id, projectName || null, chat.projectContext || null);

    if (typeof window !== 'undefined' && window.__TAURI_IPC__) {
      try {
        const { invoke } = await import('@tauri-apps/api/tauri');
        await invoke('save_historial', {
          historial: {
            id: chat.dbId || 0,
            created_at: chat.updatedAt || "",
            nombre: chat.title || 'Chat sin título',
            code: parseInt(chat.id),
            is_group_chat: chat.isGroupChat || false,
            personality_ids: chat.personalityIds || [],
            room_context: chat.roomContext || '',
            max_auto_replies: chat.maxAutoReplies || 0,
            project_id: projectName || null,
            project_context: chat.projectContext || null
          }
        });
      } catch (e) {
        console.error("Error updating project locally", e);
      }
    }

    setProjectModal({ isOpen: false, chat: null, projectName: "" });
  };

  const handleNewChat = () => {
    createNewChat();
  };

  const confirmDeleteChat = async () => {
    const chat = deleteModal.chat;
    if (!chat) return;

    if (typeof window !== 'undefined' && window.__TAURI_IPC__) {
      try {
        const { invoke } = await import('@tauri-apps/api/tauri');
        if (chat.dbId) {
           await invoke('delete_historial', { id: chat.dbId });
        }
        await invoke('delete_local_chat', { chatCode: parseInt(chat.id) });
      } catch (err) {
        console.error("Error eliminando chat local:", err);
      }
    }

    deleteChat(chat.id);
    setDeleteModal({ isOpen: false, chat: null });
  };

  useEffect(() => {
    const fetchHistorial = async () => {
      if (typeof window !== 'undefined' && window.__TAURI_IPC__) {
        try {
          const { invoke } = await import('@tauri-apps/api/tauri');
          const historiales = await invoke('get_historials');
          setChats(historiales || []);
        } catch (e) {
          console.error("Error fetching local historial", e);
        }
      }
    };
    fetchHistorial();
  }, [setChats]);

  // Polling para el Health Check cada 5 minutos
  useEffect(() => {
    checkHealth(); // Ejecutar inmediatamente
    const interval = setInterval(() => {
      checkHealth();
    }, 300000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  return (
    <div className={styles.sidebar}>
      <div className={styles.header}>
        <h2 className={styles.title}>Orbit</h2>
        <Link to="/" className={styles.newChatBtn} onClick={handleNewChat}>
          <PlusCircle size={20} />
          <span>Nuevo Chat</span>
        </Link>
      </div>

      <div className={styles.chatList}>
        <div className={styles.listTitle}>Historial</div>
        
        {/* Agrupamiento por Proyectos */}
        {Object.entries(
          chats.reduce((acc, chat) => {
            const project = chat.projectId || 'General';
            if (!acc[project]) acc[project] = [];
            acc[project].push(chat);
            return acc;
          }, {})
        ).map(([projectName, projectChats]) => (
          <div key={projectName} style={{ marginBottom: '10px' }}>
            <div style={{ fontSize: '12px', color: '#8b5cf6', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 'bold' }}>
              📁 {projectName}
            </div>
            {projectChats.map((chat) => (
              <div 
                key={chat.id} 
                className={`${styles.chatItem} ${activeChatId === chat.id && location.pathname === '/' ? styles.active : ''}`}
            onClick={() => {
              if (editingChatId !== chat.id) setActiveChat(chat.id);
            }}
          >
            {editingChatId === chat.id ? (
              <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: '5px' }}>
                <input 
                  value={editTitleValue}
                  onChange={(e) => setEditTitleValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle(chat);
                    if (e.key === 'Escape') setEditingChatId(null);
                  }}
                  autoFocus
                  style={{ flex: 1, background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px', padding: '2px 5px', fontSize: '13px' }}
                  onClick={(e) => e.stopPropagation()}
                />
                <button onClick={(e) => { e.stopPropagation(); handleSaveTitle(chat); }} style={{ background: 'none', border: 'none', color: '#4ade80', cursor: 'pointer', padding: '2px' }}>
                  <Check size={16} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); setEditingChatId(null); }} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '2px' }}>
                  <X size={16} />
                </button>
              </div>
            ) : (
              <>
                <Link to="/" className={styles.chatLink}>
                  <MessageSquare size={18} />
                  <span className={styles.chatTitle} onDoubleClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setEditingChatId(chat.id);
                    setEditTitleValue(chat.title || "");
                  }}>{chat.title || 'Chat sin título'}</span>
                </Link>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <button 
                    className={styles.deleteBtn} 
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setEditingChatId(chat.id);
                      setEditTitleValue(chat.title || "");
                    }}
                    title="Renombrar chat"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    className={styles.deleteBtn} 
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setProjectModal({ isOpen: true, chat, projectName: chat.projectId || "" });
                    }}
                    title="Asignar Proyecto"
                  >
                    <FolderPlus size={16} />
                  </button>
                  <button 
                    className={styles.deleteBtn} 
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setDeleteModal({ isOpen: true, chat });
                    }}
                    title="Eliminar chat"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </>
            )}
          </div>
            ))}
          </div>
        ))}
        {chats.length === 0 && (
          <div className={styles.emptyState}>No hay chats recientes</div>
        )}
      </div>

      <div className={styles.footer}>
        <div 
          className={styles.healthIndicator} 
          title={isOnline ? "Backend Conectado (Click para refrescar)" : "Backend Desconectado (Click para reintentar)"}
          onClick={checkHealth}
        >
          <div className={`${styles.dot} ${isOnline ? styles.online : styles.offline}`}></div>
          <span>{isOnline ? 'Servicio en línea' : 'Servicio offline'}</span>
        </div>

        <button 
          className={styles.footerBtn} 
          onClick={toggleExpanded}
          style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '8px', color: '#e5e7eb', fontSize: '0.9rem', transition: 'all 0.2s' }}
        >
          <Music size={20} color="#8b5cf6" />
          <span>Reproductor de Música</span>
        </button>
        
        <Link 
          to="/personalities" 
          className={`${styles.footerBtn} ${location.pathname === '/personalities' ? styles.activeBtn : ''}`}
        >
          <Users size={20} />
          <span>Personalidades</span>
        </Link>

        <Link 
          to="/patch-notes" 
          className={`${styles.footerBtn} ${location.pathname === '/patch-notes' ? styles.activeBtn : ''}`}
        >
          <FileText size={20} />
          <span>Notas del Parche</span>
        </Link>

        <Link 
          to="/settings" 
          className={`${styles.footerBtn} ${location.pathname === '/settings' ? styles.activeBtn : ''}`}
        >
          <Settings size={20} />
          <span>Ajustes</span>
        </Link>
      </div>

      <Modal 
        isOpen={deleteModal.isOpen} 
        onClose={() => setDeleteModal({ isOpen: false, chat: null })}
        title="Eliminar Chat"
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #555', background: 'transparent', color: '#fff', cursor: 'pointer' }}
              onClick={() => setDeleteModal({ isOpen: false, chat: null })}
            >
              Cancelar
            </button>
            <button 
              style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer' }}
              onClick={confirmDeleteChat}
            >
              Eliminar
            </button>
          </div>
        }
      >
        <p style={{ color: '#d1d5db', fontSize: '14px' }}>
          ¿Estás seguro de que deseas eliminar este chat? Esta acción no se puede deshacer.
        </p>
      </Modal>

      <Modal 
        isOpen={projectModal.isOpen} 
        onClose={() => setProjectModal({ isOpen: false, chat: null, projectName: "" })}
        title="Asignar Proyecto"
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #555', background: 'transparent', color: '#fff', cursor: 'pointer' }}
              onClick={() => setProjectModal({ isOpen: false, chat: null, projectName: "" })}
            >
              Cancelar
            </button>
            <button 
              style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', background: '#a855f7', color: '#fff', cursor: 'pointer' }}
              onClick={handleAssignProject}
            >
              Guardar
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <p style={{ color: '#d1d5db', fontSize: '14px', margin: 0 }}>
            Escribe el nombre del proyecto o carpeta al que pertenecerá este chat. Déjalo en blanco para moverlo a General.
          </p>
          <input 
            type="text"
            value={projectModal.projectName}
            onChange={(e) => setProjectModal(prev => ({ ...prev, projectName: e.target.value }))}
            placeholder="Nombre del Proyecto"
            style={{ padding: '10px', borderRadius: '6px', border: '1px solid #4b5563', background: '#1f2937', color: '#f3f4f6' }}
            autoFocus
          />
        </div>
      </Modal>
    </div>
  );
};

export default Sidebar;
