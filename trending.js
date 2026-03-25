import Head from 'next/head';
import { useState } from 'react';
import Navbar from '../components/Navbar';
import VideoCard, { VideoCardSkeleton } from '../components/VideoCard';
import { invFetch } from '../lib/api';
import styles from '../styles/Home.module.css';
import pageStyles from '../styles/Trending.module.css';

const REGIONS = [
  { label: '🇰🇷 한국', value: 'KR' },
  { label: '🇺🇸 미국', value: 'US' },
  { label: '🇯🇵 일본', value: 'JP' },
  { label: '🇬🇧 영국', value: 'GB' },
];

const TYPES = [
  { label: '기본', value: 'default' },
  { label: '음악', value: 'Music' },
  { label: '게임', value: 'Gaming' },
  { label: '영화', value: 'Movies' },
  { label: '뉴스', value: 'News' },
];

export default function Trending({ initialVideos = [] }) {
  const [videos, setVideos] = useState(initialVideos);
  const [region, setRegion] = useState('KR');
  const [type, setType] = useState('default');
  const [loading, setLoading] = useState(false);

  const fetchTrending = async (r, t) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/trending?region=${r}&type=${t}`);
      const data = await res.json();
      setVideos(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRegion = (r) => {
    setRegion(r);
    fetchTrending(r, type);
  };

  const handleType = (t) => {
    setType(t);
    fetchTrending(region, t);
  };

  return (
    <>
      <Head>
        <title>트렌딩 — nadeko.tv</title>
      </Head>
      <Navbar />
      <main className={styles.main}>
        <div className={pageStyles.header}>
          <h1 className={pageStyles.title}>🔥 트렌딩</h1>

          {/* Region filter */}
          <div className={pageStyles.filters}>
            <div className={pageStyles.filterGroup}>
              {REGIONS.map(r => (
                <button
                  key={r.value}
                  className={`${pageStyles.chip} ${region === r.value ? pageStyles.chipActive : ''}`}
                  onClick={() => handleRegion(r.value)}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <div className={pageStyles.filterGroup}>
              {TYPES.map(t => (
                <button
                  key={t.value}
                  className={`${pageStyles.chip} ${type === t.value ? pageStyles.chipActive : ''}`}
                  onClick={() => handleType(t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.grid}>
          {loading
            ? Array.from({ length: 24 }).map((_, i) => <VideoCardSkeleton key={i} />)
            : videos.map((v, i) => <VideoCard key={v.videoId} video={v} priority={i < 4} />)
          }
        </div>
      </main>
    </>
  );
}

export async function getStaticProps() {
  try {
    const data = await invFetch('/trending?region=KR', { revalidate: 300 });
    return {
      props: { initialVideos: (data || []).slice(0, 48) },
      revalidate: 300,
    };
  } catch (e) {
    return { props: { initialVideos: [] }, revalidate: 60 };
  }
}
