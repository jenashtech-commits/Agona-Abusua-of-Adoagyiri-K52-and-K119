import React from "react";

const GOLD = "#C9A227";
const GOLD_LIGHT = "#E8C766";
const MAROON = "#5A1D1D";
const MAROON_DARK = "#3C1414";
const GREEN = "#1F5C3F";
const BLUE = "#1F3F6B";

function BadgeFace({ size }) {
  const id = "badge3d";
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-label="Agona Abusua Adoagyiri badge">
      <defs>
        <path id={`${id}-top`} d="M 30 100 A 70 70 0 0 1 170 100" />
        <path id={`${id}-bot`} d="M 40 150 A 62 62 0 0 0 160 150" />
        <radialGradient id={`${id}-sheen`} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#FFF6D8" stopOpacity="0.55" />
          <stop offset="45%" stopColor={GOLD_LIGHT} stopOpacity="0.12" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="96" fill={MAROON_DARK} stroke={GOLD} strokeWidth="4" />
      <circle cx="100" cy="100" r="80" fill="none" stroke={GOLD} strokeWidth="1.5" />
      <text fill={GOLD_LIGHT} fontSize="15" fontFamily="Cinzel, serif" letterSpacing="2">
        <textPath href={`#${id}-top`} startOffset="50%" textAnchor="middle">AGONA ABUSUA</textPath>
      </text>
      <text fill={GOLD_LIGHT} fontSize="13" fontFamily="Cinzel, serif" letterSpacing="2">
        <textPath href={`#${id}-bot`} startOffset="50%" textAnchor="middle">ADOAGYIRI</textPath>
      </text>
      <circle cx="27" cy="100" r="3" fill={GOLD} />
      <circle cx="173" cy="100" r="3" fill={GOLD} />
      <circle cx="85" cy="80" r="24" fill="none" stroke={GREEN} strokeWidth="5" />
      <circle cx="115" cy="80" r="24" fill="none" stroke={BLUE} strokeWidth="5" />
      <circle cx="85" cy="80" r="24" fill="none" stroke={GOLD} strokeWidth="1" />
      <circle cx="115" cy="80" r="24" fill="none" stroke={GOLD} strokeWidth="1" />
      <g transform="translate(100,140)">
        <path d="M -30 8 Q -10 -18 20 -14 Q 40 -12 46 -26 Q 34 -18 20 -18 Q 36 -30 38 -42 Q 22 -28 8 -22 Q -2 -18 -8 -8 Z" fill={GOLD} />
        <circle cx="-24" cy="0" r="3.4" fill={MAROON_DARK} />
        <line x1="-30" y1="8" x2="-30" y2="24" stroke={GOLD} strokeWidth="3" />
        <circle cx="-30" cy="30" r="6" fill="none" stroke={GOLD} strokeWidth="3" />
      </g>
      <circle cx="100" cy="100" r="96" fill={`url(#${id}-sheen)`} />
    </svg>
  );
}

function BadgeBack({ size }) {
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-hidden="true">
      <circle cx="100" cy="100" r="96" fill={MAROON_DARK} stroke={GOLD} strokeWidth="4" />
      <circle cx="100" cy="100" r="80" fill="none" stroke={GOLD} strokeWidth="1.5" />
      <text x="100" y="112" textAnchor="middle" fill={GOLD_LIGHT} fontSize="46" fontFamily="Cinzel, serif" fontWeight="700">AAA</text>
      <text x="100" y="140" textAnchor="middle" fill={GOLD} fontSize="12" fontFamily="Cinzel, serif" letterSpacing="3">EST. FAMILY</text>
    </svg>
  );
}

/**
 * A coin-like medallion that spins in 3D (CSS transform-style: preserve-3d).
 * spinSeconds controls speed; pass 0 to render it static (front-facing only).
 */
export default function Badge3D({ size = 100, spinSeconds = 14 }) {
  const scene = { width: size, height: size, perspective: 900 };
  const spin = spinSeconds > 0;
  return (
    <div style={{ width: scene.width, height: scene.height, perspective: scene.perspective }}>
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          transformStyle: "preserve-3d",
          animation: spin ? `badgeSpin ${spinSeconds}s linear infinite` : "none",
          filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.45))",
        }}
      >
        <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden" }}>
          <BadgeFace size={size} />
        </div>
        <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
          <BadgeBack size={size} />
        </div>
      </div>
    </div>
  );
}
