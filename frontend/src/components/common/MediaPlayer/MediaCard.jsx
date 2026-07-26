import React from 'react';
import { Play, Music, Video, ExternalLink } from 'lucide-react';
import styles from './MediaPlayer.module.scss';
import useMediaStore from '../../../store/mediaStore';

const MediaCard = ({ code }) => {
  const { playMedia } = useMediaStore();

  // Parse key: value from code block
  const lines = (code || '').split('\n');
  const mediaData = { type: 'youtube', url: '', title: 'Recomendación Multimedia' };

  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('type:')) {
      mediaData.type = trimmed.split('type:')[1]?.trim()?.toLowerCase() || 'youtube';
    } else if (trimmed.startsWith('url:')) {
      mediaData.url = trimmed.split('url:')[1]?.trim() || '';
    } else if (trimmed.startsWith('title:')) {
      mediaData.title = trimmed.split('title:')[1]?.trim() || 'Contenido Multimedia';
    }
  });

  if (!mediaData.url) {
    return (
      <div style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', color: '#9ca3af', fontSize: '12px' }}>
        ⚠️ Tarjeta multimedia sin URL válida.
      </div>
    );
  }

  const isVideo = mediaData.type === 'youtube' || mediaData.type === 'video';

  const handlePlayInOrbit = () => {
    playMedia({
      type: mediaData.type,
      url: mediaData.url,
      title: mediaData.title
    });
  };

  return (
    <div className={styles.mediaCard}>
      <div className={styles.cardInfo}>
        <div className={styles.cardIcon}>
          {isVideo ? <Video size={20} /> : <Music size={20} />}
        </div>
        <div className={styles.cardText}>
          <h4>{mediaData.title}</h4>
          <span>{mediaData.type.toUpperCase()} • Listo para reproducción integrada</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <a 
          href={mediaData.url} 
          target="_blank" 
          rel="noreferrer" 
          style={{ color: '#9ca3af', padding: '8px', display: 'flex', alignItems: 'center', textDecoration: 'none' }}
          title="Abrir en navegador externo"
        >
          <ExternalLink size={16} />
        </a>

        <button className={styles.playOrbitBtn} onClick={handlePlayInOrbit}>
          <Play size={14} fill="white" /> Reproducir en Orbit
        </button>
      </div>
    </div>
  );
};

export default MediaCard;
