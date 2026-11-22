const paths = {
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
