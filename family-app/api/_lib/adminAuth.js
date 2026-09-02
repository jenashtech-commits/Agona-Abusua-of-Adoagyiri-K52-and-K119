import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * Verifies the Supabase Auth access token sent in the Authorization header,
 * then checks the resulting email against the `admins` allowlist table.
 * Returns the admin's email if authorized, otherwise null.
 */
export async function getAdminEmail(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user?.email) return null;

  const email = userData.user.email.toLowerCase();
  const { data: row, error: adminError } = await supabaseAdmin
    .from("admins")
    .select("email")
    .eq("email", email)
    .maybeSingle();

  if (adminError || !row) return null;
  return email;
}
