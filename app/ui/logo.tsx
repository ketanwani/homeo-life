export function HomeoLifeLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className={compact ? "logoLockup compact" : "logoLockup"} aria-label="Homeo Life">
      <svg className="logoGlyph" viewBox="0 0 64 64" role="img" aria-hidden="true">
        <rect x="6" y="6" width="52" height="52" rx="16" />
        <path d="M19 38c9.5-2.2 17.3-8.8 22-20 7.2 11.9 3.3 26.7-8.4 31.4-7.8 3.1-14.9-.7-13.6-11.4Z" />
        <path d="M23 40c6.6-1.8 11.7-5.6 15.8-11.7" />
        <path d="M20 20v24M44 20v24M20 32h24" />
      </svg>
      <span className="logoText">
        <strong>Homeo Life</strong>
        {!compact ? <small>Dr. Neha Mehta</small> : null}
      </span>
    </span>
  );
}
