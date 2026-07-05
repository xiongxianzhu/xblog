export function AdminLoginBackground() {
  return (
    <div aria-hidden className="admin-login-bg pointer-events-none absolute inset-0 overflow-hidden">
      <svg className="admin-login-bg-grid absolute inset-0 size-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="admin-login-grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path
              d="M 48 0 L 0 0 0 48"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-primary/15"
            />
          </pattern>
          <radialGradient id="admin-login-glow-a" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(var(--primary) / 0.22)" />
            <stop offset="100%" stopColor="hsl(var(--primary) / 0)" />
          </radialGradient>
          <radialGradient id="admin-login-glow-b" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(var(--primary) / 0.16)" />
            <stop offset="100%" stopColor="hsl(var(--primary) / 0)" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#admin-login-grid)" />
        <circle cx="78%" cy="18%" r="220" fill="url(#admin-login-glow-a)" className="admin-login-bg-orb-a" />
        <circle cx="12%" cy="82%" r="180" fill="url(#admin-login-glow-b)" className="admin-login-bg-orb-b" />
        <path
          d="M0 320 C 180 260, 320 380, 520 300 S 860 220, 1200 280"
          fill="none"
          stroke="hsl(var(--primary) / 0.18)"
          strokeWidth="1"
          className="admin-login-bg-line"
        />
        <path
          d="M0 520 C 220 460, 360 560, 560 500 S 920 420, 1200 480"
          fill="none"
          stroke="hsl(var(--primary) / 0.12)"
          strokeWidth="1"
          className="admin-login-bg-line admin-login-bg-line-delay"
        />
        <g className="text-primary/35">
          <circle cx="18%" cy="28%" r="3" fill="currentColor" className="admin-login-bg-node" />
          <circle cx="72%" cy="34%" r="2.5" fill="currentColor" className="admin-login-bg-node admin-login-bg-node-delay" />
          <circle cx="84%" cy="68%" r="2" fill="currentColor" className="admin-login-bg-node" />
          <circle cx="32%" cy="74%" r="2.5" fill="currentColor" className="admin-login-bg-node admin-login-bg-node-delay" />
        </g>
      </svg>
      <div className="admin-login-bg-vignette absolute inset-0" />
    </div>
  );
}
