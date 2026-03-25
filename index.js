import Head from 'next/head';
import { useState } from 'react';
import Navbar from '../components/Navbar';
import VideoCard, { VideoCardSkeleton } from '../components/VideoCard';
import { invFetch } from '../lib/api';
import styles from '../styles/Home.module.css';

const CATEGORIES = [
  { label: '전체', value: 'default' },
  { label: '음악', value: 'Music' },
  { label: '게임', value: 'Gaming' },
  { label: '영화', value: 'Movies' },
  { label: '뉴스', value: 'News' },
];

export default function Home({ trending = [], popular = [] }) {
  const [activeTab, setActiveTab] = useState('trending');

  const videos = activeTab === 'trending' ? trending : popular;

  return (
    <>
      <Head>
        <title>nadeko.tv — YouTube 프라이버시 클라이언트</title>
        <meta name="description" content="inv.nadeko.net 기반의 빠르고 깔끔한 YouTube 클라이언트" />
      </Head>

      <Navbar />

      <main className={styles.main}>
        {/* Hero */}
        <div className={styles.hero}>
          <h1 className={styles.heroTitle}>
            <span className={styles.heroAccent}>광고 없는</span> YouTube
          </h1>
          <p className={styles.heroSub}>Invidious 기반 · 추적 없음 · 빠른 로딩</p>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'trending' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('trending')}
          >
            🔥 트렌딩
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'popular' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('popular')}
          >
            ⭐ 인기순
          </button>
        </div>

        {/* Grid */}
        <div className={styles.grid}>
          {videos.length > 0
            ? videos.map((v, i) => (
                <VideoCard key={v.videoId} video={v} priority={i < 6} />
              ))
            : Array.from({ length: 24 }).map((_, i) => (
                <VideoCardSkeleton key={i} />
              ))
          }
        </div>
      </main>

      <footer className={styles.footer}>
        <p>
          Powered by{' '}
          <a href="https://inv.nadeko.net" target="_blank" rel="noopener noreferrer">
            inv.nadeko.net
          </a>{' '}
          · Invidious
        </p>
      </footer>
    </>
  );
}

// ISR: 5분마다 재생성
export async function getStaticProps() {
  try {
    const [trending, popular] = await Promise.allSettled([
      invFetch('/trending?region=KR', { revalidate: 300 }),
      invFetch('/popular', { revalidate: 600 }),
    ]);

    return {
      props: {
        trending: trending.status === 'fulfilled' ? (trending.value || []).slice(0, 48) : [],
        popular:  popular.status  === 'fulfilled' ? (popular.value  || []).slice(0, 48) : [],
      },
      revalidate: 300,
    };
  } catch (e) {
    return { props: { trending: [], popular: [] }, revalidate: 60 };
  }
}
