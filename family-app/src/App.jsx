import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  fetchMembers,
  fetchPayments,
  addMember,
  addPayment,
  uploadMemberPhoto,
  resizeToSquareDataUrl,
  countMembers,
  verifyPayment,
  checkAdminPin,
  subscribeToChanges,
} from "./lib/api.js";

/* ---------- design tokens ---------- */
const GOLD = "#C9A227";
const GOLD_LIGHT = "#E8C766";
const MAROON = "#5A1D1D";
const MAROON_DARK = "#3C1414";
const GREEN = "#1F5C3F";
const BLUE = "#1F3F6B";
const PARCHMENT = "#F4EBD6";
const INK = "#241914";

const fmtGHS = (n) =>
  "GH₵ " + Number(n || 0).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

/* ---------- SVG family badge (original rendition inspired by the crest's motifs) ---------- */
function Badge({ size = 100 }) {
  const id = "badge";
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-label="Agona Abusua Adoagyiri badge">
      <defs>
        <path id={`${id}-top`} d="M 30 100 A 70 70 0 0 1 170 100" />
        <path id={`${id}-bot`} d="M 40 150 A 62 62 0 0 0 160 150" />
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
    </svg>
  );
}

/* ---------- generic UI atoms ---------- */
function Section({ title, children }) {
  return (
    <div style={{ background: PARCHMENT, border: `1px solid ${GOLD}`, borderRadius: 4, padding: "20px 18px", marginBottom: 16 }}>
      <h2 style={{ fontFamily: "Cinzel, serif", fontSize: 17, color: MAROON, margin: "0 0 14px", fontWeight: 600, borderBottom: `1px solid ${GOLD}`, paddingBottom: 8 }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 13, color: INK, marginBottom: 4, fontWeight: 500 }}>
        {label} {required && <span style={{ color: MAROON }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 10px",
  border: `1px solid #C7B98E`,
  borderRadius: 3,
  fontSize: 14,
  background: "#fff",
  color: INK,
  fontFamily: "'Work Sans', sans-serif",
};

const btnPrimary = {
  background: MAROON,
  color: GOLD_LIGHT,
  border: `1px solid ${MAROON_DARK}`,
  borderRadius: 3,
  padding: "10px 20px",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "'Work Sans', sans-serif",
};

const btnGhost = {
  background: "transparent",
  color: MAROON,
  border: `1px solid ${MAROON}`,
  borderRadius: 3,
  padding: "8px 14px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "'Work Sans', sans-serif",
};

function StatusPill({ status }) {
  const map = {
    pending: { bg: "#F1E0B0", fg: "#6B4E00", label: "Pending" },
    verified: { bg: "#CFE7D6", fg: GREEN, label: "Verified" },
    rejected: { bg: "#F0C9C9", fg: "#7A1F1F", label: "Rejected" },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{ background: s.bg, color: s.fg, fontSize: 12, fontWeight: 600, padding: "2px 9px", borderRadius: 10 }}>
      {s.label}
    </span>
  );
}

/* ---------- main app ---------- */
export default function App() {
  const [tab, setTab] = useState("register");
  const [members, setMembers] = useState([]);
  const [donations, setDonations] = useState([]);
  const [dues, setDues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  const loadAll = useCallback(async () => {
    try {
      const [m, d, u] = await Promise.all([fetchMembers(), fetchPayments("donations"), fetchPayments("dues")]);
      setMembers(m);
      setDonations(d);
      setDues(u);
    } catch (e) {
      showToast("Could not load data. Check your connection and try again.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
    const unsubscribe = subscribeToChanges(() => loadAll());
    return unsubscribe;
  }, [loadAll]);

  const tabs = [
    ["register", "Register"],
    ["donate", "Donate"],
    ["dues", "Pay dues"],
    ["birthdays", "Birthdays"],
    ["flyer", "Birthday flyer"],
    ["admin", "Admin"],
  ];

  return (
    <div style={{ fontFamily: "'Work Sans', sans-serif", background: "#EDE3C8", minHeight: "100vh" }}>
      <header style={{ background: MAROON, padding: "26px 16px 22px", textAlign: "center", borderBottom: `4px solid ${GOLD}` }}>
        <Badge size={88} />
        <h1 style={{ fontFamily: "Cinzel, serif", color: GOLD_LIGHT, fontSize: 22, margin: "10px 0 2px", letterSpacing: 1 }}>
          Agona Abusua Adoagyiri
        </h1>
        <p style={{ color: "#E4D2A8", fontSize: 13, margin: 0 }}>Membership · Donations · Dues</p>
      </header>

      <nav style={{ display: "flex", flexWrap: "wrap", background: MAROON_DARK, borderBottom: `1px solid ${GOLD}` }}>
        {tabs.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              flex: "1 1 auto",
              minWidth: 90,
              background: "transparent",
              border: "none",
              borderBottom: tab === key ? `3px solid ${GOLD}` : "3px solid transparent",
              color: tab === key ? GOLD_LIGHT : "#C9B98E",
              padding: "12px 6px",
              fontSize: 13,
              fontWeight: tab === key ? 600 : 500,
              cursor: "pointer",
              fontFamily: "'Work Sans', sans-serif",
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "18px 14px 40px" }}>
        {loading ? (
          <p style={{ textAlign: "center", color: MAROON, padding: 40 }}>Loading family records…</p>
        ) : (
          <>
            {tab === "register" && <RegisterTab refresh={loadAll} showToast={showToast} />}
            {tab === "donate" && <PaymentTab kind="donations" title="Make a donation" members={members} refresh={loadAll} showToast={showToast} />}
            {tab === "dues" && <PaymentTab kind="dues" title="Pay your dues" members={members} refresh={loadAll} showToast={showToast} />}
            {tab === "birthdays" && <BirthdaysTab members={members} />}
            {tab === "flyer" && <FlyerTab members={members} />}
            {tab === "admin" && (
              <AdminTab members={members} donations={donations} dues={dues} refresh={loadAll} showToast={showToast} />
            )}
          </>
        )}
      </main>

      {toast && (
        <div style={{ position: "fixed", left: "50%", bottom: 20, transform: "translateX(-50%)", background: INK, color: GOLD_LIGHT, padding: "10px 18px", borderRadius: 4, fontSize: 13, maxWidth: "90%", textAlign: "center", boxShadow: "0 2px 10px rgba(0,0,0,0.3)", zIndex: 50 }}>
          {toast}
        </div>
      )}
    </div>
  );
}

/* ---------- Register ---------- */
function RegisterTab({ refresh, showToast }) {
  const [form, setForm] = useState({ name: "", phone: "", gender: "", dob: "", residence: "", role: "" });
  const [photoFile, setPhotoFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [photoError, setPhotoError] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handlePhoto = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoError("Please choose an image file.");
      return;
    }
    try {
      const dataUrl = await resizeToSquareDataUrl(file);
      setPreview(dataUrl);
      setPhotoFile(file);
      setPhotoError("");
    } catch {
      setPhotoError("Could not process that image. Try another photo.");
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.dob) {
      showToast("Fill in name, phone and date of birth.");
      return;
    }
    if (!photoFile) {
      setPhotoError("A profile photo is required to complete registration.");
      return;
    }
    setSaving(true);
    try {
      const photoUrl = await uploadMemberPhoto(photoFile);
      const existing = await countMembers();
      const memberNo = "AAA-" + String(existing + 1).padStart(4, "0");
      await addMember({
        member_no: memberNo,
        name: form.name,
        phone: form.phone,
        gender: form.gender,
        dob: form.dob,
        residence: form.residence,
        role: form.role,
        photo_url: photoUrl,
      });
      showToast(`Welcome, ${form.name}! Membership no. ${memberNo} registered.`);
      setForm({ name: "", phone: "", gender: "", dob: "", residence: "", role: "" });
      setPhotoFile(null);
      setPreview(null);
      if (fileRef.current) fileRef.current.value = "";
      refresh();
    } catch (err) {
      showToast("Registration could not be saved. Check your connection and try again.");
    }
    setSaving(false);
  };

  return (
    <Section title="Membership registration">
      <p style={{ fontSize: 13, color: "#5A4A2E", marginTop: -6, marginBottom: 16 }}>
        This registry is shared with everyone using this app, so family officers can see who has joined. A profile photo is required.
      </p>
      <form onSubmit={submit}>
        <Field label="Full name" required>
          <input style={inputStyle} value={form.name} onChange={set("name")} placeholder="e.g. Kwame Boateng" />
        </Field>
        <Field label="Phone number" required>
          <input style={inputStyle} value={form.phone} onChange={set("phone")} placeholder="024 000 0000" />
        </Field>
        <Field label="Gender">
          <select style={inputStyle} value={form.gender} onChange={set("gender")}>
            <option value="">Select</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </Field>
        <Field label="Date of birth" required>
          <input type="date" style={inputStyle} value={form.dob} onChange={set("dob")} />
        </Field>
        <Field label="Place of residence">
          <input style={inputStyle} value={form.residence} onChange={set("residence")} placeholder="e.g. Adoagyiri, Nsawam" />
        </Field>
        <Field label="Role in the family (optional)">
          <input style={inputStyle} value={form.role} onChange={set("role")} placeholder="e.g. Youth, Elder, Executive" />
        </Field>
        <Field label="Profile photo" required>
          <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ fontSize: 13 }} />
          {photoError && <p style={{ color: "#A32D2D", fontSize: 12, marginTop: 6 }}>{photoError}</p>}
          {preview && (
            <img src={preview} alt="Preview" style={{ width: 84, height: 84, objectFit: "cover", borderRadius: "50%", border: `2px solid ${GOLD}`, marginTop: 10 }} />
          )}
        </Field>
        <button type="submit" style={btnPrimary} disabled={saving}>
          {saving ? "Registering…" : "Register member"}
        </button>
      </form>
    </Section>
  );
}

