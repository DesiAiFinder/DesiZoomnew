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

  // An empty search used to do nothing at all. That was invisible when the
  // only trigger was Enter; now there's a Search button, and a button that
  // silently does nothing reads as broken. Send them to the search page,
  // where the category chips give them somewhere to start.
  const handleSearch = (q: string) => {
    const term = q.trim();
    navigate(term ? `/search?q=${encodeURIComponent(term)}` : '/search');
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
