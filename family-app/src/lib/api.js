import { supabase } from "./supabaseClient.js";
import * as XLSX from "xlsx";

export async function fetchMembers() {
  const { data, error } = await supabase.from("members").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function fetchPayments(kind) {
  const { data, error } = await supabase.from(kind).select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

function squareCanvasFromImage(img, size) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const side = Math.min(img.width, img.height);
  const sx = (img.width - side) / 2;
  const sy = (img.height - side) / 2;
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
  return canvas;
}

export function resizeToSquareDataUrl(file, size = 480) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not read image"));
      img.onload = () => resolve(squareCanvasFromImage(img, size).toDataURL("image/jpeg", 0.82));
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function squareBlobFromFile(file, size = 480) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not read image"));
      img.onload = () => {
        const canvas = squareCanvasFromImage(img, size);
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not process image"))), "image/jpeg", 0.82);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export async function uploadMemberPhoto(file) {
  const blob = await squareBlobFromFile(file, 480);
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error: uploadError } = await supabase.storage.from("photos").upload(path, blob, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (uploadError) throw uploadError;
  const { data } = supabase.storage.from("photos").getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Inserts a member. member_no is assigned automatically by a database
 * trigger (see supabase-schema-update.sql), so it should not be supplied
 * here — this avoids two people registering at the same instant getting
 * the same member number.
 */
export async function addMember(record) {
  const { data, error } = await supabase.from("members").insert(record).select().single();
  if (error) throw error;
  return data;
}

export async function addPayment(kind, record) {
  const { error } = await supabase.from(kind).insert(record);
  if (error) throw error;
}

/* ---------------- Admin auth (Supabase Auth + admins allowlist) ---------------- */

export async function signInAdmin(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signOutAdmin() {
  await supabase.auth.signOut();
}

async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

export async function hasAdminSession() {
  const token = await getAccessToken();
  if (!token) return false;
  try {
    const res = await fetch("/api/admin-session", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    return !!body.ok;
  } catch {
    return false;
  }
}

export async function verifyPayment(kind, id, status) {
  const token = await getAccessToken();
  const res = await fetch("/api/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ kind, id, status }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || "Could not update payment");
  return body;
}

/* ---------------- Realtime ---------------- */

export function subscribeToChanges(onChange, onStatusChange) {
  const channel = supabase
    .channel("family-app-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "members" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "donations" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "dues" }, onChange)
    .subscribe((status) => onStatusChange && onStatusChange(status));
  return () => supabase.removeChannel(channel);
}

/* ---------------- Bulk Excel import ---------------- */

const HEADER_ALIASES = {
  name: ["name", "full name", "fullname", "member name"],
  phone: ["phone", "phone number", "mobile", "contact"],
  gender: ["gender", "sex"],
  dob: ["dob", "date of birth", "birthday", "birth date"],
  residence: ["residence", "location", "address", "town"],
  role: ["role", "position", "family role"],
};

function normalizeHeader(h) {
  return String(h || "").trim().toLowerCase();
}

function mapRow(rawRow) {
  const out = {};
  const keys = Object.keys(rawRow);
  for (const field of Object.keys(HEADER_ALIASES)) {
    const matchKey = keys.find((k) => HEADER_ALIASES[field].includes(normalizeHeader(k)));
    out[field] = matchKey ? rawRow[matchKey] : "";
  }
  return out;
}

function toIsoDate(value) {
  if (!value) return "";
  if (value instanceof Date && !isNaN(value)) {
    return value.toISOString().slice(0, 10);
  }
  const parsed = new Date(value);
  if (!isNaN(parsed)) return parsed.toISOString().slice(0, 10);
  return "";
}

/**
 * Parses an uploaded spreadsheet (.xlsx, .xls, .csv) into normalized member
 * rows, separating valid rows from ones missing required fields.
 */
export async function parseMembersSpreadsheet(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  const valid = [];
  const skipped = [];

  rawRows.forEach((raw, idx) => {
    const mapped = mapRow(raw);
    const dob = toIsoDate(mapped.dob);
    const name = String(mapped.name || "").trim();
    const phone = String(mapped.phone || "").trim();

    if (!name || !phone || !dob) {
      skipped.push({ row: idx + 2, reason: !name ? "Missing name" : !phone ? "Missing phone" : "Missing/invalid date of birth" });
      return;
    }

    valid.push({
      name,
      phone,
      gender: String(mapped.gender || "").trim(),
      dob,
      residence: String(mapped.residence || "").trim(),
      role: String(mapped.role || "").trim(),
      photo_url: null,
    });
  });

  return { valid, skipped, total: rawRows.length };
}

export function downloadMemberTemplate() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet([
    { Name: "Kwame Boateng", Phone: "0240000000", Gender: "Male", DOB: "1990-05-14", Residence: "Adoagyiri, Nsawam", Role: "Elder" },
  ]);
  XLSX.utils.book_append_sheet(wb, ws, "Members");
  XLSX.writeFile(wb, "member-import-template.xlsx");
}

export async function importMembers(rows, onProgress) {
  let done = 0;
  const failures = [];
  for (const row of rows) {
    try {
      await addMember(row);
    } catch (err) {
      failures.push({ name: row.name, error: err.message });
    }
    done += 1;
    onProgress && onProgress(done, rows.length);
  }
  return { imported: rows.length - failures.length, failures };
}

/* ---------------- Excel export ---------------- */

export function exportReportToExcel(members, donations, dues) {
  const wb = XLSX.utils.book_new();

  const memberRows = members.map((m) => ({
    "Member No": m.member_no,
    Name: m.name,
    Phone: m.phone,
    Gender: m.gender,
    "Date of Birth": m.dob,
    Residence: m.residence,
    Role: m.role,
    "Registered on": m.created_at ? new Date(m.created_at).toLocaleDateString() : "",
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(memberRows), "Members");

  const donationRows = donations.map((d) => ({
    Member: d.member_name,
    "Amount (GHS)": d.amount,
    Network: d.network,
    Reference: d.ref,
    Note: d.note,
    Status: d.status,
    Date: d.created_at ? new Date(d.created_at).toLocaleDateString() : "",
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(donationRows), "Donations");

  const duesRows = dues.map((d) => ({
    Member: d.member_name,
    Period: d.period,
    "Amount (GHS)": d.amount,
    Network: d.network,
    Reference: d.ref,
    Status: d.status,
    Date: d.created_at ? new Date(d.created_at).toLocaleDateString() : "",
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(duesRows), "Dues");

  const filename = `agona-abusua-adoagyiri-report-${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}
