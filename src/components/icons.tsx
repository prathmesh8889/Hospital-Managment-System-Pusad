import type { ReactNode } from "react";

const P: Record<string, ReactNode> = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  heart: <path d="M12 20.5s-7.5-4.7-9.3-9.2C1.4 8 3.2 4.9 6.4 4.9c2 0 3.6 1.1 4.4 2.7.4.8 1.9.8 2.3 0 .9-1.6 2.5-2.7 4.4-2.7 3.3 0 5.1 3.1 3.7 6.4-1.7 4.5-9.2 9.2-9.2 9.2Z" />,
  pulse: <path d="M2.5 12h4l2.3-5.5 4.4 11L15.5 12h6" />,
  users: <><circle cx="9" cy="8" r="3.4" /><path d="M2.8 20c.7-3.3 3.2-5 6.2-5s5.5 1.7 6.2 5" /><path d="M15.5 4.9a3.4 3.4 0 0 1 0 6.2M17.8 15.4c1.9.6 3.1 2 3.6 4.6" /></>,
  user: <><circle cx="12" cy="8" r="3.6" /><path d="M5 20.2c.9-3.7 3.7-5.6 7-5.6s6.1 1.9 7 5.6" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="16" rx="2" /><path d="M3.5 10h17M8 2.8V7M16 2.8V7" /></>,
  queue: <><path d="M4 6h16M4 12h16M4 18h10" /><circle cx="19.5" cy="18" r="2" /></>,
  pill: <><path d="M10.2 3.8 3.8 10.2a4.2 4.2 0 0 0 6 6l6.4-6.4a4.2 4.2 0 0 0-6-6Z" /><path d="M7 7l6 6" /><path d="M17 14.5v.01M20 11.5v.01M19.5 18.5v.01" /></>,
  flask: <><path d="M9.5 3h5M10 3v5.2L4.8 17.6A2.4 2.4 0 0 0 7 21h10a2.4 2.4 0 0 0 2.2-3.4L14 8.2V3" /><path d="M7.4 14h9.2" /></>,
  bed: <><path d="M3 7v12M3 15h18M21 19v-6a2.5 2.5 0 0 0-2.5-2.5H10V15" /><circle cx="6.5" cy="10.5" r="1.8" /></>,
  cross: <><path d="M9.5 3.5h5V9H20v5h-5.5v5.5h-5V14H4V9h5.5V3.5Z" /></>,
  receipt: <><path d="M5 21V4.5A1.5 1.5 0 0 1 6.5 3h11A1.5 1.5 0 0 1 19 4.5V21l-2.3-1.5L14.4 21l-2.4-1.5L9.6 21l-2.3-1.5L5 21Z" /><path d="M9 8h6M9 12h6M9 16h3.5" /></>,
  box: <><path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5v-9Z" /><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9" /></>,
  chart: <><path d="M3.5 3.5v17h17" /><path d="M8 16v-5M12.5 16V7M17 16v-8" /></>,
  bell: <><path d="M18 9.5a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6" /><path d="M10 19a2.2 2.2 0 0 0 4 0" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m20.5 20.5-4.8-4.8" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  check: <path d="m4.5 12.5 5 5L19.5 7" />,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5.2l3.4 2" /></>,
  alert: <><path d="M12 3.5 2.5 20h19L12 3.5Z" /><path d="M12 10v4.5M12 17.5v.01" /></>,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 7.5v.01" /></>,
  logout: <><path d="M14 4h-8a1.5 1.5 0 0 0-1.5 1.5v13A1.5 1.5 0 0 0 6 20h8" /><path d="m17 8 4 4-4 4M21 12H10" /></>,
  "chevron-r": <path d="m9 5 7 7-7 7" />,
  "chevron-d": <path d="m5 9 7 7 7-7" />,
  "arrow-r": <path d="M4 12h15M13 6l6 6-6 6" />,
  printer: <><path d="M7 8V3.5h10V8" /><rect x="3.5" y="8" width="17" height="9" rx="1.5" /><path d="M7 14h10v6.5H7z" /></>,
  download: <><path d="M12 3.5V15M7.5 10.5 12 15l4.5-4.5" /><path d="M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17" /></>,
  phone: <path d="M6.8 3.5c.6 0 1.8 2.3 1.8 3.2 0 1.3-2 1.9-2 3 0 1.9 4.9 6.8 6.8 6.8 1.1 0 1.7-2 3-2 .9 0 3.2 1.2 3.2 1.8 0 1.9-2.3 3.7-4.2 3.7C10 20 4 14 4 8.7c0-1.9 1.8-5.2 2.8-5.2Z" />,
  droplet: <path d="M12 3.5s6.5 6.6 6.5 11a6.5 6.5 0 0 1-13 0c0-4.4 6.5-11 6.5-11Z" />,
  scan: <><path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" /><path d="M4 12h16" /></>,
  wallet: <><path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h11.5v3" /><path d="M3.5 7.5V17A2.5 2.5 0 0 0 6 19.5h14.5V8H6a2.5 2.5 0 0 1-2.5-.5Z" /><path d="M16.5 13.5h.01" /></>,
  send: <path d="M20.5 3.5 3 10.2l6.8 2.6 2.6 7.7 8.1-17ZM9.8 12.8l4.5-4.4" />,
  filter: <path d="M4 5h16l-6.2 7.2V19l-3.6-2v-4.8L4 5Z" />,
  refresh: <><path d="M20 12a8 8 0 1 1-2.3-5.6" /><path d="M20 3.5V8h-4.5" /></>,
  edit: <><path d="M14.5 5.5 18.5 9.5 8.5 19.5H4.5v-4L14.5 5.5Z" /><path d="m12.5 7.5 4 4" /></>,
  shield: <><path d="M12 3 5 5.8v5.4c0 4.6 3 7.9 7 9.8 4-1.9 7-5.2 7-9.8V5.8L12 3Z" /><path d="m9 11.5 2.2 2.2L15.5 9" /></>,
  activity: <path d="M2.5 12h4l2.3-5.5 4.4 11L15.5 12h6" />,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" /></>,
  stetho: <><path d="M5 3.5v5.7a4.8 4.8 0 0 0 9.6 0V3.5" /><path d="M9.8 14v2.3a4.2 4.2 0 0 0 8.4 0v-3" /><circle cx="18.2" cy="10.5" r="2.3" /></>,
  building: <><path d="M4 21V5.5A1.5 1.5 0 0 1 5.5 4h8A1.5 1.5 0 0 1 15 5.5V21M15 9h3.5A1.5 1.5 0 0 1 20 10.5V21M2.5 21h19" /><path d="M7.5 8h2M7.5 12h2M7.5 16h2M11 8h1M11 12h1M11 16h1" /></>,
  vial: <><path d="M9 3h6M10.5 3v6.3L6.2 17.5A2.5 2.5 0 0 0 8.4 21h7.2a2.5 2.5 0 0 0 2.2-3.5L13.5 9.3V3" /><path d="M8.2 14h7.6" /></>,
  menu: <path d="M4 6.5h16M4 12h16M4 17.5h16" />,
  "eye-off": <><path d="M4 4.5 20 19.5" /><path d="M9.9 6.1A9.4 9.4 0 0 1 12 5.5c6.5 0 9.5 6.5 9.5 6.5a17.6 17.6 0 0 1-3 3.9M6.1 8.2A16.8 16.8 0 0 0 2.5 12S6 18.5 12 18.5a9.6 9.6 0 0 0 4-.9" /><path d="M9.9 10.2a3 3 0 0 0 4 4.1" /></>,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="2" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /><path d="M12 14.5v2.5" /></>,
  radar: <><path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5" /><path d="M12 7a5 5 0 1 0 5 5" /><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" /><path d="M12 12 18 6" /></>,
};

export type IconName = keyof typeof P;

export function I({ name, className = "w-4 h-4", sw = 1.7 }: { name: string; className?: string; sw?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {P[name] ?? P.info}
    </svg>
  );
}

export function PulseMark({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="#0A2A21" />
      <path d="M6 16h5l2.5-6 4 12 2.5-6h6" stroke="#3ED598" strokeWidth="2.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