/* ---------- Donations / Dues (shared shape) ---------- */
function PaymentTab({ kind, title, members, refresh, showToast }) {
  const [memberId, setMemberId] = useState("");
  const [amount, setAmount] = useState("");
  const [network, setNetwork] = useState("MTN MoMo");
  const [ref, setRef] = useState("");
  const [period, setPeriod] = useState(MONTHS[new Date().getMonth()] + " " + new Date().getFullYear());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!memberId || !amount || !ref.trim()) {
      showToast("Select your name, enter an amount and the MoMo reference.");
      return;
    }
    const member = members.find((m) => m.id === memberId);
    setSaving(true);
    try {
      await addPayment(kind, {
        member_id: memberId,
        member_name: member ? member.name : "Unknown",
        amount: Number(amount),
        network,
        ref: ref.trim(),
        note,
        status: "pending",
        ...(kind === "dues" ? { period } : {}),
      });
      showToast("Submitted. An admin will verify your payment against the MoMo reference.");
      setAmount("");
      setRef("");
      setNote("");
      refresh();
    } catch {
      showToast("Could not submit right now. Check your connection and try again.");
    }
    setSaving(false);
  };

  if (members.length === 0) {
    return (
      <Section title={title}>
        <p style={{ fontSize: 14, color: "#5A4A2E" }}>No members are registered yet. Register on the Register tab first.</p>
      </Section>
    );
  }

  return (
    <Section title={title}>
      <p style={{ fontSize: 13, color: "#5A4A2E", marginTop: -6, marginBottom: 16 }}>
        Send the amount to the family MoMo number, then record it here with the reference code from your MoMo message. An admin verifies it before it counts.
      </p>
      <form onSubmit={submit}>
        <Field label="Your name" required>
          <select style={inputStyle} value={memberId} onChange={(e) => setMemberId(e.target.value)}>
            <option value="">Select your name</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name} ({m.member_no})</option>
            ))}
          </select>
        </Field>
        {kind === "dues" && (
          <Field label="Dues period">
            <input style={inputStyle} value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="e.g. August 2026" />
          </Field>
        )}
        <Field label="Amount (GH₵)" required>
          <input type="number" min="0" step="0.01" style={inputStyle} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
        </Field>
        <Field label="Paid via">
          <select style={inputStyle} value={network} onChange={(e) => setNetwork(e.target.value)}>
            <option>MTN MoMo</option>
            <option>Vodafone Cash</option>
            <option>AirtelTigo Money</option>
            <option>Bank transfer</option>
          </select>
        </Field>
        <Field label="MoMo / transaction reference" required>
          <input style={inputStyle} value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. 1009AB..." />
        </Field>
        <Field label="Note (optional)">
          <input style={inputStyle} value={note} onChange={(e) => setNote(e.target.value)} placeholder={kind === "donations" ? "e.g. Building fund" : ""} />
        </Field>
        <button type="submit" style={btnPrimary} disabled={saving}>
          {saving ? "Submitting…" : "Submit for verification"}
        </button>
      </form>
    </Section>
  );
}

