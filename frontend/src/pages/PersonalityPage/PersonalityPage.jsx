import { useState, useEffect } from 'react';
import { PlusCircle, Edit3, UserCircle, Save, Settings } from 'lucide-react';
import Modal from '../../components/common/Modal/Modal';
import { invoke, convertFileSrc } from '@tauri-apps/api/tauri';
import useSettingsStore from '../../store/settingsStore';
import { ENDPOINTS } from '../../service/api';
import { useNavigate } from 'react-router-dom';
import useChatStore from '../../store/chatStore';
import styles from './PersonalityPage.module.scss';

const isTauri = typeof window !== 'undefined' && window.__TAURI_IPC__ !== undefined;

const PersonalityPage = () => {
  const [personalities, setPersonalities] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { createNewGroupChat } = useChatStore();
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({ nombre: '', descripcion_corta: '', instrucciones: '', image: null, enable_system_tools: false });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Group Chat Modal
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [selectedGroupPersonalities, setSelectedGroupPersonalities] = useState([]);

  const { enableSystemIntegration } = useSettingsStore();

  const [alert, setAlert] = useState({ isOpen: false, title: '', message: '', isError: false });

  const fetchPersonalities = async () => {
    setLoading(true);
    try {
      if (isTauri) {
        const data = await invoke('get_personalities');
        const processedData = await Promise.all(data.map(async (p) => {
          if (p.image) {
            try {
              const fullPath = await invoke('get_personality_image_path', { filename: p.image });
              return { ...p, localImageUrl: convertFileSrc(fullPath) };
            } catch (e) {
              return p;
            }
          }
          return p;
        }));
        setPersonalities(processedData || []);
      }
    } catch (e) {
      console.error("Error fetching personalities:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPersonalities();
  }, []);

  const loadPersonalityImagePreview = async (imageFilename) => {
    if (!imageFilename || !isTauri) return null;
    try {
      const fullPath = await invoke('get_personality_image_path', { filename: imageFilename });
      return convertFileSrc(fullPath);
    } catch (e) {
      console.error("Error loading image path:", e);
      return null;
    }
  };

  const openNewModal = () => {
    setEditingId(null);
    setFormData({ nombre: '', descripcion_corta: '', instrucciones: '', image: null, enable_system_tools: false });
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsModalOpen(true);
  };

  const openEditModal = async (p) => {
    setEditingId(p.id);
    setFormData({ 
      nombre: p.nombre || '', 
      descripcion_corta: p.descripcion_corta || '', 
      instrucciones: p.instrucciones || '',
      image: p.image || null,
      enable_system_tools: p.enable_system_tools || false
    });
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsModalOpen(true);

    if (p.image) {
      const url = await loadPersonalityImagePreview(p.image);
      setPreviewUrl(url);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    if (!formData.nombre.trim() || !formData.instrucciones.trim()) {
      setAlert({ isOpen: true, title: 'Campos requeridos', message: 'El nombre y las instrucciones son obligatorios.', isError: true });
      return;
    }

    try {
      let finalFormData = { ...formData };
      
      if (selectedFile) {
        if (isTauri) {
           const arrayBuffer = await selectedFile.arrayBuffer();
           const bytes = Array.from(new Uint8Array(arrayBuffer));
           const extension = selectedFile.name.split('.').pop();
           const filename = `persona_${Date.now()}.${extension}`;
           
           const savedFilename = await invoke('save_personality_image', {
             imageBytes: bytes,
             filename: filename
           });
           finalFormData.image = savedFilename;
        } else {
           console.warn("Tauri no está disponible, no se guardará la imagen.");
        }
      }

      const isEdit = editingId !== null;
      if (isEdit) {
         finalFormData.id = editingId;
         // Si estamos editando, mantenemos el created_at original que deberíamos haber obtenido al editar,
         // pero como no lo guardamos en formData, lo sacamos del arreglo original.
         const originalPersonality = personalities.find(p => p.id === editingId);
         finalFormData.created_at = originalPersonality ? originalPersonality.created_at : "";
      } else {
         finalFormData.id = 0; 
         finalFormData.created_at = ""; // Rust generates it
      }

      if (isTauri) {
        await invoke('save_personality', { personality: finalFormData });
        setIsModalOpen(false);
        fetchPersonalities();
      } else {
        throw new Error('Tauri no disponible');
      }
    } catch (e) {
      setAlert({ isOpen: true, title: 'Error', message: e.message, isError: true });
    }
  };

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Personalidades de IA</h1>
          <p className={styles.subtitle}>Define el comportamiento y el rol de tus agentes.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className={styles.secondaryBtn} onClick={() => setIsGroupModalOpen(true)} style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', border: '1px solid #4ade80', background: 'transparent', color: '#4ade80', cursor: 'pointer'}}>
            <UserCircle size={20} />
            Crear Sala Grupal
          </button>
          <button className={styles.primaryBtn} onClick={openNewModal}>
            <PlusCircle size={20} />
            Crear Personalidad
          </button>
        </div>
      </header>

      {loading ? (
        <div className={styles.loadingState}>Cargando personalidades...</div>
      ) : (
        <div className={styles.grid}>
          {personalities.map((p) => (
            <div key={p.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>
                  {p.localImageUrl ? (
                    <div className={styles.cardAvatar} style={{backgroundImage: `url(${p.localImageUrl})`}} />
                  ) : (
                    <UserCircle size={24} className={styles.cardIcon} />
                  )}
                  <h3>{p.nombre}</h3>
                </div>
                <button className={styles.editBtn} onClick={() => openEditModal(p)} title="Editar">
                  <Edit3 size={18} />
                </button>
              </div>
              <div className={styles.cardBody}>
                <p className={styles.description}>{p.descripcion_corta || 'Sin descripción.'}</p>
                {p.enable_system_tools && (
                  <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Settings size={14} /> Herramientas de Sistema habilitadas
                  </div>
                )}
              </div>
            </div>
          ))}
          {personalities.length === 0 && (
            <div className={styles.emptyState}>No has creado ninguna personalidad.</div>
          )}
        </div>
      )}

      {/* Modal Creación/Edición */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Editar Personalidad' : 'Nueva Personalidad'}
        disableOverlayClick={true}
        actions={
          <>
            <button className={styles.cancelBtn} onClick={() => setIsModalOpen(false)}>Cancelar</button>
            <button className={styles.saveBtn} onClick={handleSave}><Save size={16}/> Guardar</button>
          </>
        }
      >
        <div className={styles.formGroup}>
          <label>Imagen de Perfil</label>
          <div className={styles.imageUploadContainer}>
            <div 
              className={styles.imagePreview} 
              style={previewUrl ? { backgroundImage: `url(${previewUrl})` } : {}}
            >
              {!previewUrl && <UserCircle size={44} className={styles.cardIcon} style={{margin: '0'}}/>}
            </div>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleImageChange} 
              className={styles.fileInput}
            />
          </div>
        </div>
        <div className={styles.formGroup}>
          <label>Nombre de la Personalidad *</label>
          <input 
            className={styles.input} 
            value={formData.nombre} 
            onChange={e => setFormData({...formData, nombre: e.target.value})} 
            placeholder="Ej. Programador Experto" 
          />
        </div>
        <div className={styles.formGroup}>
          <label>Descripción corta</label>
          <input 
            className={styles.input} 
            value={formData.descripcion_corta} 
            onChange={e => setFormData({...formData, descripcion_corta: e.target.value})} 
            placeholder="Una breve descripción para identificarlo" 
          />
        </div>
        <div className={styles.formGroup}>
          <label>Instrucciones de Comportamiento (Prompt) *</label>
          <textarea 
            className={styles.textarea} 
            value={formData.instrucciones} 
            onChange={e => setFormData({...formData, instrucciones: e.target.value})} 
            placeholder="Ej. Eres un experto en Python. Debes responder con código limpio..." 
            rows={5}
          />
        </div>
        
        {enableSystemIntegration && (
          <div className={styles.formGroup} style={{ marginTop: '1rem', background: 'rgba(255, 255, 255, 0.05)', padding: '10px', borderRadius: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', margin: 0 }}>
              <input 
                type="checkbox" 
                checked={formData.enable_system_tools} 
                onChange={(e) => setFormData({...formData, enable_system_tools: e.target.checked})} 
                style={{ width: '18px', height: '18px', marginRight: '10px', cursor: 'pointer' }}
              />
              <span style={{ fontWeight: '500', color: '#eee' }}>Permitir acceso al sistema (Métricas, Estado)</span>
            </label>
            <p style={{ margin: '5px 0 0 28px', fontSize: '0.85rem', color: '#aaa' }}>
              Permite a esta personalidad utilizar herramientas para leer métricas de hardware, procesos y red local.
            </p>
          </div>
        )}
      </Modal>

      {/* Modal Alertas */}
      <Modal 
        isOpen={alert.isOpen} 
        onClose={() => setAlert({ ...alert, isOpen: false })}
        title={alert.title}
        actions={
          <button 
            className={`${styles.saveBtn} ${alert.isError ? styles.errorBtn : ''}`}
            onClick={() => setAlert({ ...alert, isOpen: false })}
          >
            Entendido
          </button>
        }
      >
        <p>{alert.message}</p>
      </Modal>

    {/* Modal Crear Sala Grupal */}
      <Modal 
        isOpen={isGroupModalOpen} 
        onClose={() => setIsGroupModalOpen(false)}
        title="Crear Sala de Chat Grupal"
        disableOverlayClick={true}
        actions={
          <>
            <button className={styles.cancelBtn} onClick={() => setIsGroupModalOpen(false)}>Cancelar</button>
            <button 
              className={styles.saveBtn} 
              onClick={() => {
                if (selectedGroupPersonalities.length < 2) {
                  setAlert({ isOpen: true, title: 'Error', message: 'Selecciona al menos 2 personalidades para la sala.', isError: true });
                  return;
                }
                createNewGroupChat(selectedGroupPersonalities);
                setIsGroupModalOpen(false);
                navigate('/');
              }}
            >
              Iniciar Chat
            </button>
          </>
        }
      >
        <p style={{marginBottom: '16px', fontSize: '0.9rem', color: '#a1a1aa'}}>Selecciona las personalidades que participarán en esta sala:</p>
        <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
          {personalities.map(p => (
            <label key={p.id} style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', cursor: 'pointer'}}>
              <input 
                type="checkbox" 
                checked={selectedGroupPersonalities.includes(p.id.toString())}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedGroupPersonalities([...selectedGroupPersonalities, p.id.toString()]);
                  } else {
                    setSelectedGroupPersonalities(selectedGroupPersonalities.filter(id => id !== p.id.toString()));
                  }
                }}
              />
              <span style={{color: '#e4e4e7'}}>{p.nombre}</span>
            </label>
          ))}
        </div>
      </Modal>

    </div>
  );
};

export default PersonalityPage;
