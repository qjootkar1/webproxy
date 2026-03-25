import '../styles/globals.css';
import Head from 'next/head';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0a0a0a" />
        {/* Preconnect to instance for faster video loads */}
        <link rel="preconnect" href="https://inv.nadeko.net" />
        <link rel="dns-prefetch" href="https://inv.nadeko.net" />
        <link rel="preconnect" href="https://i.ytimg.com" crossOrigin="anonymous" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
