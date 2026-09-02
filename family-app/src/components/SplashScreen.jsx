import React, { useEffect, useState } from "react";
import Badge3D from "./Badge3D.jsx";

const MAROON_DARK = "#2C0F0F";
const MAROON = "#5A1D1D";
const GOLD = "#C9A227";
const GOLD_LIGHT = "#E8C766";

export default function SplashScreen({ visible }) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!visible) {
      const t = setTimeout(() => setDismissed(true), 550);
      return () => clearTimeout(t);
    }
  }, [visible]);

  if (dismissed) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: `radial-gradient(circle at 50% 38%, ${MAROON} 0%, ${MAROON_DARK} 70%)`,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.5s ease",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <div style={{ animation: "splashPop 0.9s cubic-bezier(0.2, 0.9, 0.3, 1.2)" }}>
        <Badge3D size={150} spinSeconds={3.2} />
      </div>
      <h1
        style={{
          fontFamily: "Cinzel, serif",
          color: GOLD_LIGHT,
          fontSize: 22,
          letterSpacing: 1,
          margin: "22px 0 6px",
          opacity: 0,
          animation: "splashFadeIn 0.8s ease 0.5s forwards",
          textAlign: "center",
          padding: "0 20px",
        }}
      >
        Agona Abusua Adoagyiri
      </h1>
      <p
        style={{
          color: "#D8C48F",
          fontSize: 13,
          margin: 0,
          opacity: 0,
          animation: "splashFadeIn 0.8s ease 0.7s forwards",
        }}
      >
        Family registry, live
      </p>
      <div style={{ width: 140, height: 3, background: "rgba(201,162,39,0.25)", borderRadius: 2, marginTop: 26, overflow: "hidden" }}>
        <div style={{ height: "100%", width: "40%", background: GOLD, borderRadius: 2, animation: "splashBar 1.1s ease-in-out infinite" }} />
      </div>
    </div>
  );
}
