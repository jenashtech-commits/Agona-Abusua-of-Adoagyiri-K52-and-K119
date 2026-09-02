export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { adminSecret } = req.body || {};
  const ok = !!process.env.ADMIN_SECRET && adminSecret === process.env.ADMIN_SECRET;
  return res.status(200).json({ ok });
}
