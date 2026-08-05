import { useEffect, useState } from 'react';

/**
 * "Add DesiZoom to your home screen."
 *
 * A home-screen icon is worth a lot for a local app — it turns a link someone
 * was sent once into something they can return to. But installing can never be
 * automatic, and the two platforms differ:
 *
 *   Android / Chrome / Edge — the browser fires `beforeinstallprompt`, which we
 *     capture and replay when the user taps our button. Real one-tap install.
 *
 *   iOS / Safari — Apple exposes no install API at all. The only route is
 *     Share → Add to Home Screen, done by hand, so all we can do is show them
 *     where. Worth doing anyway: a large share of this audience is on iPhone.
 *
 * Deliberately unpushy: nothing shows for the first 30 seconds, nothing shows
 * if the app is already installed, and dismissing hides it for 30 days rather
 * than forever — someone who says "not now" often means it.
 */

const DISMISS_KEY = 'dz_install_dismissed';
const DISMISS_DAYS = 30;
const DELAY_MS = 30_000;

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function recentlyDismissed(): boolean {
  const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
  if (!at) return false;
  return Date.now() - at < DISMISS_DAYS * 86_400_000;
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as unknown as { standalone?: boolean }).standalone === true;
}

function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua)
    // iPadOS 13+ reports as Mac; touch points give it away
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const safari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return ios && safari;
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [showIos, setShowIos] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();            // stop Chrome's own mini-infobar
      const ev = e as InstallEvent;
      setTimeout(() => setDeferred(ev), DELAY_MS);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    // Safari never fires the event, so surface the manual instructions instead.
    let t: number | undefined;
    if (isIosSafari()) t = window.setTimeout(() => setShowIos(true), DELAY_MS);

    const onInstalled = () => { setGone(true); localStorage.setItem(DISMISS_KEY, String(Date.now())); };
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      if (t) clearTimeout(t);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setGone(true);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;      // accepted or dismissed — either way we're done asking
    setDeferred(null);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  };

  if (gone || (!deferred && !showIos)) return null;

  return (
    <div
      role="dialog"
      aria-label="Add DesiZoom to your home screen"
      style={{
        position: 'sticky', bottom: 0, zIndex: 92,
        background: 'white', borderTop: '2px solid #ea580c',
        boxShadow: '0 -4px 16px rgba(0,0,0,0.10)', padding: '12px 16px',
      }}
    >
      <div style={{ maxWidth: 1180, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <img
          src="/icons/icon-192.png" alt=""
          style={{ width: 40, height: 40, borderRadius: 10, flex: '0 0 40px' }}
        />

        <div style={{ flex: 1, minWidth: 170 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Add DesiZoom to your home screen</div>
          {/* Lead with the reason, not the mechanism. Order alerts are the
              concrete benefit — and on iOS, installing is the only way push
              notifications work at all. */}
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            {showIos
              ? <>Get order alerts — tap <strong>Share</strong> then <strong>Add to Home Screen</strong></>
              : 'Get order alerts and open it like an app. No download.'}
          </div>
        </div>

        {deferred && (
          <button
            onClick={install}
            style={{ fontSize: 13, fontWeight: 700, padding: '8px 18px', borderRadius: 20, border: 'none', background: '#ea580c', color: 'white', cursor: 'pointer' }}
          >
            Add
          </button>
        )}

        {/* Quiet ✕ rather than a "Not now" button — it doesn't compete with
            Add, but still lets people close it. A sticky bar with no way out
            is worse than no bar, especially on iOS where the banner can only
            give instructions and not actually install anything. */}
        <button
          onClick={dismiss}
          aria-label="Close"
          style={{ fontSize: 17, lineHeight: 1, padding: '6px 8px', borderRadius: 20, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--muted)' }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
