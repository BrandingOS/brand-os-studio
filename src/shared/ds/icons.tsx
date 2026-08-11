import React from 'react';

/**
 * Internal Lucide-style line icons for DS components: 1.8px stroke, round
 * caps, never filled. Kept private to the ds folder — product features
 * should use lucide-react directly.
 */

type IconProps = { size?: number; className?: string };

function icon(paths: React.ReactNode) {
  return function Icon({ size = 14, className }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
      >
        {paths}
      </svg>
    );
  };
}

export const ArrowRightIcon = icon(<path d="M5 12h14M12 5l7 7-7 7" />);
export const CheckIcon = icon(<path d="M20 6 9 17l-5-5" />);
export const ChevronDownIcon = icon(<path d="m6 9 6 6 6-6" />);
export const CloseIcon = icon(<path d="M18 6 6 18M6 6l12 12" />);
export const PlusIcon = icon(<path d="M5 12h14M12 5v14" />);
export const AlertTriangleIcon = icon(
  <>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <path d="M12 9v4M12 17h.01" />
  </>,
);
export const AlertCircleIcon = icon(
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v4M12 16h.01" />
  </>,
);
