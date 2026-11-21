import Link from 'next/link';

export default function NotFound() {
  return <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: '#080e1c', color: '#eef3ff', padding: 24 }}>
    <div>
      <h1>Nothing here yet.</h1>
      <p>Return to the Rep & Lap dashboard.</p>
      <Link href="/" style={{ color: '#a995ff' }}>Go home</Link>
    </div>
  </main>;
}
