import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchConversations, fetchMessages, sendMessage, markMessagesRead, supabase,
} from '../services/supabase';
import type { Conversation, Message } from '../types';

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function Messages() {
  const { user } = useAuth();
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load conversations
  useEffect(() => {
    if (!user) return;
    fetchConversations(user.id)
      .then((d) => setConvs(d as Conversation[]))
      .finally(() => setLoading(false));
  }, [user]);

  // Load messages + subscribe to realtime for active conversation
  useEffect(() => {
    if (!active || !user) return;
    fetchMessages(active.id).then((d) => setMessages(d as Message[]));
    markMessagesRead(active.id, user.id);

    const channel = supabase
      .channel(`messages-${active.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${active.id}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
          if ((payload.new as Message).sender_id !== user.id) {
            markMessagesRead(active.id, user.id);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [active, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const submit = async () => {
    if (!text.trim() || !active || !user) return;
    const body = text.trim();
    setText('');
    await sendMessage(active.id, user.id, body).catch(() => setText(body));
  };

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--muted)' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
        <p>Sign in to see your messages.</p>
      </div>
    );
  }

  return (
    <>
      <div className="page-hero" style={{ background: 'linear-gradient(120deg,#0a1a2a,#061018)' }}>
        <div className="eyebrow">💬 Messages</div>
        <h1>Your Conversations</h1>
        <p>Chat with buyers and sellers about listings.</p>
      </div>

      <div style={{ display: 'flex', gap: 0, padding: '24px 32px 48px', minHeight: 480 }}>

        {/* Conversation list */}
        <div style={{ flex: '0 0 280px', borderRight: '1px solid var(--border)', paddingRight: 16 }}>
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 56, marginBottom: 8, borderRadius: 10 }} />
            ))
          ) : convs.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 13, padding: '20px 0' }}>
              No conversations yet. Message a seller from any marketplace listing.
            </div>
          ) : (
            convs.map((c) => (
              <div
                key={c.id}
                onClick={() => setActive(c)}
                style={{
                  padding: '12px 12px', borderRadius: 10, cursor: 'pointer', marginBottom: 4,
                  background: active?.id === c.id ? 'var(--accent-soft)' : 'transparent',
                }}
              >
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: '#f0f0f0', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {c.post?.image_urls?.[0]
                      ? <img src={c.post.image_urls[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : '🛍️'}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {c.post?.title || 'Listing'}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {c.buyer_id === user.id ? 'You are the buyer' : 'You are the seller'} · {timeAgo(c.created_at)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Chat panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', paddingLeft: 20 }}>
          {!active ? (
            <div style={{ margin: 'auto', color: 'var(--muted)', textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>💬</div>
              <p style={{ fontSize: 14 }}>Select a conversation</p>
            </div>
          ) : (
            <>
              <div style={{ fontWeight: 700, fontSize: 15, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                {active.post?.title || 'Conversation'}
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 4px', display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400 }}>
                {messages.map((m) => {
                  const mine = m.sender_id === user.id;
                  return (
                    <div key={m.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
                      <div style={{
                        padding: '8px 13px', borderRadius: 14, fontSize: 13.5, lineHeight: 1.45,
                        background: mine ? '#e07820' : '#f1f2f4',
                        color: mine ? 'white' : 'var(--text)',
                        borderBottomRightRadius: mine ? 4 : 14,
                        borderBottomLeftRadius: mine ? 14 : 4,
                      }}>
                        {m.body}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2, textAlign: mine ? 'right' : 'left' }}>
                        {timeAgo(m.created_at)}
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <div style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                  placeholder="Type a message…"
                  style={{ flex: 1, height: 40, border: '1px solid var(--border)', borderRadius: 20, padding: '0 16px', fontSize: 13.5 }}
                />
                <button className="btn-primary" style={{ borderRadius: 20 }} onClick={submit}>Send</button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
