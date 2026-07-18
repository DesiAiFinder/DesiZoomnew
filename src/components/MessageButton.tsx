import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { startConversation } from '../services/supabase';

interface Props {
  postId: string;
  sellerId: string;
  onAuthNeeded?: () => void;
}

export default function MessageButton({ postId, sellerId, onAuthNeeded }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  if (user?.id === sellerId) return null; // Can't message yourself

  const handleClick = async () => {
    if (!user) { onAuthNeeded?.(); return; }
    setLoading(true);
    try {
      await startConversation(postId, user.id, sellerId);
      navigate('/messages');
    } catch { /* noop */ }
    setLoading(false);
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 12, fontWeight: 700, padding: '5px 14px',
        background: '#eef4ff', color: '#1e40af', borderRadius: 20,
        border: 'none', cursor: 'pointer',
      }}
    >
      💬 {loading ? 'Opening…' : 'Message'}
    </button>
  );
}
