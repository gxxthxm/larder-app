export function LogoMark({ className = 'size-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="18" fill="var(--brand)" />
      <path d="M20 44c0-14 9-24 26-26-1 17-11 27-26 26Z" fill="#fff" opacity=".95" />
      <path
        d="M20 44c6-7 12-12 20-17"
        stroke="var(--brand)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
