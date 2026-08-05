import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Navigation from './Navigation';
import Footer from './Footer';
import AuthModal from './AuthModal';
import NotificationPrompt from './NotificationPrompt';
import NewOrderAlert from './NewOrderAlert';
import InstallPrompt from './InstallPrompt';

export default function Layout() {
  const [authOpen, setAuthOpen] = useState(false);
  const navigate = useNavigate();

  const handleSearch = (q: string) => {
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div className="shell">
      <Navigation onAuthOpen={() => setAuthOpen(true)} onSearch={handleSearch} />
      <NotificationPrompt />
      <main>
        <Outlet context={{ onAuthOpen: () => setAuthOpen(true) }} />
      </main>
      <Footer />
      {/* Sticky alert for business owners with unstarted orders. Renders null
          for everyone else. Push covers the app-closed case. */}
      <NewOrderAlert />
      {/* Add-to-home-screen invite. Renders null if already installed,
          recently dismissed, or the platform can't install. */}
      <InstallPrompt />
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </div>
  );
}
