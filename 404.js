import Head from 'next/head';
import Link from 'next/link';
import Navbar from '../components/Navbar';

export default function NotFound() {
  return (
    <>
      <Head><title>404 — nadeko.tv</title></Head>
      <Navbar />
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '60vh', gap: '16px',
        color: 'var(--text2)', textAlign: 'center', padding: '20px',
      }}>
        <div style={{ fontSize: '64px', lineHeight: 1 }}>▶</div>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text)' }}>404</h1>
        <p style={{ fontSize: '15px' }}>페이지를 찾을 수 없습니다.</p>
        <Link href="/" style={{
          color: 'var(--accent)', fontSize: '14px',
          padding: '8px 20px', border: '1px solid var(--accent)',
          borderRadius: '8px', marginTop: '8px',
        }}>
          ← 홈으로
        </Link>
      </div>
    </>
  );
}
