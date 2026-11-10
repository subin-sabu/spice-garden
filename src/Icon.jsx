import React from 'react';

const icons = {
  search: 'M20 20l-4.5-4.5M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z',
  spark: 'M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z',
  soup: 'M3 12h18a9 9 0 0 1-18 0ZM7 8c0-2 2-2 2-4m3 4c0-2 2-2 2-4m3 4c0-2 2-2 2-4M8 21h8',
  leaf: 'M4 20C5 11 12 5 21 4c0 10-5 16-13 15M5 19l10-8',
  flame: 'M12 22a7 7 0 0 0 7-7c0-4-3-7-5-9 0 3-2 4-2 4 0-4-2-6-4-8 0 5-4 8-4 13a8 8 0 0 0 8 7Z',
  plate: 'M3 21h18M3 17h18a9 9 0 0 0-18 0ZM12 8V6m-2 0h4',
  dessert: 'M5 11h14l-7 11-7-11ZM6 11a6 6 0 0 1 12 0M3 11h18',
  drink: 'M5 3h14l-2 18H7L5 3Zm1 7h12m-6 0 4-8',
  all: 'M4 4h6v6H4zm10 0h6v6h-6zM4 14h6v6H4zm10 0h6v6h-6z',
  arrow: 'M4 12h15m-6-6 6 6-6 6',
  down: 'M12 4v15m-6-6 6 6 6-6',
  camera: 'M3 7h4l2-3h6l2 3h4v13H3zM16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  video: 'M8 4l12 8-12 8z',
  left: 'M15 5l-7 7 7 7',
  right: 'M9 5l7 7-7 7',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  check: 'M5 12l4 4L19 6',
  close: 'M6 6l12 12M18 6 6 18',
};

export function Icon({ name, size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={icons[name]} /></svg>;
}

