import { useEffect, useState } from 'react';
import { ToastProvider } from './components/Toast';
import PublicApp from './pages/PublicApp';
import AdminApp from './pages/AdminApp';
import Splash from './pages/Splash';

export default function App() {
  const [splashDone, setSplashDone] = useState(() => sessionStorage.getItem('agenda_splash_done') === '1');
  const [isAdmin, setIsAdmin] = useState(() => window.location.hash.startsWith('#admin'));

  useEffect(() => {
    const onHash = () => setIsAdmin(window.location.hash.startsWith('#admin'));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const goToAdmin = () => { window.location.hash = '#admin'; setIsAdmin(true); };
  const goToPublic = () => { window.location.hash = ''; setIsAdmin(false); };

  return (
    <ToastProvider>
      {!splashDone && !isAdmin && (
        <Splash
          onDone={() => {
            sessionStorage.setItem('agenda_splash_done', '1');
            setSplashDone(true);
          }}
        />
      )}

      {isAdmin ? (
        <AdminApp onExitToPublic={goToPublic} />
      ) : (
        <>
          <PublicApp />
          {/* Toggle Admin en la esquina superior derecha */}
          <button
            onClick={goToAdmin}
            className="admin-toggle"
            title="Ir al panel admin"
            aria-label="Ir al panel admin"
          >
            Admin
          </button>
        </>
      )}
    </ToastProvider>
  );
}
