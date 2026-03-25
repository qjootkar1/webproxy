import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';
import Navbar from '../components/Navbar';
import VideoCard, { VideoCardSkeleton } from '../components/VideoCard';
import styles from '../styles/Home.module.css';
import sStyles from '../styles/Search.module.css';

const SORT_OPTIONS = [
  { label: '관련순', value: 'relevance' },
  { label: '최신순', value: 'upload_date' },
  { label: '조회수', value: 'view_count' },
  { label: '평점순', value: 'rating' },
];

export default function Search() {
  const router = useRouter();
  const { q } = router.query;

  const [results, setResults] = useState([]);
  const [loading, setLoading]  = useState(false);
  const [page, setPage]        = useState(1);
  const [sortBy, setSortBy]    = useState('relevance');
  const [hasMore, setHasMore]  = useState(true);
  const prevQ = useRef('');

  const fetchResults = async (query, p, sort, reset = false) => {
    if (!query) return;
    setLoading(true);
    try {
      const res  = await fetch(`/api/search?q=${encodeURIComponent(query)}&page=${p}&sort_by=${sort}`);
      const data = await res.json();
      const items = Array.isArray(data) ? data.filter(v => v.type === 'video' || !v.type) : [];
      setResults(prev => reset ? items : [...prev, ...items]);
      setHasMore(items.length >= 20);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // New query
  useEffect(() => {
    if (!q) return;
    if (q !== prevQ.current) {
      prevQ.current = q;
      setPage(1);
      setResults([]);
      fetchResults(q, 1, sortBy, true);
    }
  }, [q]);

  const handleSort = (s) => {
    setSortBy(s);
    setPage(1);
    setResults([]);
    fetchResults(q, 1, s, true);
  };

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchResults(q, next, sortBy);
  };

  return (
    <>
      <Head>
        <title>{q ? `"${q}" 검색 결과` : '검색'} — nadeko.tv</title>
      </Head>
      <Navbar />
      <main className={styles.main}>
        {q && (
          <div className={sStyles.header}>
            <h1 className={sStyles.title}>
              <span className={sStyles.query}>"{q}"</span> 검색 결과
            </h1>
            <div className={sStyles.sortWrap}>
              <span className={sStyles.sortLabel}>정렬:</span>
              {SORT_OPTIONS.map(s => (
                <button
                  key={s.value}
                  className={`${sStyles.sortBtn} ${sortBy === s.value ? sStyles.sortActive : ''}`}
                  onClick={() => handleSort(s.value)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {!q && !loading && (
          <div className={sStyles.empty}>
            <p className={sStyles.emptyIcon}>🔍</p>
            <p>검색어를 입력하세요</p>
          </div>
        )}

        <div className={styles.grid}>
          {results.map((v, i) => (
            <VideoCard key={`${v.videoId}-${i}`} video={v} priority={i < 4} />
          ))}
          {loading && Array.from({ length: 12 }).map((_, i) => (
            <VideoCardSkeleton key={`sk-${i}`} />
          ))}
        </div>

        {!loading && results.length > 0 && hasMore && (
          <div className={sStyles.moreWrap}>
            <button className={sStyles.moreBtn} onClick={loadMore}>
              더 보기
            </button>
          </div>
        )}

        {!loading && results.length === 0 && q && (
          <div className={sStyles.empty}>
            <p className={sStyles.emptyIcon}>😕</p>
            <p>결과가 없습니다. 다른 검색어를 시도해보세요.</p>
          </div>
        )}
      </main>
    </>
  );
}
