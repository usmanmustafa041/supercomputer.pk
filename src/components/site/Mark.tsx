/**
 * Wordmark glyph: a die on a substrate, drawn as four quadrants with one
 * corner cut — the orientation notch every real processor carries.
 */
export default function Mark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden="true">
      <path d="M4 9 L9 4 H28 V23 L23 28 H4 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <rect x="11" y="11" width="10" height="10" fill="currentColor" />
      <path d="M16 4 V0 M16 32 V28 M4 16 H0 M32 16 H28" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
