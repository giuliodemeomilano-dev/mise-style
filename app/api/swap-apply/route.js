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

export async function POST(request) {
  if (!checkAuth(request)) {
    return Response.json({ ok: false, error: "Non autorizzato" }, { status: 401 });
  }

  try {
    const { item_id, new_external_id, outfit_id } = await request.json();

    if (!item_id || !new_external_id || !outfit_id) {
      return Response.json(
        { ok: false, error: "item_id, new_external_id e outfit_id richiesti" },
        { status: 400 }
      );
    }

    const supabase = admin();

    const { data: newProd, error: prodErr } = await supabase
      .from("products")
      .select("id, price")
      .eq("external_id", new_external_id)
      .single();

    if (prodErr || !newProd) {
      return Response.json(
        { ok: false, error: "Nuovo prodotto non trovato" },
        { status: 404 }
      );
    }

    const { error: updErr } = await supabase
      .from("outfit_items")
      .update({ product_id: newProd.id })
      .eq("id", item_id);

    if (updErr) {
      return Response.json(
        { ok: false, error: String(updErr.message || updErr) },
        { status: 500 }
      );
    }

    const { data: items, error: itemsErr } = await supabase
      .from("outfit_items")
      .select("products(price)")
      .eq("outfit_id", outfit_id);

    if (!itemsErr && items) {
      const total = items.reduce(
        (s, it) => s + (Number(it.products?.price) || 0),
        0
      );

      await supabase
        .from("outfits")
        .update({ total_price: total })
        .eq("id", outfit_id);
    }

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      { ok: false, error: String(err.message || err) },
      { status: 500 }
    );
  }
}
