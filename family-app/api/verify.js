import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { kind, id, status, adminSecret } = req.body || {};

  if (!process.env.ADMIN_SECRET || adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: "Invalid admin code" });
  }
  if (!["donations", "dues"].includes(kind)) {
    return res.status(400).json({ error: "Invalid payment type" });
  }
  if (!["verified", "rejected"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  if (!id) {
    return res.status(400).json({ error: "Missing record id" });
  }

  const { error } = await supabase.from(kind).update({ status }).eq("id", id);
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  return res.status(200).json({ ok: true });
}
