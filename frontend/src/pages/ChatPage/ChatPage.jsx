import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, ChevronDown, Download, Paperclip, X, FileText, Image as ImageIcon, AlertTriangle, Brain } from 'lucide-react';
import useChatStore from '../../store/chatStore';
import useSettingsStore from '../../store/settingsStore';
import { ENDPOINTS } from '../../service/api';
import Modal from '../../components/common/Modal/Modal';
import MediaCard from '../../components/common/MediaPlayer/MediaCard';
import styles from './ChatPage.module.scss';
import { convertFileSrc, invoke } from '@tauri-apps/api/tauri';
import { open } from '@tauri-apps/api/dialog';
import { readBinaryFile } from '@tauri-apps/api/fs';

const getMimeType = (filePath) => {
  const ext = filePath.split('.').pop().toLowerCase();
  const map = {
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    txt: 'text/plain',
    csv: 'text/csv',
    md: 'text/markdown',
    json: 'application/json'
  };
  return map[ext] || 'application/octet-stream';
};

const arrayBufferToBase64 = (buffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const CodeBlock = ({ language, code, onDownload, installedRuntimes }) => {
  const [output, setOutput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { enableWsl } = useSettingsStore();

  const handleExecute = async () => {
    if (!isTauri) return;
    setIsExecuting(true);
    setErrorMsg('');
    setOutput('Ejecutando en WSL...');
    
    try {
      const res = await invoke('execute_wsl_code', { code, lang: language });
      setOutput(res);
    } catch (e) {
      setErrorMsg(e);
      setOutput('');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleOpenCmd = async () => {
    if (!isTauri) return;
    try {
      await invoke('open_wsl_cmd', { code, lang: language });
    } catch (e) {
      alert("Error al abrir CMD: " + e);
    }
  };

  const isExecutable = ['python', 'py', 'javascript', 'js', 'node', 'bash', 'sh', 'shell'].includes(language.toLowerCase());

  // Limite de 50 lineas
  const lines = output.split('\n');
  const isTruncated = lines.length > 50;
  const displayOutput = isTruncated ? lines.slice(0, 50).join('\n') : output;

  // Verificar si el lenguaje está instalado
  let isLangInstalled = true;
  if (installedRuntimes) {
    const langLower = language.toLowerCase().trim();
    let runtimeKey = null;
    if (['python', 'py'].includes(langLower)) runtimeKey = 'python';
    if (['javascript', 'js', 'node', 'ts'].includes(langLower)) runtimeKey = 'node';
    if (['go'].includes(langLower)) runtimeKey = 'go';
    if (['java'].includes(langLower)) runtimeKey = 'java';
    
    if (runtimeKey && installedRuntimes[runtimeKey] === false) {
      isLangInstalled = false;
    }
  }

  return (
    <div className={styles.codeBlockContainer}>
      <div className={styles.codeBlockHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>{language}</span>
          {!isLangInstalled && (
            <span style={{ color: '#ef4444', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
              ⚠️ Idioma no instalado
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {isTauri && enableWsl && isExecutable && (
            <>
              <button className={styles.codeBlockDownloadBtn} onClick={handleExecute} disabled={isExecuting}>
                {isExecuting ? '⏳ Ejecutando...' : '▶ Ejecutar'}
              </button>
              <button className={styles.codeBlockDownloadBtn} onClick={handleOpenCmd}>
                💻 CMD
              </button>
            </>
          )}
          <button className={styles.codeBlockDownloadBtn} onClick={() => onDownload(code, language)}>
            <Download size={14} /> Descargar
          </button>
        </div>
      </div>
      <pre className={styles.codeBlockPre}>
        <code>{code}</code>
      </pre>
      
      {(output || errorMsg) && (
        <div style={{ background: '#0d0d0d', borderTop: '1px solid #333', padding: '12px', fontSize: '13px', color: '#10b981', fontFamily: 'Consolas, monospace', maxHeight: '400px', overflowY: 'auto', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px' }}>
          {errorMsg ? <div style={{ color: '#ef4444', marginBottom: '8px' }}>❌ {errorMsg}</div> : null}
          {displayOutput && <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{displayOutput}</pre>}
          {isTruncated && (
            <div style={{ color: '#9ca3af', marginTop: '12px', borderTop: '1px dashed #4b5563', paddingTop: '8px', fontSize: '12px' }}>
              ⚠️ Salida muy larga truncada a 50 líneas. Para ver la ejecución completa, utiliza el botón "CMD" o descarga el script.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const isTauri = typeof window !== 'undefined' && window.__TAURI_IPC__ !== undefined;

const ChatPage = () => {
  const { chats, activeChatId, addMessage, setMessages, updateChatPersonality, updateChatTitle, updateChatTokens, updateChatManualTarget, updateRoomSettings } = useChatStore();
  const { userIconPath, userIconPosX, userIconPosY, aiIconPath, aiIconPosX, aiIconPosY, aiModel, temperature, googleApiKey, enableSystemIntegration, availableModels, fetchModels, apiTier } = useSettingsStore();
  const [inputValue, setInputValue] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [personalities, setPersonalities] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [autoRepliesLeft, setAutoRepliesLeft] = useState(0);
  const [installedRuntimes, setInstalledRuntimes] = useState(null);
  const messagesEndRef = useRef(null);

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [exportedPath, setExportedPath] = useState('');
  
  // Room Settings Modal State
  const [isRoomSettingsOpen, setIsRoomSettingsOpen] = useState(false);
  const [tempRoomContext, setTempRoomContext] = useState('');
  const [tempMaxAutoReplies, setTempMaxAutoReplies] = useState(0);

  const activeChat = chats.find(c => c.id === activeChatId);
  const messages = activeChat?.messages || [];
  const selectedPersonalityId = activeChat?.personalityId || '';
  
  const agentName = selectedPersonalityId 
    ? (personalities.find(p => p.id === parseInt(selectedPersonalityId))?.nombre || 'Agente IA')
    : 'Agente IA';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const loadMessages = async () => {
      if (activeChatId && isTauri) {
        try {
          const loaded = await invoke('get_chat_messages', { chatCode: parseInt(activeChatId) });
          if (loaded && loaded.length > 0) {
            const mappedMessages = loaded.map(msg => ({
              ...msg,
              senderName: msg.sender_name || msg.senderName
            }));
            setMessages(activeChatId, mappedMessages);
          }
        } catch (e) {
          console.error("Error loading local messages:", e);
        }
      }
    };
    loadMessages();
  }, [activeChatId, setMessages]);

  useEffect(() => {
    const fetchPersonalities = async () => {
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
      }
    };
    fetchPersonalities();
  }, []);

  useEffect(() => {
    if (autoRepliesLeft > 0 && !isSending && activeChat?.isGroupChat) {
      const timer = setTimeout(() => {
        handleSend(null, true);
      }, 1500); // Pequeña pausa para que se sienta más natural
      return () => clearTimeout(timer);
    }
  }, [autoRepliesLeft, isSending, activeChat?.isGroupChat]);

  // Fetch installed runtimes for CodeBlock warnings
  useEffect(() => {
    const { enableWsl } = useSettingsStore.getState();
    if (enableWsl) {
      fetch(ENDPOINTS.RUNTIMES)
        .then(res => res.json())
        .then(data => setInstalledRuntimes(data))
        .catch(err => console.error("Error fetching runtimes", err));
    }
  }, []);

  const handleDownloadCode = async (code, language) => {
    if (!isTauri) return;
    
    const extensionMap = {
      python: 'py',
      javascript: 'js',
      typescript: 'ts',
      rust: 'rs',
      ruby: 'rb',
      csharp: 'cs',
      cpp: 'cpp',
      c: 'c',
      go: 'go',
      java: 'java',
      html: 'html',
      css: 'css',
      json: 'json',
      markdown: 'md',
      shell: 'sh',
      bash: 'sh',
      yaml: 'yml',
      sql: 'sql'
    };
    
    const langKey = language?.toLowerCase().trim() || 'txt';
    const ext = extensionMap[langKey] || langKey;
    const filename = `codigo_${Date.now()}.${ext}`;
    
    try {
      const parentDir = await invoke('export_text_file', { filename, content: code });
      setExportedPath(parentDir);
      setSuccessModalOpen(true);
    } catch (e) {
      console.error("Error exporting code:", e);
    }
  };

  const handleExportChat = async (format) => {
    setExportModalOpen(false);
    if (!isTauri || !activeChat) return;

    let content = '';
    const filename = `conversacion_${activeChatId}_${Date.now()}.${format}`;

    if (format === 'json') {
      content = JSON.stringify(messages, null, 2);
    } else {
      content = `# ${activeChat.title || 'Conversación'}\n\n`;
      messages.forEach(m => {
        content += `**${m.sender === 'user' ? 'Tú' : agentName}**:\n${m.text}\n\n---\n\n`;
      });
    }

    try {
      const parentDir = await invoke('export_text_file', { filename, content });
      setExportedPath(parentDir);
      setSuccessModalOpen(true);
    } catch (e) {
      console.error("Error exporting chat:", e);
    }
  };

  const parseMessageText = (text) => {
    if (!text) return null;
    const blocks = text.split(/(```[\w-]*\n[\s\S]*?```)/g);
    return blocks.map((block, index) => {
      if (block.startsWith('```')) {
        const lines = block.split('\n');
        const firstLine = lines[0].replace('```', '').trim();
        const lang = firstLine || 'txt';
        const code = lines.slice(1, -1).join('\n');
        if (['media', 'youtube', 'spotify', 'audio', 'video'].includes(lang.toLowerCase())) {
          return <MediaCard key={index} code={code} />;
        }
        return <CodeBlock key={index} language={lang} code={code} onDownload={handleDownloadCode} installedRuntimes={installedRuntimes} />;
      }
      return <span key={index}>{block}</span>;
    });
  };

  const handleAttachFiles = async () => {
    if (!isTauri) return;
    try {
      const selected = await open({
        multiple: true,
        filters: [{
          name: 'Documentos e Imágenes',
          extensions: ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'txt', 'csv', 'md', 'json']
        }]
      });
      
      if (selected) {
        const paths = Array.isArray(selected) ? selected : [selected];
        
        // Comprobar límite de 5 archivos sugerido
        if (attachments.length + paths.length > 5) {
          alert('Has seleccionado más de 5 archivos. Las respuestas podrían tardar más de lo normal o presentar errores dependiendo del límite de contexto.');
        }

        const newAttachments = [...attachments];
        
        for (const filePath of paths) {
          if (newAttachments.find(a => a.path === filePath)) continue; // Evitar duplicados
          
          const filename = filePath.split(/[/\\]/).pop();
          const mimeType = getMimeType(filePath);
          
          const newAtt = {
            id: Date.now() + Math.random(),
            path: filePath,
            name: filename,
            mimeType: mimeType,
            status: 'processing',
            data: null,
            uri: null
          };
          
          newAttachments.push(newAtt);
          setAttachments([...newAttachments]);
          
          try {
            // Leer archivo local usando API the fs de Tauri
            const buffer = await readBinaryFile(filePath);
            const sizeMB = buffer.byteLength / (1024 * 1024);
            
            if (sizeMB > 50) {
              newAtt.status = 'error';
              newAtt.error = 'El archivo supera los 50MB permitidos.';
            } else if (sizeMB < 20) {
              // Base64 inline
              newAtt.data = arrayBufferToBase64(buffer);
              newAtt.status = 'ready';
            } else {
              // >= 20MB y <= 50MB: Usar API del backend para subir a Google Files
              newAtt.status = 'uploading';
              setAttachments([...newAttachments]);
              
              const res = await fetch(ENDPOINTS.UPLOAD, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Google-API-Key': googleApiKey || ''
                },
                body: JSON.stringify({ file_path: filePath, mime_type: mimeType })
              });
              
              if (res.ok) {
                const data = await res.json();
                newAtt.uri = data.uri;
                newAtt.status = 'ready';
              } else {
                const errData = await res.json();
                newAtt.status = 'error';
                newAtt.error = errData.error || 'Error en subida';
              }
            }
          } catch (e) {
            newAtt.status = 'error';
            newAtt.error = 'Error leyendo archivo';
          }
          
          setAttachments([...newAttachments]);
        }
      }
    } catch (e) {
      console.error("Error seleccionando archivo:", e);
    }
  };

  const removeAttachment = (id) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleSend = async (e, isAutoReply = false) => {
    if (e) e.preventDefault();
    
    let currentMessages = [...messages];
    let userMessage = null;
    let apiAttachments = [];

    if (!isAutoReply) {
      const hasReadyAttachments = attachments.some(a => a.status === 'ready');
      if ((!inputValue.trim() && !hasReadyAttachments) || !activeChatId || isSending) return;

      // Verificar si hay adjuntos con error o procesando
      if (attachments.some(a => a.status === 'processing' || a.status === 'uploading')) {
        alert('Espera a que los archivos terminen de procesarse o subirse.');
        return;
      }

      const userText = inputValue;
      setInputValue('');
      setIsSending(true);
      
      // Reiniciar contador de auto-respuestas si es un mensaje de usuario en grupo
      if (activeChat?.isGroupChat) {
        setAutoRepliesLeft(activeChat.maxAutoReplies || 0);
      } else {
        setAutoRepliesLeft(0);
      }

      // Preparar adjuntos para el backend
      apiAttachments = attachments.filter(a => a.status === 'ready').map(a => ({
        mime_type: a.mimeType,
        data: a.data,
        file_uri: a.uri
      }));

      // Guardamos estado local de adjuntos para mostrarlos en el UI temporalmente
      const localAttachmentsUI = attachments.map(a => ({ name: a.name, isImage: a.mimeType.startsWith('image/'), localPath: a.path }));
      setAttachments([]);

      userMessage = { sender: 'user', text: userText, uiAttachments: localAttachmentsUI };
      addMessage(activeChatId, userMessage);
      currentMessages.push(userMessage);

      if (isTauri) {
        try {
          await invoke('save_chat_message', {
            chatCode: parseInt(activeChatId),
            messageOrder: messages.length + 1,
            message: { 
              id: Date.now(), 
              timestamp: Date.now(), 
              sender: userMessage.sender,
              sender_name: null,
              text: userMessage.text 
            }
          });
        } catch (e) {
          console.error("Error saving user message locally:", e);
        }
      }
    } else {
      setIsSending(true);
    }

    // Construir historial para la API usando currentMessages
    const apiMessages = currentMessages.map((msg, idx) => {
      // Solo enviamos los adjuntos del mensaje actual
      const isLastMessage = idx === currentMessages.length - 1;
      return {
        role: msg.sender === 'user' ? 'user' : 'model',
        content: msg.text || (msg.uiAttachments?.length > 0 ? "[Adjuntos enviados]" : ""),
        attachments: isLastMessage && !isAutoReply ? apiAttachments : []
      };
    });

    const selectedPersonalityIdStr = selectedPersonalityId ? selectedPersonalityId.toString() : '';
    const selectedPersonality = personalities.find(p => p.id.toString() === selectedPersonalityIdStr);
    const personalityPrompt = selectedPersonality ? selectedPersonality.instrucciones : '';
    const useSystemTools = enableSystemIntegration && selectedPersonality?.enable_system_tools;

    let groupPersonalities = [];
    if (activeChat?.isGroupChat) {
      groupPersonalities = activeChat.personalityIds.map(id => {
        const p = personalities.find(pers => pers.id.toString() === id);
        return {
          id: p?.id.toString() || "",
          name: p?.nombre || "",
          instructions: p?.instrucciones || ""
        };
      }).filter(p => p.id !== "");
    }

    const payload = {
      messages: apiMessages,
      personality_prompt: personalityPrompt,
      generate_title: !activeChat.titleGenerated,
      chat_code: parseInt(activeChatId),
      model: aiModel,
      temperature: parseFloat(temperature),
      enable_system_tools: useSystemTools || false,
      is_group_chat: activeChat?.isGroupChat || false,
      group_personalities: groupPersonalities,
      manual_target: activeChat?.manualTargetId || "",
      room_context: activeChat?.roomContext || ""
    };

    try {
      const response = await fetch(ENDPOINTS.CHAT, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Google-API-Key': googleApiKey || '',
          'X-Google-API-Tier': apiTier || 'free'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        const aiMessage = { 
          sender: 'ai', 
          text: data.response,
          senderName: data.responder_name || ''
        };
        addMessage(activeChatId, aiMessage);
        if (data.total_tokens !== undefined) {
          updateChatTokens(activeChatId, data.total_tokens);
        }
        
        if (isTauri) {
          try {
            await invoke('save_chat_message', {
              chatCode: parseInt(activeChatId),
              messageOrder: messages.length + 2,
              message: { 
                id: Date.now(), 
                timestamp: Date.now(), 
                sender: aiMessage.sender,
                sender_name: aiMessage.senderName,
                text: aiMessage.text 
              }
            });
          } catch (e) {
            console.error("Error saving AI message locally:", e);
          }
        }
        
        if (data.title && isTauri && !activeChat.titleGenerated) {
          try {
            const savedHist = await invoke('save_historial', {
              historial: {
                id: activeChat.dbId || 0,
                created_at: "", 
                nombre: data.title,
                code: parseInt(activeChatId),
                is_group_chat: activeChat.isGroupChat || false,
                personality_ids: activeChat.personalityIds || [],
                room_context: activeChat.roomContext || '',
                max_auto_replies: activeChat.maxAutoReplies || 0
              }
            });
            updateChatTitle(activeChatId, data.title, savedHist.id);
          } catch (e) {
            console.error("Error saving historial locally", e);
            updateChatTitle(activeChatId, data.title, null);
          }
        } else if (data.title && !activeChat.titleGenerated) {
            updateChatTitle(activeChatId, data.title, null);
        }

        // Si es autoReply, decrementar contador
        if (activeChat?.isGroupChat && isAutoReply) {
          setAutoRepliesLeft(prev => prev > 0 ? prev - 1 : 0);
        }

      } else {
        const errData = await response.json();
        addMessage(activeChatId, {
          sender: 'ai',
          text: `**Error:** No se pudo procesar la solicitud. (${errData.error || response.statusText})`
        });
      }
    } catch (e) {
      addMessage(activeChatId, {
        sender: 'ai',
        text: `**Error:** Problema de conexión (${e.message})`
      });
    } finally {
      if (fetchModels) fetchModels();
      setIsSending(false);
    }
  };

  const renderAvatar = (sender, senderName) => {
    const isUser = sender === 'user';
    let path = isUser ? userIconPath : aiIconPath;
    let isPersonalityImage = false;

    if (!isUser) {
      if (senderName && activeChat?.isGroupChat) {
        const personality = personalities.find(p => p.nombre === senderName);
        if (personality && personality.localImageUrl) {
          path = personality.localImageUrl;
          isPersonalityImage = true;
        }
      } else if (selectedPersonalityId) {
        const personality = personalities.find(p => p.id === parseInt(selectedPersonalityId));
        if (personality && personality.localImageUrl) {
          path = personality.localImageUrl;
          isPersonalityImage = true;
        }
      }
    }

    const posX = isUser ? userIconPosX : aiIconPosX;
    const posY = isUser ? userIconPosY : aiIconPosY;
    const DefaultIcon = isUser ? User : Bot;

    if (path) {
      // Si es imagen de personalidad, ya viene resuelta con convertFileSrc en fetchPersonalities
      const imgUrl = (isTauri && !path.startsWith('data:') && !isPersonalityImage) ? convertFileSrc(path) : path;
      return (
        <div 
          className={styles.avatarImg} 
          style={{ 
            backgroundImage: `url(${imgUrl})`,
            backgroundPosition: isPersonalityImage ? 'center' : `${posX}% ${posY}%`
          }} 
        />
      );
    }
    return <DefaultIcon size={20} />;
  };

  if (!activeChat) {
    return (
      <div className={styles.emptyState}>
        {renderAvatar('ai')}
        <h2>Bienvenido a Orbit</h2>
        <p>Selecciona un chat del historial o crea uno nuevo para empezar.</p>
      </div>
    );
  }

  return (
    <div className={styles.chatContainer}>
      <div className={styles.messagesArea}>
        {messages.length === 0 ? (
          <div className={styles.noMessages}>
            <Bot size={40} className={styles.icon} />
            <p>Comienza una conversación</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`${styles.messageWrapper} ${msg.sender === 'user' ? styles.user : styles.ai}`}
            >
              <div className={styles.avatar}>
                {renderAvatar(msg.sender, msg.senderName)}
              </div>
              <div className={styles.messageContent}>
                <div className={styles.senderName}>
                  {msg.sender === 'user' ? 'Tú' : (msg.senderName && activeChat?.isGroupChat ? msg.senderName : (activeChat?.isGroupChat ? 'Orquestador IA' : agentName))}
                </div>
                <div className={styles.text}>
                  {msg.uiAttachments && msg.uiAttachments.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: msg.text ? '12px' : '0' }}>
                      {msg.uiAttachments.map((att, i) => (
                        <div key={i} style={{ 
                          padding: '6px 12px', 
                          background: 'rgba(255,255,255,0.05)', 
                          borderRadius: '6px', 
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                          {att.isImage ? <ImageIcon size={14} /> : <FileText size={14} />}
                          <span style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {parseMessageText(msg.text)}
                </div>
              </div>
            </div>
          ))
        )}
        {isSending && (
          <div className={`${styles.messageWrapper} ${styles.ai}`}>
            <div className={styles.avatar}>
              {renderAvatar('ai')}
            </div>
            <div className={styles.messageContent}>
              <div className={styles.senderName}>{agentName}</div>
              <div className={styles.text}>
                 <div className={styles.typingIndicator}>
                   <span className={styles.typingDot}></span>
                   <span className={styles.typingDot}></span>
                   <span className={styles.typingDot}></span>
                 </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {(() => {
        const activeModelStats = availableModels?.find(m => m.id === aiModel);
        const showQuotaWarning = activeModelStats && (activeModelStats.limitReached || activeModelStats.limitReached429);
        const showBillingWarning = activeModelStats && activeModelStats.requiresBilling403;
        return (
          <>
            {showQuotaWarning && (
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#f87171',
                padding: '10px 16px',
                margin: '0 20px 10px 20px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '0.85rem'
              }}>
                <AlertTriangle size={18} />
                <div>
                  <strong>🛑 Advertencia de Límite Diario:</strong> El modelo <code>{aiModel}</code> ha alcanzado su tope estimado o devolvió error 429 hoy. Se restablecerá mañana. Puedes seleccionar otro modelo en Ajustes.
                </div>
              </div>
            )}
            {showBillingWarning && !showQuotaWarning && (
              <div style={{
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                color: '#fbbf24',
                padding: '10px 16px',
                margin: '0 20px 10px 20px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '0.85rem'
              }}>
                <AlertTriangle size={18} />
                <div>
                  <strong>🔒 Modelo de Pago (Facturación Requerida):</strong> El modelo <code>{aiModel}</code> está marcado como <em>&quot;solo plan con facturación&quot;</em> (Error 403). Requiere una cuenta de Google Cloud con facturación activa.
                </div>
              </div>
            )}
          </>
        );
      })()}

      <div className={styles.inputArea}>
        <div className={styles.inputHeader}>
          {activeChat && (
            <div 
              className={styles.memoryMarker} 
              title={activeChat?.isGroupChat ? "Consumo de memoria / tokens (Clic para Ajustes de Sala)" : "Consumo de memoria / tokens"}
              onClick={() => {
                if (activeChat?.isGroupChat) {
                  setTempRoomContext(activeChat.roomContext || '');
                  setTempMaxAutoReplies(activeChat.maxAutoReplies || 0);
                  setIsRoomSettingsOpen(true);
                }
              }}
              style={{ cursor: activeChat?.isGroupChat ? 'pointer' : 'default' }}
            >
              <Brain size={14} className={styles.memoryIcon} />
              <div className={styles.memoryBarContainer}>
                <div 
                  className={styles.memoryBarFill} 
                  style={{ 
                    width: `${Math.min(100, ((activeChat.tokensUsage || 0) / 1000000) * 100)}%`,
                    backgroundColor: (activeChat.tokensUsage || 0) > 800000 ? '#ef4444' : (activeChat.tokensUsage || 0) > 500000 ? '#f59e0b' : '#3b82f6'
                  }}
                />
              </div>
              <span className={styles.memoryText}>
                {(activeChat.tokensUsage || 0).toLocaleString()} / 1M
              </span>
            </div>
          )}
          {activeChat?.isGroupChat ? (
            <div className={styles.personalitySelector} title="Elegir quién responde al siguiente mensaje">
              <Bot size={14} className={styles.selectorIcon} />
              <select 
                value={activeChat?.manualTargetId || ""} 
                onChange={(e) => updateChatManualTarget(activeChatId, e.target.value)}
                className={styles.selectNative}
              >
                <option value="">Automático (Orquestador IA)</option>
                {activeChat.personalityIds.map(id => {
                  const p = personalities.find(pers => pers.id.toString() === id);
                  if (!p) return null;
                  return <option key={p.id} value={p.id.toString()}>Responder: {p.nombre}</option>;
                })}
              </select>
              <ChevronDown size={14} className={styles.chevron} />
            </div>
          ) : (
            <div className={styles.personalitySelector}>
              <Bot size={14} className={styles.selectorIcon} />
              <select 
                value={selectedPersonalityId} 
                onChange={(e) => updateChatPersonality(activeChatId, e.target.value)}
                className={styles.selectNative}
              >
                <option value="">Personalidad por defecto</option>
                {personalities.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
              <ChevronDown size={14} className={styles.chevron} />
            </div>
          )}
          <button className={styles.exportBtn} onClick={() => setExportModalOpen(true)} title="Exportar Conversación">
            <Download size={14} /> Descargar Chat
          </button>
        </div>
        
        {/* Vista previa de adjuntos */}
        {attachments.length > 0 && (
          <div className={styles.attachmentsPreview} style={{ display: 'flex', gap: '8px', padding: '8px 16px', flexWrap: 'wrap' }}>
            {attachments.map(att => (
              <div key={att.id} style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#2d2d2d',
                padding: '6px 12px',
                borderRadius: '8px',
                border: att.status === 'error' ? '1px solid #ef4444' : '1px solid #444',
                fontSize: '13px'
              }}>
                {att.mimeType.startsWith('image/') ? <ImageIcon size={16} color="#60a5fa" /> : <FileText size={16} color="#9ca3af" />}
                
                <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '150px' }}>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{att.name}</span>
                  {att.status === 'processing' && <span style={{ fontSize: '10px', color: '#fbbf24' }}>Procesando...</span>}
                  {att.status === 'uploading' && <span style={{ fontSize: '10px', color: '#60a5fa' }}>Subiendo...</span>}
                  {att.status === 'error' && <span style={{ fontSize: '10px', color: '#ef4444' }}>{att.error}</span>}
                </div>
                
                <button 
                  onClick={() => removeAttachment(att.id)}
                  style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '4px', display: 'flex' }}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <form className={styles.inputForm} onSubmit={handleSend}>
          {isTauri && (
            <button 
              type="button" 
              className={styles.attachButton} 
              onClick={handleAttachFiles}
              disabled={!googleApiKey || isSending}
              style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center' }}
              title="Adjuntar archivo"
            >
              <Paperclip size={20} />
            </button>
          )}
          <input
            type="text"
            className={styles.input}
            placeholder={!googleApiKey ? "Configura tu API Key de Google en Ajustes..." : "Escribe tu mensaje..."}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={!googleApiKey}
          />
          <button 
            type="submit" 
            className={styles.sendButton}
            disabled={(!inputValue.trim() && attachments.length === 0) || !activeChatId || isSending || !googleApiKey}
          >
            <Send size={20} />
          </button>
        </form>
        <div className={styles.disclaimer}>
          El agente de IA puede cometer errores. Considera verificar la información importante.
        </div>
      </div>

      <Modal 
        isOpen={exportModalOpen} 
        onClose={() => setExportModalOpen(false)}
        title="Exportar Conversación"
      >
        <p style={{ marginBottom: '15px' }}>¿En qué formato deseas descargar la conversación actual?</p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button 
            style={{ padding: '8px 16px', borderRadius: '4px', border: '1px solid #444', background: 'transparent', color: '#fff', cursor: 'pointer' }}
            onClick={() => handleExportChat('md')}
          >
            Markdown (.md)
          </button>
          <button 
            style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer' }}
            onClick={() => handleExportChat('json')}
          >
            JSON (.json)
          </button>
        </div>
      </Modal>

      <Modal 
        isOpen={successModalOpen} 
        onClose={() => setSuccessModalOpen(false)}
        title="Archivo Exportado"
        actions={
          <button 
            style={{ padding: '8px 16px', borderRadius: '4px', border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer' }}
            onClick={async () => {
              setSuccessModalOpen(false);
              try {
                await invoke('open_folder', { path: exportedPath });
              } catch (e) {
                console.error("Error abriendo carpeta:", e);
              }
            }}
          >
            Ir a carpeta
          </button>
        }
      >
        <p>El archivo se ha guardado correctamente en tu carpeta de descargas de la aplicación.</p>
      </Modal>
      <Modal 
        isOpen={isRoomSettingsOpen} 
        onClose={() => setIsRoomSettingsOpen(false)}
        title="Ajustes de Sala Grupal"
        actions={
          <>
            <button className={styles.cancelBtn} onClick={() => setIsRoomSettingsOpen(false)}>Cancelar</button>
            <button 
              className={styles.saveBtn} 
              onClick={() => {
                updateRoomSettings(activeChatId, tempRoomContext, tempMaxAutoReplies);
                setIsRoomSettingsOpen(false);
                // Si el chat tiene DB ID, también persistimos el título/settings aquí
                if (activeChat?.dbId && isTauri && window.__TAURI_IPC__) {
                  import('@tauri-apps/api/tauri').then(({ invoke }) => {
                    invoke('save_historial', {
                      historial: {
                        id: activeChat.dbId,
                        created_at: "", 
                        nombre: activeChat.title,
                        code: parseInt(activeChatId),
                        is_group_chat: activeChat.isGroupChat || false,
                        personality_ids: activeChat.personalityIds || [],
                        room_context: tempRoomContext,
                        max_auto_replies: tempMaxAutoReplies
                      }
                    }).catch(e => console.error("Error saving room settings", e));
                  }).catch(err => console.error("Error importando tauri", err));
                }
              }}
            >
              Guardar Ajustes
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', color: '#e4e4e7', fontSize: '0.9rem' }}>Contexto y Reglas de la Sala</label>
            <textarea 
              value={tempRoomContext}
              onChange={(e) => setTempRoomContext(e.target.value)}
              placeholder="Ej. Están en una taberna medieval..."
              style={{ width: '100%', height: '80px', padding: '10px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid #333' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', color: '#e4e4e7', fontSize: '0.9rem' }}>
              Límite de Respuestas Continuas (Orquestador Automático)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <input 
                type="range" 
                min="0" max="10" 
                value={tempMaxAutoReplies}
                onChange={(e) => setTempMaxAutoReplies(parseInt(e.target.value))}
                style={{ flex: 1 }}
              />
              <span style={{ color: '#4ade80', fontWeight: 'bold' }}>{tempMaxAutoReplies}</span>
            </div>
            {tempMaxAutoReplies > 0 && (
              <div style={{ marginTop: '10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '10px', borderRadius: '6px', fontSize: '0.85rem', color: '#fca5a5' }}>
                <AlertTriangle size={14} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'middle' }} />
                <strong>Advertencia:</strong> Permitir respuestas continuas significa que la IA responderá automáticamente hasta alcanzar este límite. ¡Esto puede consumir tokens muy rápidamente!
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ChatPage;
