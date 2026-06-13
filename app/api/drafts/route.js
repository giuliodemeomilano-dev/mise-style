import { createClient } from "@supabase/supabase-js";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function checkAuth(request) {
  const pw = request.headers.get("x-admin-pw");
  return process.env.ADMIN_PASSWORD && pw === process.env.ADMIN_PASSWORD;
}

export async function GET(request) {
  if (!checkAuth(request)) {
    return Response.json({ ok: false, error: "Non autorizzato" }, { status: 401 });
  }
  try {
    const supabase = admin();
    const { data: drafts, error } = await supabase
      .from("outfits")
      .select("id, slug, title, description, mood, occasion, total_price, hero_image_url, generated_at")
      .eq("status", "draft")
      .order("generated_at", { ascending: false });
    if (error) throw new Error(error.message);
    const withItems = [];
    for (const d of drafts || []) {
      const { data: items } = await supabase
        .from("outfit_items")
        .select("role, position, products(brand, name, price, packshot_url, image_url)")
        .eq("outfit_id", d.id)
        .order("position", { ascending: true });
      withItems.push({ ...d, items: items || [] });
    }
    return Response.json({ ok: true, drafts: withItems });
  } catch (err) {
    return Response.json({ ok: false, error: String(err.message || err) }, { status: 500 });
  }
}

export async function POST(request) {
  if (!checkAuth(request)) {
    return Response.json({ ok: false, error: "Non autorizzato" }, { status: 401 });
  }
  try {
    const { id, action } = await request.json();
    if (!id || !action) {
      return Response.json({ ok: false, error: "id e action richiesti" }, { status: 400 });
    }
    const supabase = admin();
    if (action === "publish") {
      const { error } = await supabase
        .from("outfits")
        .update({ status: "active", published_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw new Error(error.message);
      return Response.json({ ok: true, action: "publish", id });
    }
    if (action === "discard") {
      await supabase.from("outfit_items").delete().eq("outfit_id", id);
      const { error } = await supabase.from("outfits").delete().eq("id", id);
      if (error) throw new Error(error.message);
      return Response.json({ ok: true, action: "discard", id });
    }
    return Response.json({ ok: false, error: "action non valida" }, { status: 400 });
  } catch (err) {
    return Response.json({ ok: false, error: String(err.message || err) }, { status: 500 });
  }
}
