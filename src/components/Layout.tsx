import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Navigation from './Navigation';
import Footer from './Footer';
import AuthModal from './AuthModal';
import NotificationPrompt from './NotificationPrompt';

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
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </div>
  );
}
