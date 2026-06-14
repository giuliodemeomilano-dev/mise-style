import { createClient } from "@supabase/supabase-js";

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function POST(request) {
  try {
    const { current_external_id, exclude = [] } = await request.json();
    if (!current_external_id) {
      return Response.json(
        { ok: false, error: "current_external_id mancante" },
        { status: 400 }
      );
    }
    const supabase = admin();
    const { data: current, error: curErr } = await supabase
      .from("products")
      .select("external_id, category, gender, price")
      .eq("external_id", current_external_id)
      .single();
    if (curErr || !current) {
      return Response.json(
        { ok: false, error: "Prodotto attuale non trovato" },
        { status: 404 }
      );
    }
    const excludeList = [current_external_id, ...exclude];
    const { data: candidates, error: candErr } = await supabase
      .from("products")
      .select(
        "external_id, name, brand, merchant, category, gender, price, image_url, packshot_url, affiliate_url"
      )
      .eq("in_stock", true)
      .eq("category", current.category)
      .eq("gender", current.gender)
      .not("external_id", "in", `(${excludeList.join(",")})`);
    if (candErr) {
      return Response.json(
        { ok: false, error: String(candErr.message || candErr) },
        { status: 500 }
      );
    }
    if (!candidates || candidates.length === 0) {
      return Response.json(
        {
          ok: false,
          error: "Nessun pezzo simile disponibile in questa categoria",
          reason: "no_alternatives",
        },
        { status: 200 }
      );
    }
    const refPrice = Number(current.price) || 0;
    candidates.sort(
      (a, b) =>
        Math.abs((Number(a.price) || 0) - refPrice) -
        Math.abs((Number(b.price) || 0) - refPrice)
    );
    const pool = candidates.slice(0, Math.min(3, candidates.length));
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    return Response.json({
      ok: true,
      product: {
        external_id: chosen.external_id,
        name: chosen.name,
        brand: chosen.brand,
        store: chosen.merchant,
        category: chosen.category,
        price: chosen.price,
        img: chosen.image_url,
        packshot: chosen.packshot_url || chosen.image_url,
        url: chosen.affiliate_url,
      },
      alternatives_count: candidates.length,
    });
  } catch (err) {
    return Response.json(
      { ok: false, error: String(err.message || err) },
      { status: 500 }
    );
  }
}
