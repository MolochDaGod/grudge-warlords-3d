import { createRoot } from 'react-dom/client';
import { useState, useEffect, lazy, Suspense } from 'react';
import App from './App';

const ToonAdmin = lazy(() => import('./pages/ToonAdmin'));

function Root() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  if (path === '/toonadmin') {
    return (
      <Suspense fallback={<div style={{ color: '#c5a059', background: '#0a0a1a', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>Loading ToonAdmin...</div>}>
        <ToonAdmin />
      </Suspense>
    );
  }

  return <App />;
}

createRoot(document.getElementById('root')!).render(<Root />);
