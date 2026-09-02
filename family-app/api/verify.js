import { supabaseAdmin, getAdminEmail } from "./_lib/adminAuth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const email = await getAdminEmail(req);
  if (!email) {
    return res.status(401).json({ error: "Not signed in as an admin" });
  }

  const { kind, id, status } = req.body || {};
  if (!["donations", "dues"].includes(kind)) {
    return res.status(400).json({ error: "Invalid payment type" });
  }
  if (!["verified", "rejected"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  if (!id) {
    return res.status(400).json({ error: "Missing record id" });
  }

  const { error } = await supabaseAdmin.from(kind).update({ status }).eq("id", id);
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  return res.status(200).json({ ok: true });
}
