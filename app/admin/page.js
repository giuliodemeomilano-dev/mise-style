"use client";

import { useState, useEffect, useCallback } from "react";

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [gender, setGender] = useState("women");
  const [count, setCount] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [published, setPublished] = useState([]);
  const [busy, setBusy] = useState(null);

  const loadDrafts = useCallback(async () => {
    try {
      const res = await fetch("/api/drafts", { headers: { "x-admin-pw": pw } });
      const data = await res.json();
      if (data.ok) setDrafts(data.drafts || []);
    } catch (e) {}
  }, [pw]);

  const loadPublished = useCallback(async () => {
    const res = await fetch("/api/drafts?status=active", { headers: { "x-admin-pw": pw } });
    const data = await res.json();
    if (data.ok) setPublished(data.drafts || []);
  }, [pw]);

  function checkPw() {
    if (pw.length > 0) {
      setAuthed(true);
      loadDrafts();
      loadPublished();
    }
  }

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-pw": pw },
        body: JSON.stringify({ gender, count }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Errore");
      await loadDrafts();
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function swapPiece(itemId, outfitId, currentExtId, excludeExtIds) {
    setBusy(outfitId + ":" + itemId);
    try {
      const res = await fetch("/api/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_external_id: currentExtId, exclude: excludeExtIds }),
      });
      const data = await res.json();
      if (!data.ok) {
        alert(data.reason === "no_alternatives" ? "Nessun pezzo simile disponibile in questa categoria." : (data.error || "Errore"));
        return;
      }
      const applyRes = await fetch("/api/swap-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-pw": pw },
        body: JSON.stringify({ item_id: itemId, new_external_id: data.product.external_id, outfit_id: outfitId }),
      });
      const applyData = await applyRes.json();
      if (!applyData.ok) {
        alert(applyData.error || "Errore nel salvataggio");
        return;
      }
      await loadDrafts();
    } catch (e) {
      alert(String(e.message || e));
    } finally {
      setBusy(null);
    }
  }

  async function act(id, action) {
    setBusy(id);
    try {
      await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-pw": pw },
        body: JSON.stringify({ id, action }),
      });
      await loadDrafts();
    } catch (e) {} finally {
      setBusy(null);
    }
  }

  async function deletePublished(id) {
    if (!window.confirm("Cancellare definitivamente questo outfit pubblicato? L'azione non si può annullare.")) return;
    setBusy(id);
    try {
      await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-pw": pw },
        body: JSON.stringify({ id, action: "delete" }),
      });
      await loadPublished();
    } finally {
      setBusy(null);
    }
  }

  if (!authed) {
    return (
      <div style={{ maxWidth: 360, margin: "80px auto", padding: 24, fontFamily: "sans-serif" }}>
        <h1 style={{ fontSize: 22, fontWeight: 400, letterSpacing: 2 }}>MISE · Admin</h1>
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && checkPw()} placeholder="password" style={{ width: "100%", padding: 10, fontSize: 15, border: "1px solid #ccc", borderRadius: 6, marginTop: 8 }} />
        <button onClick={checkPw} style={{ marginTop: 12, padding: "10px 24px", border: "none", borderRadius: 6, background: "#1a1a1a", color: "#fff", cursor: "pointer", fontSize: 14 }}>Entra</button>
      </div>
    );
  }

  function piecePhoto(it) {
    const p = (it && it.products) || {};
    return p.packshot_url || p.image_url || null;
  }

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: 24, fontFamily: "sans-serif", color: "#1a1a1a" }}>
      <h1 style={{ fontSize: 24, fontWeight: 400, letterSpacing: 2, borderBottom: "1px solid #ddd", paddingBottom: 16 }}>MISE · Genera &amp; Approva</h1>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", margin: "20px 0" }}>
        <div style={{ display: "flex", border: "1px solid #ccc", borderRadius: 6, overflow: "hidden" }}>
          {["women", "men"].map((g) => (
            <button key={g} onClick={() => setGender(g)} style={{ padding: "8px 18px", border: "none", cursor: "pointer", background: gender === g ? "#1a1a1a" : "#fff", color: gender === g ? "#fff" : "#1a1a1a", fontSize: 14 }}>{g === "women" ? "Donna" : "Uomo"}</button>
          ))}
        </div>
        <select value={count} onChange={(e) => setCount(Number(e.target.value))} style={{ padding: "8px 12px", border: "1px solid #ccc", borderRadius: 6, fontSize: 14 }}>
          {[2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} look</option>)}
        </select>
        <button onClick={generate} disabled={loading} style={{ padding: "9px 24px", border: "none", borderRadius: 6, cursor: loading ? "default" : "pointer", background: loading ? "#999" : "#7a2e2e", color: "#fff", fontSize: 14, letterSpacing: 1 }}>{loading ? "Genero…" : "GENERA LOOK"}</button>
      </div>
      {error && <div style={{ background: "#fdeaea", color: "#9a2a2a", padding: 12, borderRadius: 6, fontSize: 14 }}>{error}</div>}
      <h2 style={{ fontSize: 18, fontWeight: 400, marginTop: 30 }}>Bozze da approvare ({drafts.length})</h2>
      {drafts.length === 0 && <p style={{ color: "#999", fontSize: 14 }}>Nessuna bozza. Genera dei look qui sopra.</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 18, marginTop: 16 }}>
        {drafts.map((d) => {
          const pieces = (d.items || []).filter((it) => it.products);
          const n = pieces.length;
          return (
            <div key={d.id} style={{ border: "1px solid #e5e5e5", borderRadius: 10, overflow: "hidden", background: "#fff", display: "flex", flexDirection: "column" }}>
              <div style={{ background: "#f3f1ea", padding: 6 }}>
                <div style={{ display: "flex", gap: 6, height: 200 }}>
                  {pieces.map((it, idx) => {
                    const img = piecePhoto(it);
                    const p = it.products || {};
                    return (
                      <div key={idx} style={{ flex: 1, background: "#fff", borderRadius: 4, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                        {img && <img src={img} alt={p.name || ""} style={{ width: "100%", height: "100%", objectFit: "contain", padding: 8, boxSizing: "border-box" }} />}
                        <button onClick={() => swapPiece(it.id, d.id, p.external_id, pieces.map((x) => x.products?.external_id).filter(Boolean))} disabled={busy === d.id + ":" + it.id} title="Ricarica un pezzo simile" style={{ position: "absolute", bottom: 4, right: 4, width: 26, height: 26, borderRadius: "50%", border: "none", background: "rgba(26,26,26,0.85)", color: "#fff", cursor: "pointer", fontSize: 13, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>↻</button>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={{ padding: 14, display: "flex", flexDirection: "column", flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <strong style={{ fontSize: 15, fontWeight: 500 }}>{d.title}</strong>
                  <span style={{ fontSize: 14 }}>€{Number(d.total_price).toFixed(2)}</span>
                </div>
                <p style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: 1, margin: "4px 0 12px" }}>{d.mood} · {d.occasion} · {n} pezzi</p>
                <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                  <button onClick={() => act(d.id, "publish")} disabled={busy === d.id} style={{ flex: 1, padding: "8px", border: "none", borderRadius: 6, background: "#2e7a4e", color: "#fff", cursor: "pointer", fontSize: 13 }}>✓ Pubblica</button>
                  <button onClick={() => act(d.id, "discard")} disabled={busy === d.id} style={{ flex: 1, padding: "8px", border: "1px solid #ccc", borderRadius: 6, background: "#fff", color: "#9a2a2a", cursor: "pointer", fontSize: 13 }}>✗ Scarta</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <h2 style={{ fontSize: 18, fontWeight: 500, margin: "40px 0 4px" }}>Outfit pubblicati</h2>
      <p style={{ fontSize: 12, color: "#999", margin: "0 0 16px" }}>{published.length} outfit live sul sito</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 18 }}>
        {published.map((d) => {
          const pieces = (d.items || []).filter((it) => it.products)
          const n = pieces.length
          return (
            <div key={d.id} style={{ border: "1px solid #e5e5e5", borderRadius: 10, overflow: "hidden", background: "#fff", display: "flex", flexDirection: "column" }}>
              <div style={{ background: "#f3f1ea", padding: 6 }}>
                <div style={{ display: "flex", gap: 6, height: 200 }}>
                  {pieces.map((it, idx) => {
                    const img = piecePhoto(it)
                    const p = it.products || {}
                    return (
                      <div key={idx} style={{ flex: 1, background: "#fff", borderRadius: 4, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {img && <img src={img} alt={p.name || ""} style={{ width: "100%", height: "100%", objectFit: "contain", padding: 8, boxSizing: "border-box" }} />}
                      </div>
                    )
                  })}
                </div>
              </div>
              <div style={{ padding: 14, display: "flex", flexDirection: "column", flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <strong style={{ fontSize: 15, fontWeight: 500 }}>{d.title}</strong>
                  <span style={{ fontSize: 14 }}>€{Number(d.total_price).toFixed(2)}</span>
                </div>
                <p style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: 1, margin: "4px 0 12px" }}>{d.mood} · {d.occasion} · {n} pezzi</p>
                <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                  <button onClick={() => deletePublished(d.id)} disabled={busy === d.id} style={{ flex: 1, padding: "8px", border: "1px solid #ccc", borderRadius: 6, background: "#fff", color: "#9a2a2a", cursor: "pointer", fontSize: 13 }}>🗑 Cancella</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
}