/* ---------- Birthdays ---------- */
function daysUntilNextBirthday(dobStr) {
  const dob = new Date(dobStr + "T00:00:00");
  if (isNaN(dob)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let next = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
  if (next < today) next = new Date(today.getFullYear() + 1, dob.getMonth(), dob.getDate());
  const diff = Math.round((next - today) / 86400000);
  const turning = next.getFullYear() - dob.getFullYear();
  return { diff, date: next, turning };
}

function BirthdaysTab({ members }) {
  const withDob = members.filter((m) => m.dob);
  const upcoming = withDob
    .map((m) => ({ m, info: daysUntilNextBirthday(m.dob) }))
    .filter((x) => x.info && x.info.diff <= 30)
    .sort((a, b) => a.info.diff - b.info.diff);

  const today = upcoming.filter((x) => x.info.diff === 0);
  const rest = upcoming.filter((x) => x.info.diff > 0);

  return (
    <>
      {today.length > 0 && (
        <div style={{ background: GOLD, border: `1px solid ${MAROON}`, borderRadius: 4, padding: "14px 16px", marginBottom: 16 }}>
          <strong style={{ color: MAROON_DARK, fontSize: 14 }}>
            Today's birthday{today.length > 1 ? "s" : ""}: {today.map((x) => x.m.name).join(", ")}
          </strong>
        </div>
      )}
      <Section title="Upcoming birthdays (next 30 days)">
        {rest.length === 0 && today.length === 0 ? (
          <p style={{ fontSize: 14, color: "#5A4A2E" }}>No birthdays coming up in the next 30 days.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {rest.map(({ m, info }) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, background: "#fff", border: "1px solid #E0D4AE", borderRadius: 4, padding: "10px 12px" }}>
                <img src={m.photo_url} alt={m.name} style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: `1px solid ${GOLD}` }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: INK }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: "#5A4A2E" }}>
                    {info.date.toLocaleDateString("en-GB", { day: "numeric", month: "long" })} · turning {info.turning}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: MAROON, fontWeight: 600 }}>
                  {info.diff === 1 ? "Tomorrow" : `In ${info.diff} days`}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}

