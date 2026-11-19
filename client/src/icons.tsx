// Crisp SVG icon set used across the UI in place of emoji glyphs.
// Icons inherit `currentColor`, so CSS controls their colour and glow.
import type {ReactNode} from 'react';

const P = {
  gem: <><path d="M7 3h10l5 6-10 12L2 9z" fill="currentColor" opacity=".35"/><path d="M7 3h10l5 6-10 12L2 9zM2 9h20M9 3l3 6 3-6M7 9l5 12 5-12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></>,
  heart: <path d="M12 20.5s-8-4.8-8-11A4.5 4.5 0 0 1 12 6.6 4.5 4.5 0 0 1 20 9.5c0 6.2-8 11-8 11z" fill="currentColor"/>,
  bolt: <path d="M13.5 2 4 13.5h6.5L9.5 22 20 9.5h-6.6z" fill="currentColor"/>,
  car: <><rect x="5" y="2.5" width="14" height="19" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M7.5 8.5h9l-1 3.5h-7zM8.5 17h7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M3 7h2M19 7h2M3 17h2M19 17h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></>,
  gun: <path d="M2 8h17l3 2v2h-6l-1 2h-3l-1 2.5-3 3.5H5l2-6H3.5L2 12z" fill="currentColor"/>,
  rocket: <><path d="M14.5 3.5c3.5-.8 5.8-.7 6 0 .7.2.8 2.5 0 6l-7.5 7.5-6-6z" fill="currentColor"/><path d="M7 11 3 12l3-4.5h4M13 17l-1 4 4.5-3V14M5.5 15.5 3 21l5.5-2.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><circle cx="15.5" cy="8.5" r="1.6" fill="#0b1220"/></>,
  oil: <path d="M12 2.5S5 10.5 5 15a7 7 0 0 0 14 0c0-4.5-7-12.5-7-12.5zm-3 13a3 3 0 0 0 3 3" fill="currentColor" stroke="#0b1220" strokeWidth="0"/>,
  ammo: <><path d="M5 9c0-3 1.5-5 2-6 .5 1 2 3 2 6v12H5zM10 9c0-3 1.5-5 2-6 .5 1 2 3 2 6v12h-4zM15 9c0-3 1.5-5 2-6 .5 1 2 3 2 6v12h-4z" fill="currentColor"/><path d="M5 12h14" stroke="#0b1220" strokeWidth="1.3"/></>,
  wrench: <path d="M21 6.5a5 5 0 0 1-6.6 4.7L7 18.6a2 2 0 0 1-2.8-2.8l7.4-7.4A5 5 0 0 1 17.5 3l-3 3 .6 2.9 2.9.6z" fill="currentColor"/>,
  flag: <><path d="M5 21V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M5 4h14l-2.5 4.5L19 13H5z" fill="currentColor" opacity=".3"/><path d="M5 4h4.5v4.5H5zM14 4h4.5v4.5H14zM9.5 8.5H14V13H9.5z" fill="currentColor"/></>,
  radar: <><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.7"/><circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" opacity=".6"/><path d="M12 12 18.5 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="16" cy="15" r="1.5" fill="currentColor"/></>,
  crew: <><circle cx="9" cy="8" r="3.5" fill="currentColor"/><path d="M2.5 20c.5-4 3-6 6.5-6s6 2 6.5 6z" fill="currentColor"/><circle cx="17" cy="9" r="2.8" fill="currentColor" opacity=".6"/><path d="M16 14.2c3 0 5 1.6 5.5 5.3H17" fill="currentColor" opacity=".6"/></>,
  key: <><circle cx="8" cy="12" r="4.5" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M12.5 12H21v3.5M17.5 12v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></>,
  gear: <path d="M10.3 2h3.4l.5 2.6 1.9.8 2.2-1.5 2.4 2.4-1.5 2.2.8 1.9 2.6.5v3.4l-2.6.5-.8 1.9 1.5 2.2-2.4 2.4-2.2-1.5-1.9.8-.5 2.6h-3.4l-.5-2.6-1.9-.8-2.2 1.5-2.4-2.4 1.5-2.2-.8-1.9L2 13.7v-3.4l2.6-.5.8-1.9-1.5-2.2 2.4-2.4 2.2 1.5 1.9-.8zM12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z" fill="currentColor" fillRule="evenodd"/>,
  pause: <><rect x="6" y="4.5" width="4" height="15" rx="1.4" fill="currentColor"/><rect x="14" y="4.5" width="4" height="15" rx="1.4" fill="currentColor"/></>,
  boom: <path d="m12 1.5 2 6 5-3.5-1.5 6 5 2-5.5 2 3 5.5-6-2.5L12 22.5 10 17l-6 2.5 3-5.5-5.5-2 5-2L5 4l5 3.5z" fill="currentColor"/>,
  move: <path d="m12 2 3.5 3.5h-2.3v5.3h5.3V8.5L22 12l-3.5 3.5v-2.3h-5.3v5.3h2.3L12 22l-3.5-3.5h2.3v-5.3H5.5v2.3L2 12l3.5-3.5v2.3h5.3V5.5H8.5z" fill="currentColor"/>,
  crosshair: <><circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M12 1.5v6M12 16.5v6M1.5 12h6M16.5 12h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/></>,
  swap: <path d="M4 8h13.5M14 4.5 17.5 8 14 11.5M20 16H6.5M10 12.5 6.5 16l3.5 3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>,
  trophy: <><path d="M7 3h10v5a5 5 0 0 1-10 0z" fill="currentColor"/><path d="M7 5H3.5c0 3 1.5 5 4 5M17 5h3.5c0 3-1.5 5-4 5M12 13v4M8 21h8l-1-4H9z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></>,
  book: <path d="M3 5c3-1.5 6-1.5 9 .5 3-2 6-2 9-.5v14c-3-1.5-6-1.5-9 .5-3-2-6-2-9-.5zM12 5.5v14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>,
  map: <path d="m3 6 6-2.5 6 2.5 6-2.5v14.5L15 20.5l-6-2.5-6 2.5zM9 3.5V18M15 6v14.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>,
  close: <path d="M5 5l14 14M19 5 5 19" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"/>,
  skull: <><path d="M12 2.5c-5 0-8.5 3.4-8.5 8 0 2.6 1.2 4.4 3 5.5V20h11v-4c1.8-1.1 3-2.9 3-5.5 0-4.6-3.5-8-8.5-8z" fill="currentColor"/><circle cx="8.8" cy="11" r="2.2" fill="#0b1220"/><circle cx="15.2" cy="11" r="2.2" fill="#0b1220"/></>,
  expand: <path d="M3.5 9V3.5H9M15 3.5h5.5V9M20.5 15v5.5H15M9 20.5H3.5V15" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>,
  shrink: <path d="M9 3.5V9H3.5M20.5 9H15V3.5M15 20.5V15h5.5M3.5 15H9v5.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>,
  timer: <><circle cx="12" cy="13.5" r="8" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M12 9v4.5l3 2M9.5 2.5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></>,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof P;
export const WEAPON_ICONS: IconName[] = ['gun', 'rocket', 'oil'];

export function Icon({name, size = 16, className = ''}: {name: IconName; size?: number; className?: string}) {
  return (
    <svg className={'icon ' + className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {P[name]}
    </svg>
  );
}
