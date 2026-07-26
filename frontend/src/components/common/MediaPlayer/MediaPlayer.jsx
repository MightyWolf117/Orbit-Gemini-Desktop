import React, { useRef, useEffect } from 'react';
import useMediaStore from '../../../store/mediaStore';
import MediaPlayerFloating from './MediaPlayerFloating';
import MediaPlayerExpanded from './MediaPlayerExpanded';

const MediaPlayer = () => {
  const { currentMedia, isPlaying, volume } = useMediaStore();
  const hiddenAudioRef = useRef(null);

  // Sincronizar volumen
  useEffect(() => {
    if (hiddenAudioRef.current) {
      hiddenAudioRef.current.volume = volume / 100;
    }
  }, [volume]);

  // Sincronizar Play/Pause
  useEffect(() => {
    if (!hiddenAudioRef.current || !currentMedia) return;
    if (isPlaying) {
      hiddenAudioRef.current.play().catch(e => console.log("Auto-play prevented or error:", e));
    } else {
      hiddenAudioRef.current.pause();
    }
  }, [isPlaying, currentMedia]);

  // Si no es un embed web (es mp3 o stream de audio directo), necesitamos un audio en segundo plano cuando esté flotando
  const isAudioFile = currentMedia?.type === 'mp3' || (currentMedia?.url && (currentMedia.url.endsWith('.mp3') || currentMedia.url.endsWith('.wav') || currentMedia.url.endsWith('.ogg')));

  return (
    <>
      <MediaPlayerFloating />
      <MediaPlayerExpanded audioRef={hiddenAudioRef} />
    </>
  );
};

export default MediaPlayer;
