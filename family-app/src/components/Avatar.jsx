import React from "react";

const PALETTE = ["#5A1D1D", "#1F5C3F", "#1F3F6B", "#8A5A12", "#6B2F5A"];

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

function initialsOf(name) {
  const parts = String(name || "?").trim().split(/\s+/);
  const chars = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() || "");
  return chars.join("") || "?";
}

export default function Avatar({ name, url, size = 44, border = "#C9A227" }) {
  const style = {
    width: size,
    height: size,
    borderRadius: "50%",
    objectFit: "cover",
    border: `1px solid ${border}`,
    flexShrink: 0,
  };

  if (url) {
    return <img src={url} alt={name} style={style} />;
  }

  const bg = PALETTE[hashString(name || "?") % PALETTE.length];
  return (
    <div
      style={{
        ...style,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: bg,
        color: "#F4EBD6",
        fontWeight: 600,
        fontSize: size * 0.38,
        fontFamily: "'Work Sans', sans-serif",
      }}
    >
      {initialsOf(name)}
    </div>
  );
}
