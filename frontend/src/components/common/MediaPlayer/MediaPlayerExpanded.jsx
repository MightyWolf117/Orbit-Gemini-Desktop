import React, { useRef, useEffect, useState } from 'react';
import { Minimize2, X, FolderOpen, Music, Video, ExternalLink } from 'lucide-react';
import styles from './MediaPlayer.module.scss';
import useMediaStore from '../../../store/mediaStore';

const isTauri = typeof window !== 'undefined' && window.__TAURI_IPC__ !== undefined;

// Convertir URL normal de YouTube o Spotify a URL embebible (y soporte para búsquedas automáticas)
const getEmbedUrl = (url, type, title) => {
  if (!url) return '';
  
  if (type === 'youtube' || url.includes('youtube.com') || url.includes('youtu.be') || (!url.startsWith('http') && type !== 'mp3' && type !== 'spotify')) {
    let videoId = '';
    if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0];
    } else if (url.includes('watch?v=')) {
      videoId = url.split('watch?v=')[1]?.split('&')[0];
    } else if (url.includes('embed/')) {
      const base = url.split('?')[0];
      videoId = base.split('embed/')[1];
    }
    
    if (videoId && videoId.length === 11) {
      return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&enablejsapi=1`;
    }

    const queryTerm = (url.startsWith('http') || !url) ? (title || 'music') : url;
    return `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(queryTerm)}&autoplay=1&enablejsapi=1`;
  }

  if (type === 'spotify' || url.includes('spotify.com')) {
    if (url.includes('/embed/')) return url;
    return url.replace('open.spotify.com/', 'open.spotify.com/embed/');
  }

  return url;
};

const MediaPlayerExpanded = ({ audioRef }) => {
  const { currentMedia, isExpanded, toggleExpanded, closeMedia, playMedia, isPlaying, volume, pipMode, setPipMode } = useMediaStore();
  const [manualInput, setManualInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const iframeRef = useRef(null);

  // Sincronizar volumen hacia YouTube embed via Iframe API (postMessage)
  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(JSON.stringify({
        event: 'command',
        func: 'setVolume',
        args: [volume]
      }), '*');
    }
  }, [volume]);

  // Sincronizar Play / Pause hacia YouTube embed via Iframe API (postMessage)
  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      const command = isPlaying ? 'playVideo' : 'pauseVideo';
      iframeRef.current.contentWindow.postMessage(JSON.stringify({
        event: 'command',
        func: command,
        args: []
      }), '*');
    }
  }, [isPlaying, currentMedia]);

  // Si la app inicia sin ningún contenido (currentMedia nulo) y no está expandido, no renderizamos nada hasta que abran el reproductor o reproduzcan algo
  if (!isExpanded && !currentMedia) return null;

  const media = currentMedia || { type: 'youtube', url: '', title: 'Reproductor Multimedia Orbit' };
  const isWebEmbed = media.type === 'youtube' || media.type === 'spotify' || (media.url && media.url.startsWith('http') && !media.url.endsWith('.mp3')) || (!media.url?.startsWith('http') && media.type !== 'mp3');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    const trimmed = manualInput.trim();
    if (trimmed.startsWith('http')) {
      playMedia({
        type: trimmed.includes('spotify.com') ? 'spotify' : 'youtube',
        url: trimmed,
        title: 'Enlace directo'
      });
      setManualInput('');
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`http://localhost:8080/api/media/search?q=${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          setSearchResults(data.results);
          setIsSearching(false);
          return;
        }
      }
    } catch (err) {
      console.log("Fallback search in frontend...", err);
    }
    
    // Fallback con API pública si backend está desconectado
    try {
      const res = await fetch(`https://inv.tux.zone/api/v1/search?q=${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const data = await res.json();
        const formatted = data.slice(0, 10).map(v => ({
          id: v.videoId,
          title: v.title,
          url: `https://www.youtube.com/watch?v=${v.videoId}`,
          thumbnail: v.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`
        }));
        setSearchResults(formatted);
        setIsSearching(false);
        return;
      }
    } catch (e) {
      console.log("Fallback Invidious err:", e);
    }
    
    // Si todo falla, reproducimos directamente
    playMedia({
      type: 'youtube',
      url: trimmed,
      title: trimmed
    });
    setIsSearching(false);
  };

  const handleOpenLocalFile = async () => {
    if (!isTauri) {
      alert("La selección de archivos MP3 locales solo está disponible en la versión de escritorio Orbit.");
      return;
    }
    try {
      const { open } = await import('@tauri-apps/api/dialog');
      const { convertFileSrc } = await import('@tauri-apps/api/tauri');

      const selected = await open({
        multiple: false,
        filters: [{
          name: 'Archivos de Audio',
          extensions: ['mp3', 'wav', 'ogg', 'flac', 'm4a']
        }]
      });

      if (selected) {
        const filename = selected.split(/[/\\]/).pop();
        const srcUrl = convertFileSrc(selected);
        playMedia({
          type: 'mp3',
          url: srcUrl,
          title: filename,
          path: selected
        });
      }
    } catch (e) {
      console.error("Error cargando MP3 local:", e);
    }
  };

  const containerClass = isExpanded ? styles.cardExpanded : (pipMode && isWebEmbed ? styles.cardPip : styles.cardHidden);
  const embedUrl = getEmbedUrl(media.url, media.type, media.title);

  return (
    <>
      {/* Backdrop oscuro para modo expandido */}
      {isExpanded && (
        <div className={styles.modalBackdrop} onClick={toggleExpanded} />
      )}

      {/* Tarjeta / Contenedor principal que NUNCA se desmonta del DOM */}
      <div className={containerClass}>
        {/* Header para modo PiP */}
        {!isExpanded && pipMode && isWebEmbed && (
          <div className={styles.pipHeader}>
            <span className={styles.pipTitle}>{media.title || 'Video flotante'}</span>
            <div className={styles.pipActions}>
              <button onClick={() => setPipMode(false)} title="Cambiar a Solo Audio (Ocultar video)">🎵</button>
              <button onClick={toggleExpanded} title="Abrir reproductor completo">🗖</button>
              <button onClick={closeMedia} title="Cerrar reproductor">✕</button>
            </div>
          </div>
        )}

        {/* Header para modo Expandido */}
        {isExpanded && (
          <div className={styles.expandedHeader}>
            <h3>
              {media.type === 'youtube' ? <Video size={18} color="#8b5cf6" /> : <Music size={18} color="#8b5cf6" />}
              {media.title || 'Reproductor Multimedia'}
            </h3>
            <div className={styles.headerActions}>
              {media.url && media.url.startsWith('http') && (
                <a href={media.url} target="_blank" rel="noreferrer" className={styles.ctrlBtn} title="Abrir página original en el navegador" style={{ textDecoration: 'none' }}>
                  <ExternalLink size={14} />
                </a>
              )}
              <button className={styles.ctrlBtn} onClick={toggleExpanded} title="Minimizar a vista flotante">
                <Minimize2 size={15} />
              </button>
              <button className={`${styles.ctrlBtn} ${styles.closeBtn}`} onClick={closeMedia} title="Cerrar reproductor">
                <X size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Formulario de búsqueda en modo Expandido */}
        {isExpanded && (
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', padding: '10px 16px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <input
              type="text"
              placeholder="Escribe el nombre de una canción o artista para buscar..."
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.4)', color: 'white', fontSize: '13px', outline: 'none' }}
            />
            <button type="submit" disabled={isSearching} className={styles.localFileBtn} style={{ background: '#8b5cf6', borderColor: '#8b5cf6', color: 'white', padding: '6px 14px' }}>
              {isSearching ? '⏳...' : '🔍 Buscar'}
            </button>
          </form>
        )}

        {/* Lista de resultados de búsqueda */}
        {isExpanded && searchResults.length > 0 && (
          <div style={{ maxHeight: '200px', overflowY: 'auto', padding: '10px 16px', background: 'rgba(0,0,0,0.8)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: '#a78bfa', fontWeight: 600 }}>Selecciona un resultado para reproducir:</span>
              <button onClick={() => setSearchResults([])} style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '12px' }}>✕ Cerrar lista</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {searchResults.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    playMedia({ type: 'youtube', url: item.url, title: item.title, id: item.id });
                    setSearchResults([]);
                    setManualInput('');
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', cursor: 'pointer', transition: 'background 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(139, 92, 246, 0.2)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                >
                  <img src={item.thumbnail} alt="" style={{ width: '60px', height: '34px', objectFit: 'cover', borderRadius: '4px' }} />
                  <span style={{ fontSize: '13px', color: 'white', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</span>
                  <span style={{ fontSize: '11px', color: '#a78bfa', padding: '2px 6px', background: 'rgba(139, 92, 246, 0.3)', borderRadius: '4px' }}>▶ Reproducir</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reproductor mutante (nunca cambia su lugar en el JSX tree) */}
        {isWebEmbed ? (
          <div className={styles.embedContainer} style={{ flex: (!isExpanded && pipMode) ? 1 : 'none' }}>
            <iframe
              ref={iframeRef}
              src={embedUrl}
              title={media.title || "Media Player"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className={styles.audioContainer}>
            <div className={styles.audioVisualizer}>
              <Music size={36} color="white" />
            </div>
            <div style={{ color: '#e5e7eb', fontSize: '15px', fontWeight: 500 }}>
              {media.title || 'Audio Local / MP3'}
            </div>
            <audio
              ref={audioRef}
              src={media.url}
              controls={isExpanded}
              autoPlay
              style={{ width: '90%' }}
            />
          </div>
        )}

        {/* Footer en modo Expandido */}
        {isExpanded && (
          <div className={styles.expandedFooter}>
            <span style={{ color: '#9ca3af', fontSize: '12px' }}>
              💡 Reproduciendo en segundo plano de Orbit
            </span>
            <button className={styles.localFileBtn} onClick={handleOpenLocalFile}>
              <FolderOpen size={14} /> Cargar MP3 Local
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default MediaPlayerExpanded;
