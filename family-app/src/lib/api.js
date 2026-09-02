import { supabase } from "./supabaseClient.js";

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

export async function countMembers() {
  const { count, error } = await supabase.from("members").select("*", { count: "exact", head: true });
  if (error) throw error;
  return count || 0;
}

export async function addMember(record) {
  const { error } = await supabase.from("members").insert(record);
  if (error) throw error;
}

export async function addPayment(kind, record) {
  const { error } = await supabase.from(kind).insert(record);
  if (error) throw error;
}

export async function verifyPayment(kind, id, status, adminSecret) {
  const res = await fetch("/api/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, id, status, adminSecret }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || "Could not update payment");
  return body;
}

export async function checkAdminPin(adminSecret) {
  const res = await fetch("/api/admin-check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminSecret }),
  });
  const body = await res.json();
  if (!res.ok) return false;
  return !!body.ok;
}

export function subscribeToChanges(onChange) {
  const channel = supabase
    .channel("family-app-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "members" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "donations" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "dues" }, onChange)
    .subscribe();
  return () => supabase.removeChannel(channel);
}