/* ---------- Birthday flyer ---------- */
function FlyerTab({ members }) {
  const withDob = members.filter((m) => m.dob);
  const [memberId, setMemberId] = useState("");
  const canvasRef = useRef(null);

  useEffect(() => {
    if (withDob.length && !memberId) {
      const todays = withDob.find((m) => daysUntilNextBirthday(m.dob)?.diff === 0);
      setMemberId((todays || withDob[0]).id);
    }
  }, [withDob, memberId]);

  const member = withDob.find((m) => m.id === memberId);

  const drawArcText = (ctx, text, cx, cy, radius, startAngle, clockwise, font, color) => {
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = font;
    ctx.textBaseline = "middle";
    const dir = clockwise ? 1 : -1;
    let angle = startAngle;
    const widths = [...text].map((ch) => ctx.measureText(ch).width);
    const total = widths.reduce((a, b) => a + b, 0);
    const totalAngle = (total / radius) * dir;
    angle -= totalAngle / 2;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const chArc = (widths[i] / radius) * dir;
      angle += chArc / 2;
      const x = cx + radius * Math.sin(angle);
      const y = cy - radius * Math.cos(angle);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.textAlign = "center";
      ctx.fillText(ch, 0, 0);
      ctx.restore();
      angle += chArc / 2;
    }
    ctx.restore();
  };

  useEffect(() => {
    if (!member || !canvasRef.current || !member.photo_url) return;
    const canvas = canvasRef.current;
    const size = 900;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    const draw = (photoImg) => {
      ctx.fillStyle = MAROON_DARK;
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 14;
      ctx.strokeRect(28, 28, size - 56, size - 56);
      ctx.lineWidth = 2;
      ctx.strokeRect(46, 46, size - 92, size - 92);

      drawArcText(ctx, "AGONA ABUSUA  •  ADOAGYIRI", size / 2, size / 2, 400, Math.PI, true, "600 22px Cinzel, serif", GOLD_LIGHT);

      const photoR = 155;
      const cx = size / 2;
      const cy = 340;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, photoR, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fillStyle = "#000";
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.drawImage(photoImg, cx - photoR, cy - photoR, photoR * 2, photoR * 2);
      ctx.restore();
      ctx.lineWidth = 8;
      ctx.strokeStyle = GOLD;
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = GOLD;
      ctx.textAlign = "center";
      ctx.font = "700 54px Cinzel, serif";
      ctx.fillText("Happy Birthday", size / 2, 560);

      ctx.fillStyle = "#F4EBD6";
      ctx.font = "600 40px Work Sans, sans-serif";
      ctx.fillText(member.name, size / 2, 625);

      ctx.fillStyle = "#C9B98E";
      ctx.font = "400 22px Work Sans, sans-serif";
      const dob = new Date(member.dob + "T00:00:00");
      ctx.fillText(
        `${dob.toLocaleDateString("en-GB", { day: "numeric", month: "long" })} · from the ${member.name.split(" ").slice(-1)[0]} household`,
        size / 2,
        665
      );

      ctx.fillStyle = GOLD_LIGHT;
      ctx.font = "500 20px Work Sans, sans-serif";
      ctx.fillText("With love from your Agona Abusua Adoagyiri family", size / 2, size - 70);
    };

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => draw(img);
    img.src = member.photo_url;
  }, [member]);

  const download = () => {
    if (!canvasRef.current || !member) return;
    try {
      const link = document.createElement("a");
      link.download = `birthday-${member.name.replace(/\s+/g, "-").toLowerCase()}.png`;
      link.href = canvasRef.current.toDataURL("image/png");
      link.click();
    } catch {
      // Canvas may be tainted if the storage bucket isn't public; the README covers this.
    }
  };

  if (withDob.length === 0) {
    return (
      <Section title="Birthday flyer">
        <p style={{ fontSize: 14, color: "#5A4A2E" }}>No members with a date of birth yet. Register members first.</p>
      </Section>
    );
  }

  return (
    <Section title="Birthday flyer">
      <Field label="Celebrant">
        <select style={inputStyle} value={memberId} onChange={(e) => setMemberId(e.target.value)}>
          {withDob.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </Field>
      <div style={{ display: "flex", justifyContent: "center", margin: "14px 0" }}>
        <canvas ref={canvasRef} style={{ width: "100%", maxWidth: 420, borderRadius: 4, border: `1px solid ${GOLD}` }} />
      </div>
      <button style={btnPrimary} onClick={download}>Download flyer</button>
    </Section>
  );
}

