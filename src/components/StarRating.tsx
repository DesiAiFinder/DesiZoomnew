interface Props {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  count?: number;   // show "(12)" review count
}

export default function StarRating({ value, onChange, size = 15, count }: Props) {
  const interactive = !!onChange;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          onClick={interactive ? () => onChange!(n) : undefined}
          style={{
            fontSize: size, lineHeight: 1,
            color: n <= Math.round(value) ? '#f59e0b' : '#d8cfc0',
            cursor: interactive ? 'pointer' : 'default',
          }}
        >★</span>
      ))}
      {value > 0 && !interactive && (
        <span style={{ fontSize: size - 3, color: 'var(--muted)', marginLeft: 4 }}>
          {value.toFixed(1)}{count !== undefined ? ` (${count})` : ''}
        </span>
      )}
    </span>
  );
}
