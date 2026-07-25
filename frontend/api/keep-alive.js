/**
 * Vercel Cron → light Supabase REST ping so free DB stays awake.
 * Schedule: vercel.json crons. Hobby = once per day max.
 */
export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, POST, HEAD");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.authorization ?? "";
    if (auth !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }
  }

  const supabaseUrl = (
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    ""
  ).replace(/\/$/, "");
  const supabaseKey =
    process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({
      ok: false,
      error: "Missing SUPABASE_URL / SUPABASE_ANON_KEY (or VITE_*) env vars",
    });
  }

  try {
    // Tiny SELECT hits Postgres (REST OpenAPI alone is not enough to unpause DB).
    const pingUrl = `${supabaseUrl}/rest/v1/tasks?select=id&limit=1`;
    const ping = await fetch(pingUrl, {
      method: "GET",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Accept: "application/json",
      },
    });

    const bodyText = await ping.text();
    if (!ping.ok) {
      return res.status(502).json({
        ok: false,
        status: ping.status,
        error: bodyText.slice(0, 300) || ping.statusText,
      });
    }

    return res.status(200).json({
      ok: true,
      at: new Date().toISOString(),
      status: ping.status,
    });
  } catch (error) {
    return res.status(502).json({
      ok: false,
      error: error?.message || "Keep-alive ping failed",
    });
  }
}
