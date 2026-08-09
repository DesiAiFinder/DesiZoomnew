import { useEffect, useState } from 'react';
import { adminFetchFinance } from '../services/supabase';
import type { PaymentRow, OrderTaxRow, Jurisdiction } from '../services/supabase';

/**
 * The Money tab: what came in, what went out, what we kept, what we owe.
 *
 * Deliberately separates three things people conflate:
 *   Gross volume     — what customers paid. Never our money.
 *   Our commission   — gross revenue to DesiZoom.
 *   Net after Stripe — what actually lands, and the number that matters.
 *
 * Tax is shown separately again, because tax is never revenue. It's held for
 * a state, whether we remit it or the merchant does.
 */

const money = (cents: number) =>
  `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Stripe's published US card rate. Not stored per-charge, so estimated. */
const stripeFee = (amountCents: number) => Math.round(amountCents * 0.029) + 30;

type Range = 'month' | 'ytd' | 'all';

const KIND_LABEL: Record<string, string> = {
  sale: '🛍️ Marketplace', order: '🍛 Food orders', ticket: '🎟️ Tickets',
  booking: '🛠️ Bookings', boost: '🚀 Boosts', lead: '🔓 Leads',
};

export default function AdminMoney() {
  const [data, setData] = useState<{
    payments: PaymentRow[]; orders: OrderTaxRow[]; jurisdictions: Jurisdiction[];
  } | null>(null);
  const [range, setRange] = useState<Range>('month');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { adminFetchFinance().then(setData).catch(() => setData(null)); }, []);

  if (!data) return <div className="skeleton" style={{ height: 220, borderRadius: 12 }} />;

  const now = new Date();
  const from =
    range === 'month' ? new Date(now.getFullYear(), now.getMonth(), 1)
    : range === 'ytd' ? new Date(now.getFullYear(), 0, 1)
    : new Date(0);

  const pays = data.payments.filter((p) => new Date(p.created_at) >= from);
  const ords = data.orders.filter((o) => new Date(o.created_at) >= from);

  const completed = pays.filter((p) => p.status === 'completed');
  const refunded = pays.filter((p) => p.status === 'refunded');

  const gross = completed.reduce((s, p) => s + p.amount_cents, 0);
  const commission = completed.reduce((s, p) => s + (p.commission_cents ?? 0), 0);
  const serviceFees = ords.reduce((s, o) => s + (o.service_fee_cents ?? 0), 0);
  const toMerchants = gross - commission;
  const stripeCost = completed.reduce((s, p) => s + stripeFee(p.amount_cents), 0);
  const net = commission + serviceFees - stripeCost;
  const refundedAmt = refunded.reduce((s, p) => s + p.amount_cents, 0);

  const taxCollected = ords.reduce((s, o) => s + (o.tax_cents ?? 0), 0);
  const taxWeOwe = ords.filter((o) => o.tax_remitted_by === 'platform')
    .reduce((s, o) => s + (o.tax_cents ?? 0), 0);
  const taxMerchantOwes = ords.filter((o) => o.tax_remitted_by === 'merchant')
    .reduce((s, o) => s + (o.tax_cents ?? 0), 0);
  const taxableBasis = ords.reduce((s, o) => s + o.subtotal_cents, 0);

  // Revenue split by what produced it
  const byKind = completed.reduce<Record<string, { count: number; commission: number }>>((acc, p) => {
    const k = p.kind || 'sale';
    acc[k] = acc[k] || { count: 0, commission: 0 };
    acc[k].count += 1;
    acc[k].commission += p.commission_cents ?? 0;
    return acc;
  }, {});

  // Group by local calendar day so a day here matches a day on a bank statement.
  const byDay = pays.reduce<Record<string, typeof pays>>((acc, p) => {
    const d = new Date(p.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    (acc[key] = acc[key] || []).push(p);
    return acc;
  }, {});
  const days = Object.entries(byDay).sort((a, b) => b[0].localeCompare(a[0]));

  const card = {
    background: 'white', border: '1px solid var(--border)',
    borderRadius: 12, padding: '14px 16px',
  } as const;
  const label = { fontSize: 11.5, color: 'var(--muted)', textTransform: 'uppercase' as const, letterSpacing: 0.4 };
  const big = { fontSize: 22, fontWeight: 800, marginTop: 3 };

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {(['month', 'ytd', 'all'] as Range[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            style={{
              fontSize: 12.5, padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
              border: '1px solid ' + (range === r ? '#ea580c' : 'var(--border)'),
              background: range === r ? '#fff7ed' : 'white',
              color: range === r ? '#b84d00' : 'var(--muted)',
              fontWeight: range === r ? 700 : 500, fontFamily: 'inherit',
            }}
          >
            {r === 'month' ? 'This month' : r === 'ytd' ? 'This year' : 'All time'}
          </button>
        ))}
      </div>

      {/* ── What we actually earned ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 12, marginBottom: 16 }}>
        <div style={card}>
          <div style={label}>Gross volume</div>
          <div style={big}>{money(gross)}</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>What customers paid · {completed.length} payments</div>
        </div>
        <div style={card}>
          <div style={label}>Paid to businesses</div>
          <div style={{ ...big, color: '#0f6e56' }}>{money(toMerchants)}</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Direct to their bank via Stripe</div>
        </div>
        <div style={card}>
          <div style={label}>Our revenue</div>
          <div style={big}>{money(commission + serviceFees)}</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
            {money(commission)} commission + {money(serviceFees)} service fees
          </div>
        </div>
        <div style={{ ...card, borderColor: '#ea580c', background: '#fff7ed' }}>
          <div style={label}>Net after Stripe</div>
          <div style={{ ...big, color: net >= 0 ? '#b84d00' : '#dc2626' }}>{money(net)}</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
            Est. Stripe cost {money(stripeCost)}
          </div>
        </div>
      </div>

      {net < 0 && (
        <div style={{ fontSize: 12.5, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 10, padding: '9px 12px', marginBottom: 16 }}>
          Commission isn't covering Stripe's fees. Orders under about $9.70 lose money at 6% —
          a flat customer service fee is the usual fix.
        </div>
      )}

      {/* ── Tax ─────────────────────────────────────────────────────────── */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <strong style={{ fontSize: 14.5 }}>🏛️ Sales tax</strong>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Never revenue — held for a state</span>
        </div>

        {taxCollected === 0 ? (
          <div style={{ fontSize: 12.5, background: '#fff8e6', border: '1px solid #fde68a', color: '#92700c', borderRadius: 10, padding: '9px 12px', marginTop: 8 }}>
            <strong>No tax is being collected yet.</strong> Checkout doesn't add sales tax, so
            nothing here is owed — and nothing is being set aside either. Turning it on needs
            Stripe Tax enabled and a Texas permit. See TAX_COMPLIANCE.md.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12, marginTop: 10 }}>
            <div>
              <div style={label}>Collected</div>
              <div style={{ fontSize: 19, fontWeight: 800 }}>{money(taxCollected)}</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>on {money(taxableBasis)} of sales</div>
            </div>
            <div>
              <div style={label}>We remit</div>
              <div style={{ fontSize: 19, fontWeight: 800, color: '#dc2626' }}>{money(taxWeOwe)}</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Owed by DesiZoom</div>
            </div>
            <div>
              <div style={label}>Merchant remits</div>
              <div style={{ fontSize: 19, fontWeight: 800 }}>{money(taxMerchantOwes)}</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Included in their payout</div>
            </div>
          </div>
        )}

        {data.jurisdictions.length > 0 && (
          <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
            <div style={{ ...label, marginBottom: 6 }}>Where we operate</div>
            {data.jurisdictions.map((j) => (
              <div key={j.code} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, padding: '4px 0' }}>
                <strong style={{ minWidth: 34 }}>{j.code}</strong>
                <span style={{ color: 'var(--muted)', flex: 1 }}>{j.name}</span>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: j.we_remit ? '#fee2e2' : '#f1f5f9', color: j.we_remit ? '#dc2626' : '#475569' }}>
                  {j.we_remit ? 'we remit' : 'merchant remits'}
                </span>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: j.registered ? '#e8f9ee' : '#fff8e6', color: j.registered ? '#128c4b' : '#92700c' }}>
                  {j.registered ? 'registered' : 'not registered'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Where the money comes from ──────────────────────────────────── */}
      <div style={{ ...card, marginBottom: 16 }}>
        <strong style={{ fontSize: 14.5 }}>Revenue by stream</strong>
        <div style={{ marginTop: 10 }}>
          {Object.entries(byKind).sort((a, b) => b[1].commission - a[1].commission).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderTop: '1px solid var(--border)', fontSize: 13 }}>
              <span style={{ flex: 1 }}>{KIND_LABEL[k] || k}</span>
              <span style={{ color: 'var(--muted)', fontSize: 12 }}>{v.count}×</span>
              <strong>{money(v.commission)}</strong>
            </div>
          ))}
          {Object.keys(byKind).length === 0 && (
            <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>No completed payments in this period.</div>
          )}
        </div>
      </div>

      {/* ── Every order, fully broken down ──────────────────────────────── */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
          <strong style={{ fontSize: 14.5 }}>Orders</strong>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            What came in, what the restaurant got, what we kept, what's owed
          </span>
        </div>

        {ords.length === 0 ? (
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 8 }}>No orders in this period.</div>
        ) : (
          <div style={{ overflowX: 'auto', marginTop: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 620 }}>
              <thead>
                <tr style={{ fontSize: 10.5, color: 'var(--muted)', textAlign: 'left' }}>
                  <th style={{ padding: '0 8px 6px 0' }}>Date</th>
                  <th style={{ padding: '0 8px 6px 0' }}>Restaurant</th>
                  <th style={{ padding: '0 8px 6px 0', textAlign: 'right' }}>Food</th>
                  <th style={{ padding: '0 8px 6px 0', textAlign: 'right' }}>Fee</th>
                  <th style={{ padding: '0 8px 6px 0', textAlign: 'right' }}>Tax</th>
                  <th style={{ padding: '0 8px 6px 0', textAlign: 'right' }}>Customer paid</th>
                  <th style={{ padding: '0 8px 6px 0', textAlign: 'right' }}>Restaurant</th>
                  <th style={{ padding: '0 8px 6px 0', textAlign: 'right' }}>We keep</th>
                  <th style={{ padding: '0 0 6px 0', textAlign: 'right' }}>Tax we owe</th>
                </tr>
              </thead>
              <tbody>
                {ords.slice(0, 100).map((o) => {
                  const fee = o.service_fee_cents ?? 0;
                  const comm = o.commission_cents ?? 0;
                  const tax = o.tax_cents ?? 0;
                  const delivery = o.delivery_fee_cents ?? 0;
                  const paid = o.subtotal_cents + fee + tax + delivery;
                  // The restaurant's payout includes the tax when they're the
                  // one filing it.
                  const toRest = o.subtotal_cents - comm + delivery + (o.tax_remitted_by === 'merchant' ? tax : 0);
                  const weOwe = o.tax_remitted_by === 'platform' ? tax : 0;
                  const weKeep = comm + fee - stripeFee(paid);

                  return (
                    <tr key={o.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '6px 8px 6px 0', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                        {new Date(o.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                      <td style={{ padding: '6px 8px 6px 0', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {o.restaurant?.name || '—'}
                      </td>
                      <td style={{ padding: '6px 8px 6px 0', textAlign: 'right' }}>{money(o.subtotal_cents)}</td>
                      <td style={{ padding: '6px 8px 6px 0', textAlign: 'right', color: 'var(--muted)' }}>{money(fee)}</td>
                      <td style={{ padding: '6px 8px 6px 0', textAlign: 'right', color: 'var(--muted)' }}>
                        {tax ? money(tax) : '—'}
                      </td>
                      <td style={{ padding: '6px 8px 6px 0', textAlign: 'right', fontWeight: 700 }}>{money(paid)}</td>
                      <td style={{ padding: '6px 8px 6px 0', textAlign: 'right', color: '#0f6e56' }}>{money(toRest)}</td>
                      <td style={{ padding: '6px 8px 6px 0', textAlign: 'right', fontWeight: 700, color: weKeep >= 0 ? '#b84d00' : '#dc2626' }}>
                        {money(weKeep)}
                      </td>
                      <td style={{ padding: '6px 0', textAlign: 'right', color: weOwe ? '#dc2626' : 'var(--muted)', fontWeight: weOwe ? 700 : 400 }}>
                        {weOwe ? money(weOwe) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {ords.length > 100 && (
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
                Showing the 100 most recent of {ords.length}.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Day by day ──────────────────────────────────────────────────── */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <strong style={{ fontSize: 14.5 }}>Day by day</strong>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Tap a day to see every payment</span>
        </div>

        {days.length === 0 ? (
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 8 }}>
            Nothing in this period.
          </div>
        ) : days.map(([day, rows]) => {
          const dGross = rows.filter((r) => r.status === 'completed').reduce((s, r) => s + r.amount_cents, 0);
          const dComm = rows.filter((r) => r.status === 'completed').reduce((s, r) => s + (r.commission_cents ?? 0), 0);
          const dStripe = rows.filter((r) => r.status === 'completed').reduce((s, r) => s + stripeFee(r.amount_cents), 0);
          const dNet = dComm - dStripe;
          const open = expanded === day;

          return (
            <div key={day} style={{ borderTop: '1px solid var(--border)' }}>
              <button
                onClick={() => setExpanded(open ? null : day)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 0', background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', textAlign: 'left', color: 'var(--text)',
                }}
              >
                <span style={{ fontSize: 12, color: 'var(--muted)', width: 14 }}>{open ? '▾' : '▸'}</span>
                <span style={{ fontSize: 13, fontWeight: 700, minWidth: 116 }}>
                  {new Date(day + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </span>
                <span style={{ fontSize: 12, color: 'var(--muted)', flex: 1 }}>
                  {rows.length} payment{rows.length > 1 ? 's' : ''}
                </span>
                <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{money(dGross)}</span>
                <strong style={{ fontSize: 13, minWidth: 62, textAlign: 'right', color: dNet >= 0 ? 'var(--text)' : '#dc2626' }}>
                  {money(dNet)}
                </strong>
              </button>

              {open && (
                <div style={{ paddingBottom: 10 }}>
                  {rows.map((r) => (
                    <div
                      key={r.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 9, padding: '6px 0 6px 24px',
                        fontSize: 12.5, borderTop: '1px dashed var(--border)',
                        opacity: r.status === 'completed' ? 1 : 0.6,
                      }}
                    >
                      <span style={{ color: 'var(--muted)', minWidth: 52 }}>
                        {new Date(r.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {KIND_LABEL[r.kind || 'sale'] || r.kind} {r.post?.title ? `· ${r.post.title}` : ''}
                      </span>
                      {r.status !== 'completed' && (
                        <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: '#fee2e2', color: '#dc2626' }}>
                          {r.status}
                        </span>
                      )}
                      <span style={{ color: 'var(--muted)' }}>{money(r.amount_cents)}</span>
                      <span style={{ color: 'var(--muted)', fontSize: 11.5 }}>
                        −{money(stripeFee(r.amount_cents))}
                      </span>
                      <strong style={{ minWidth: 54, textAlign: 'right' }}>
                        {money((r.commission_cents ?? 0) - stripeFee(r.amount_cents))}
                      </strong>
                    </div>
                  ))}
                  <div style={{ fontSize: 11, color: 'var(--muted)', paddingLeft: 24, paddingTop: 6 }}>
                    Columns: time · what · customer paid · est. Stripe fee · net to us
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Refunds ─────────────────────────────────────────────────────── */}
      {refunded.length > 0 && (
        <div style={{ ...card, marginBottom: 16 }}>
          <strong style={{ fontSize: 14.5 }}>Refunds</strong>
          <div style={{ fontSize: 13, marginTop: 6 }}>
            {refunded.length} refund{refunded.length > 1 ? 's' : ''} · {money(refundedAmt)} returned to customers
          </div>
        </div>
      )}

      <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.6 }}>
        Stripe's fee is estimated at 2.9% + 30¢ per charge — the published US card rate.
        Use Stripe's dashboard for the exact figure at month end. Tax figures come from
        what was recorded on each order.
      </div>
    </div>
  );
}
