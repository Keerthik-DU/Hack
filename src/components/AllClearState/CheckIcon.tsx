import React from 'react';

/**
 * CheckIcon — animated SVG checkmark inside a circle, rendered on AllClearState mount.
 *
 * Animation: `checkBounce` keyframe — scale(0)+rotate(0°) → scale(1.2)+rotate(300°)
 * → scale(1)+rotate(360°) over 600ms with an elastic easing curve.
 *
 * Wrapped in `motion-safe:` Tailwind prefix so the animation is skipped when the
 * user has enabled prefers-reduced-motion.
 */
export const CheckIcon: React.FC = () => (
  <div
    data-testid="check-icon"
    className="motion-safe:animate-check-bounce flex items-center justify-center"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-24 w-24 text-green-500 dark:text-green-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      data-testid="check-icon-svg"
    >
      {/* Circle outline */}
      <circle cx="12" cy="12" r="10" />
      {/* Checkmark path */}
      <polyline points="20 6 9 17 4 12" />
    </svg>
  </div>
);
