import { useState } from 'react';
import { getEmbedUrl } from '../lib/api';
import styles from './VideoPlayer.module.css';

export default function VideoPlayer({ videoId, autoplay = true }) {
  const [loaded, setLoaded] = useState(false);

  const embedUrl = getEmbedUrl(videoId, {
    autoplay,
    quality: 'hd720',
    local: 'true',
    params: {
      iv_load_policy: '3',   // disable annotations
      modestbranding: '1',
      rel: '0',
    }
  });

  return (
    <div className={styles.wrapper}>
      {!loaded && (
        <div className={`${styles.placeholder} skeleton`}>
          <div className={styles.playIcon}>▶</div>
        </div>
      )}
      <iframe
        className={`${styles.iframe} ${loaded ? styles.visible : ''}`}
        src={embedUrl}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        onLoad={() => setLoaded(true)}
        loading="eager"
        title="Video Player"
      />
    </div>
  );
}
