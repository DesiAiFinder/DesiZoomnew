import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Navigation from './Navigation';
import Footer from './Footer';
import AuthModal from './AuthModal';

export default function Layout() {
  const [authOpen, setAuthOpen] = useState(false);
  const navigate = useNavigate();

  const handleSearch = (q: string) => {
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div className="shell">
      <Navigation onAuthOpen={() => setAuthOpen(true)} onSearch={handleSearch} />
      <main>
        <Outlet context={{ onAuthOpen: () => setAuthOpen(true) }} />
      </main>
      <Footer />
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </div>
  );
}
