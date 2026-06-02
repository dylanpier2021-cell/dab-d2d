// Minimal inline icon set (stroke-based, inherits color).
const I = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" {...p} />
)
export const IconHome = (p) => <I {...p}><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></I>
export const IconBolt = (p) => <I {...p}><path d="M13 2L3 14h7l-1 8 10-12h-7z" /></I>
export const IconTrophy = (p) => <I {...p}><path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4z" /><path d="M5 4H3v2a3 3 0 0 0 3 3M19 4h2v2a3 3 0 0 1-3 3" /></I>
export const IconMap = (p) => <I {...p}><path d="M9 3L3 6v15l6-3 6 3 6-3V3l-6 3-6-3z" /><path d="M9 3v15M15 6v15" /></I>
export const IconChat = (p) => <I {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></I>
export const IconUsers = (p) => <I {...p}><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3 3-5 6-5s6 2 6 5" /><path d="M16 6a3 3 0 0 1 0 6M22 20c0-2-1.5-3.5-3.5-4.2" /></I>
export const IconChart = (p) => <I {...p}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></I>
export const IconLogout = (p) => <I {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></I>
export const IconPlus = (p) => <I {...p}><path d="M12 5v14M5 12h14" /></I>
export const IconCheck = (p) => <I {...p}><path d="M20 6L9 17l-5-5" /></I>
export const IconPin = (p) => <I {...p}><path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></I>
export const IconBack = (p) => <I {...p}><path d="M19 12H5M12 19l-7-7 7-7" /></I>
export const IconCalendar = (p) => <I {...p}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18M8 2v4M16 2v4" /></I>
