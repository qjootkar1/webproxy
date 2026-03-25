import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import styles from './Navbar.module.css';

export default function Navbar() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

  // Populate search box from URL on search page
  useEffect(() => {
    if (router.query.q) setQuery(router.query.q);
  }, [router.query.q]);

  // Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    inputRef.current?.blur();
  };

  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        {/* Logo */}
        <Link href="/" className={styles.logo}>
          <span className={styles.logoIcon}>▶</span>
          <span className={styles.logoText}>nadeko<span className={styles.logoAccent}>.tv</span></span>
        </Link>

        {/* Search */}
        <form className={`${styles.searchForm} ${focused ? styles.focused : ''}`} onSubmit={handleSearch}>
          <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            ref={inputRef}
            type="search"
            className={styles.searchInput}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="검색 (Ctrl+K)"
            autoComplete="off"
          />
          {query && (
            <button type="button" className={styles.clearBtn} onClick={() => setQuery('')}>
              ✕
            </button>
          )}
          <button type="submit" className={styles.searchBtn}>검색</button>
        </form>

        {/* Nav links */}
        <div className={styles.links}>
          <Link href="/" className={`${styles.link} ${router.pathname === '/' ? styles.active : ''}`}>홈</Link>
          <Link href="/trending" className={`${styles.link} ${router.pathname === '/trending' ? styles.active : ''}`}>트렌딩</Link>
          <a
            href="https://inv.nadeko.net"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.link}
          >원본 ↗</a>
        </div>
      </div>
    </nav>
  );
}
