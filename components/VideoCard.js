import Link from 'next/link';
import { useState, useCallback } from 'react';
import { getThumbnail, formatDuration, formatViews, formatRelative } from '../lib/api';
import styles from './VideoCard.module.css';

export default function VideoCard({ video, priority = false }) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  if (!video) return null;

  const {
    videoId,
    title,
    author,
    authorId,
    lengthSeconds,
    viewCount,
    published,
    publishedText,
    videoThumbnails,
  } = video;

  // Best thumbnail: prefer mqdefault from Invidious proxy
  const thumb = !imgError
    ? getThumbnail(videoId, 'mqdefault')
    : getThumbnail(videoId, 'hqdefault');

  const duration = formatDuration(lengthSeconds);
  const views    = formatViews(viewCount);
  const ago      = publishedText || formatRelative(published);

  return (
    <div className={styles.card}>
      {/* Thumbnail */}
      <Link href={`/watch/${videoId}`} className={styles.thumbWrap} prefetch={false}>
        <div className={styles.thumbBg}>
          {!imgLoaded && <div className={`${styles.thumbSkeleton} skeleton`} />}
          <img
            src={thumb}
            alt={title}
            className={`${styles.thumb} ${imgLoaded ? styles.thumbVisible : ''}`}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            onLoad={() => setImgLoaded(true)}
            onError={() => { setImgError(true); setImgLoaded(true); }}
          />
        </div>
        {duration && <span className={styles.duration}>{duration}</span>}
      </Link>

      {/* Meta */}
      <div className={styles.meta}>
        <div className={styles.avatar}>
          {author ? author[0].toUpperCase() : '?'}
        </div>
        <div className={styles.info}>
          <Link href={`/watch/${videoId}`} className={styles.title} prefetch={false}>
            {title}
          </Link>
          <div className={styles.sub}>
            {authorId ? (
              <span className={styles.author}>{author}</span>
            ) : (
              <span className={styles.author}>{author}</span>
            )}
            <span className={styles.dot}>·</span>
            {views && <span>{views}회</span>}
            {ago && <><span className={styles.dot}>·</span><span>{ago}</span></>}
          </div>
        </div>
      </div>
    </div>
  );
}

// Skeleton placeholder
export function VideoCardSkeleton() {
  return (
    <div className={styles.card}>
      <div className={styles.thumbWrap}>
        <div className={`${styles.thumbBg} skeleton`} style={{borderRadius: '8px'}} />
      </div>
      <div className={styles.meta}>
        <div className={`${styles.avatar} skeleton`} style={{background: 'none'}} />
        <div className={styles.info} style={{gap: '6px'}}>
          <div className="skeleton" style={{height: 14, borderRadius: 4, width: '85%'}} />
          <div className="skeleton" style={{height: 14, borderRadius: 4, width: '60%'}} />
          <div className="skeleton" style={{height: 12, borderRadius: 4, width: '40%'}} />
        </div>
      </div>
    </div>
  );
}
