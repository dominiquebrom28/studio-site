/**
 * Fixed, full-viewport paper-grain noise layer (design-brief §4).
 * feTurbulence-generated static noise, capped at opacity 0.03 (light) /
 * 0.025 (dark) via the --grain-opacity token so it can never measurably
 * erode the contrast ratios computed in the design brief §2.
 * Purely decorative — aria-hidden, no interaction, no motion.
 */
export function GrainOverlay() {
  return (
    <svg
      className="paper-grain"
      aria-hidden="true"
      focusable="false"
      width="100%"
      height="100%"
      preserveAspectRatio="none"
    >
      <filter id="paper-grain-filter">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.85"
          numOctaves={2}
          stitchTiles="stitch"
          result="noise"
        />
        <feColorMatrix in="noise" type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#paper-grain-filter)" />
    </svg>
  );
}
