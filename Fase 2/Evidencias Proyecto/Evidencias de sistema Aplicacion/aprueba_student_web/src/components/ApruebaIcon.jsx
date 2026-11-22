const paths = {
  medal: 'M7 2l5 7 5-7 M5 2h4m6 0h4 M18 15a6 6 0 1 1-12 0 6 6 0 1 1 12 0z',
  group: 'M15 8a3 3 0 1 1-6 0 3 3 0 1 1 6 0z M5 20v-2c0-6 14-6 14 0v2 M4 8a3 3 0 0 1 2-3 M2 16q0-3 4-4',
  chat: 'M3 4h18v13H9l-5 4v-4H3z M7 9h10 M7 12h6',
  card: 'M3 5h18v14H3z M3 9h18 M6 15h4',
  settings: 'M3 7h8m4 0h6 M3 17h3m5 0h10 M15 7a2 2 0 1 1-4 0 2 2 0 1 1 4 0z M10 17a2 2 0 1 1-4 0 2 2 0 1 1 4 0z',
  bell: 'M4 17c2-2 2-4 2-7a6 6 0 0 1 12 0c0 3 0 5 2 7z M10 20q2 2 4 0 M12 2v2',
  flame: 'M13 2c2 5-1 6 1 9l3-3c5 7 2 13-5 13-6 0-10-6-6-12l2 3c0-4 4-6 5-10z',
  sun: 'M16 12a4 4 0 1 1-8 0 4 4 0 1 1 8 0z M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2',
  moon: 'M19.8 15.5A8.8 8.8 0 0 1 9 4a9 9 0 1 0 10.8 11.5z',
  book: 'M3 5q5-2 9 1 4-3 9-1v14q-5-2-9 1-4-3-9-1z M12 6v14',
};

export default function ApruebaIcon({ name, size = 20 }) {
  return <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={paths[name]} />
    <circle cx={name === 'flame' ? 12 : 17} cy={name === 'flame' ? 16 : 5} r="2" fill="#efab39" stroke="none" />
  </svg>;
}
