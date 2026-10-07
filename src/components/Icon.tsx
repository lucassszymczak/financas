const PATHS = {
  camera: 'M4 8h3l2-3h6l2 3h3v11H4z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  calendar: 'M4 6h16v14H4z M4 10h16 M8 3v5 M16 3v5',
  gauge: 'M4 18a8 8 0 1 1 16 0 M12 18l4-6',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  chat: 'M4 5h16v11H9l-5 4z',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2z M9 8h6 M9 12h6',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2',
  images: 'M3 7h14v12H3z M7 4h14v12 M3 16l4-4 4 4 3-3 3 3',
  file: 'M6 3h8l4 4v14H6z M14 3v4h4',
  plus: 'M12 5v14 M5 12h14',
  check: 'M5 12l5 5 9-10',
  x: 'M6 6l12 12 M18 6L6 18',
  trash: 'M5 7h14 M9 7V4h6v3 M7 7l1 13h8l1-13',
  share: 'M12 3v12 M7 8l5-5 5 5 M5 14v6h14v-6',
  download: 'M12 3v12 M7 10l5 5 5-5 M5 20h14',
  chevronLeft: 'M15 5l-7 7 7 7',
  chevronRight: 'M9 5l7 7-7 7',
  edit: 'M4 20h4L19 9l-4-4L4 16z',
  alert: 'M12 3l10 18H2z M12 10v5 M12 18v.01',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
