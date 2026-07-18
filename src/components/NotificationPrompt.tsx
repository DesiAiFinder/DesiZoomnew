// Small banner that asks users to enable push notifications (PWA)
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export default function NotificationPrompt() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || !VAPID_PUBLIC_KEY) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (Notification.permission === 'granted' || Notification.permission === 'denied') return;
    if (localStorage.getItem('dz_push_dismissed')) return;
    setShow(true);
  }, [user]);

  const enable = async () => {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setShow(false); return; }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
      });

      await supabase.from('push_subscriptions').upsert({
        user_id: user!.id,
        subscription: sub.toJSON(),
        endpoint: sub.endpoint,
      }, { onConflict: 'endpoint' });

      setShow(false);
    } catch { /* noop */ }
    setBusy(false);
  };

  const dismiss = () => {
    localStorage.setItem('dz_push_dismissed', '1');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      padding: '10px 16px', background: '#eef4ff', border: '1px solid #c8d8f0',
      borderRadius: 10, margin: '12px 32px 0', fontSize: 13,
    }}>
      <span>🔔 Get notified about new deals & messages in your city</span>
      <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
        <button onClick={enable} disabled={busy} className="btn-primary" style={{ fontSize: 12, padding: '6px 14px' }}>
          {busy ? 'Enabling…' : 'Enable'}
        </button>
        <button onClick={dismiss} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 12 }}>
          Not now
        </button>
      </div>
    </div>
  );
}
