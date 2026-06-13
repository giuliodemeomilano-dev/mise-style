import { createClient } from "@supabase/supabase-js";

const STYLE_RULES = `Sei lo stylist di MISE, piattaforma europea di curatela moda premium-mix (unisex). Crei look combinando prodotti reali da un catalogo. Regole di stile MISE, NON negoziabili:
1. COERENZA: un look = un'idea sola. Stessa stagione, stesso registro (o tutto elegante o tutto casual, mai mescolati).
2. PALETTE: massimo 3 colori per look, ancorati sui neutri MISE (bianco, ecru, beige, navy, grigio, cuoio). Un solo colore accento. Mai due colori forti in conflitto.
3. STRUTTURA: ogni look deve avere capo-sotto (trousers/jeans) + capo-sopra (shirt/knitwear) + scarpe (shoes), stesso gender. Un dress sostituisce sopra+sotto. Capospalla (outerwear/jacket/coat) e bag opzionali ma graditi. MAI due capi della stessa categoria.
4. UN SOLO STATEMENT: se un pezzo è forte (prezzo alto o colore acceso), gli altri sono quieti. Mai due protagonisti.
5. PREZZO COERENTE: pezzi nella stessa fascia. Evita di abbinare un pezzo da 400+ con pezzi sotto i 100.
6. MULTI-BRAND incoraggiato: mischia COS, ARKET, Massimo Dutti. Usa solo external_id dalla lista fornita.
VALORI AMMESSI (usa ESATTAMENTE questi, minuscolo):
- mood: classic, edgy, minimal, romantic, statement
- occasion: brunch, date, evening, office, travel, weekend
- budget_tier: mid (totale sotto ~350), premium (sopra ~350)
- season: all-season, spring, summer
- role per ogni pezzo: hero (capo principale), top, bottom, shoes, support (capospalla), bag, accessory`;

export async function POST(request) {
  try {
    const adminPw = request.headers.get("x-admin-pw");
    if (!process.env.ADMIN_PASSWORD || adminPw !== process.env.ADMIN_PASSWORD) {
      return Response.json({ ok: false, error: "Non autorizzato" }, { status: 401 });
    }
    const { gender = "women", count = 3 } = await request.json();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { data: products, error: pErr } = await supabase
      .from("products")
      .select("external_id, brand, gender, category, name, color, price, image_url")
      .eq("in_stock", true)
      .eq("gender", gender);
    if (pErr) throw new Error("Supabase products: " + pErr.message);
    if (!products || products.length === 0) {
      return Response.json({ error: "Nessun prodotto attivo per questo gender" }, { status: 400 });
    }
    const byId = Object.fromEntries(products.map((p) => [p.external_id, p]));
    const catalog = products
      .map((p) => `${p.external_id} | ${p.brand} | ${p.category} | ${p.name}${p.color ? " | " + p.color : ""} | €${p.price}`)
      .join("\n");
    const prompt = `${STYLE_RULES}
CATALOGO DISPONIBILE (gender: ${gender}):
${catalog}
Genera ${count} look completi e distinti tra loro. Rispondi SOLO con JSON valido, nessun testo prima o dopo, nessun markdown. Formato:
{"looks":[{"title":"nome breve e distintivo (varia con colore+mood+occasione)","slug":"slug-url-lowercase-con-trattini","mood":"<mood ammesso>","occasion":"<occasion ammessa>","budget_tier":"<mid o premium>","season":"<season ammessa>","description":"1 frase","rationale":"1-2 frasi: perché questi pezzi insieme","items":[{"external_id":"...","role":"<hero|top|bottom|shoes|support|bag|accessory>"}]}]}
Ogni external_id deve essere presente nel catalogo sopra.`;
    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!aiRes.ok) {
      const errText = await aiRes.text();
      throw new Error("Anthropic API: " + aiRes.status + " " + errText);
    }
    const aiData = await aiRes.json();
    const text = aiData.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    const looks = parsed.looks || [];
    const inserted = [];
    for (const look of looks) {
      const items = (look.items || [])
        .map((it) => ({ ...byId[it.external_id], role: it.role }))
        .filter((p) => p.external_id);
      if (items.length === 0) continue;
      const total = items.reduce((s, p) => s + Number(p.price), 0);
      const hero = items.find((p) => p.role === "hero") || items[0];
      const uniqueSlug = `${look.slug}-${Math.random().toString(36).slice(2, 6)}`;
      const { data: outfit, error: oErr } = await supabase
        .from("outfits")
        .insert({
          slug: uniqueSlug,
          title: look.title,
          description: look.description || "",
          mood: look.mood,
          occasion: look.occasion,
          budget_tier: look.budget_tier,
          season: look.season,
          total_price: total,
          status: "draft",
          hero_image_url: hero.image_url || null,
          featured_score: 100,
        })
        .select("id")
        .single();
      if (oErr) {
        inserted.push({ slug: uniqueSlug, error: oErr.message });
        continue;
      }
      const exts = items.map((p) => p.external_id);
      const { data: prodIds } = await supabase
        .from("products")
        .select("id, external_id")
        .in("external_id", exts);
      const idMap = Object.fromEntries((prodIds || []).map((r) => [r.external_id, r.id]));
      const finalRows = items
        .map((p, idx) => ({
          outfit_id: outfit.id,
          product_id: idMap[p.external_id],
          role: p.role || "support",
          position: idx,
        }))
        .filter((r) => r.product_id);
      await supabase.from("outfit_items").insert(finalRows);
      inserted.push({ slug: uniqueSlug, title: look.title, items: finalRows.length, total });
    }
    return Response.json({ ok: true, generated: inserted.length, looks: inserted });
  } catch (err) {
    return Response.json({ ok: false, error: String(err.message || err) }, { status: 500 });
  }
}
