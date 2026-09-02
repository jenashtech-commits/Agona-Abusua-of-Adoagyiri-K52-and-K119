import { getAdminEmail } from "./_lib/adminAuth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const email = await getAdminEmail(req);
  return res.status(200).json({ ok: !!email, email: email || null });
}