/* ---------- Admin ---------- */
function AdminTab({ members, donations, dues, refresh, showToast }) {
  const [pin, setPin] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(false);

  const submitPin = async (e) => {
    e.preventDefault();
    setChecking(true);
    try {
      const ok = await checkAdminPin(pin);
      if (ok) setUnlocked(true);
      else showToast("Incorrect admin code.");
    } catch {
      showToast("Could not check the admin code. Try again.");
    }
    setChecking(false);
  };

  const verify = async (kind, record, status) => {
    try {
      await verifyPayment(kind, record.id, status, pin);
      showToast(`Marked ${status}.`);
      refresh();
    } catch {
      showToast("Could not update. Try again.");
    }
  };

  if (!unlocked) {
    return (
      <Section title="Admin sign-in">
        <p style={{ fontSize: 13, color: "#5A4A2E", marginTop: -6, marginBottom: 16 }}>
          Enter the family officers' admin code to verify payments. This is checked on the server against the ADMIN_SECRET set in your deployment, not stored in the app itself.
        </p>
        <form onSubmit={submitPin} style={{ display: "flex", gap: 8 }}>
          <input type="password" style={inputStyle} value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Admin code" />
          <button type="submit" style={btnPrimary} disabled={checking}>{checking ? "Checking…" : "Unlock"}</button>
        </form>
      </Section>
    );
  }

  const verifiedDonations = donations.filter((d) => d.status === "verified").reduce((s, d) => s + Number(d.amount), 0);
  const verifiedDues = dues.filter((d) => d.status === "verified").reduce((s, d) => s + Number(d.amount), 0);
  const pendingCount = donations.filter((d) => d.status === "pending").length + dues.filter((d) => d.status === "pending").length;

  return (
    <>
      <Section title="Overview">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Stat label="Members" value={members.length} />
          <Stat label="Pending verification" value={pendingCount} />
          <Stat label="Donations verified" value={fmtGHS(verifiedDonations)} />
          <Stat label="Dues verified" value={fmtGHS(verifiedDues)} />
        </div>
      </Section>

      <Section title="Donations">
        <PaymentList kind="donations" records={donations} onVerify={verify} />
      </Section>

      <Section title="Dues">
        <PaymentList kind="dues" records={dues} onVerify={verify} />
      </Section>

      <Section title="Member directory">
        {members.length === 0 ? (
          <p style={{ fontSize: 14, color: "#5A4A2E" }}>No members registered yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {members.map((m) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, background: "#fff", border: "1px solid #E0D4AE", borderRadius: 4, padding: "8px 10px" }}>
                <img src={m.photo_url} alt={m.name} style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", border: `1px solid ${GOLD}` }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: INK }}>{m.name} <span style={{ color: "#8A7A50", fontWeight: 400 }}>· {m.member_no}</span></div>
                  <div style={{ fontSize: 12, color: "#5A4A2E" }}>{m.phone} {m.residence ? "· " + m.residence : ""}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}

function Stat({ label, value }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #E0D4AE", borderRadius: 4, padding: "12px 14px" }}>
      <div style={{ fontSize: 12, color: "#8A7A50" }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 600, color: MAROON }}>{value}</div>
    </div>
  );
}

function PaymentList({ kind, records, onVerify }) {
  if (records.length === 0) {
    return <p style={{ fontSize: 14, color: "#5A4A2E" }}>No {kind} recorded yet.</p>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {records.map((r) => (
        <div key={r.id} style={{ background: "#fff", border: "1px solid #E0D4AE", borderRadius: 4, padding: "10px 12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: INK }}>{r.member_name}</div>
              <div style={{ fontSize: 12, color: "#5A4A2E" }}>
                {fmtGHS(r.amount)} · {r.network} · ref {r.ref} {r.period ? `· ${r.period}` : ""}
              </div>
              {r.note && <div style={{ fontSize: 12, color: "#8A7A50" }}>{r.note}</div>}
            </div>
            <StatusPill status={r.status} />
          </div>
          {r.status === "pending" && (
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button style={{ ...btnGhost, borderColor: GREEN, color: GREEN }} onClick={() => onVerify(kind, r, "verified")}>Verify</button>
              <button style={{ ...btnGhost, borderColor: "#A32D2D", color: "#A32D2D" }} onClick={() => onVerify(kind, r, "rejected")}>Reject</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
