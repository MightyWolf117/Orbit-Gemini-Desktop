import React from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, X, Music, Video } from 'lucide-react';
import styles from './MediaPlayer.module.scss';
import useMediaStore from '../../../store/mediaStore';

const MediaPlayerFloating = () => {
  const { currentMedia, isPlaying, volume, togglePlay, setVolume, toggleExpanded, closeMedia, pipMode, togglePip } = useMediaStore();

  if (!currentMedia) {
    return (
      <div 
        className={styles.floatingContainer} 
        style={{ cursor: 'pointer', opacity: 0.9, padding: '8px 14px' }}
        onClick={toggleExpanded}
        title="Abrir Reproductor y Búsqueda Multimedia de Orbit"
      >
        <div className={styles.mediaIcon} style={{ width: '30px', height: '30px' }}>
          <Music size={16} />
        </div>
        <div className={styles.titleArea} style={{ marginRight: 0 }}>
          <div className={styles.titleText} style={{ fontSize: '13px' }}>Reproductor</div>
        </div>
      </div>
    );
  }

  const isVideo = currentMedia.type === 'youtube' || currentMedia.type === 'video' || (currentMedia.url && (currentMedia.url.includes('youtube') || currentMedia.url.includes('youtu.be') || currentMedia.url.includes('spotify')));

  return (
    <div className={styles.floatingContainer}>
      <div className={styles.mediaIcon}>
        {isVideo ? <Video size={18} /> : <Music size={18} />}
      </div>

      <div className={styles.titleArea}>
        <div className={styles.titleText}>{currentMedia.title || 'Música de fondo'}</div>
        <div className={styles.subText}>{currentMedia.type || 'audio'}</div>
      </div>

      <div className={styles.controls}>
        <button 
          className={`${styles.ctrlBtn} ${styles.playBtn}`} 
          onClick={togglePlay}
          title={isPlaying ? "Pausar" : "Reproducir"}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>

        <div className={styles.volumeContainer}>
          <button 
            className={styles.ctrlBtn} 
            onClick={() => setVolume(volume === 0 ? 80 : 0)} 
            style={{ width: '24px', height: '24px' }}
            title="Volumen"
          >
            {volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={volume} 
            onChange={(e) => setVolume(Number(e.target.value))}
            className={styles.slider}
            title={`Volumen: ${volume}%`}
          />
        </div>

        {isVideo && (
          <button 
            className={styles.ctrlBtn} 
            onClick={togglePip} 
            title={pipMode ? "Ocultar ventana de video (Modo Solo Audio)" : "Mostrar ventana de video (Picture in Picture)"}
            style={{ color: pipMode ? '#8b5cf6' : '#9ca3af', fontWeight: 'bold' }}
          >
            🔲
          </button>
        )}

        <button 
          className={styles.ctrlBtn} 
          onClick={toggleExpanded}
          title="Expandir vista y gestionar página de reproducción"
        >
          <Maximize2 size={15} />
        </button>

        <button 
          className={`${styles.ctrlBtn} ${styles.closeBtn}`} 
          onClick={closeMedia}
          title="Cerrar reproductor"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
};

export default MediaPlayerFloating;
