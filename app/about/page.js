// app/about/page.js
export const metadata = {
  title: "About | MISE",
  description:
    "MISE is a European fashion platform that curates complete, wearable outfits for women and men. Every piece is shoppable at the original store.",
};

const wrap = { maxWidth: 720, margin: "0 auto", padding: "140px 24px 120px" };
const kicker = {
  fontSize: 12,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  color: "#b0553f",
  marginBottom: 16,
};
const h1 = { fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 44, lineHeight: 1.1, color: "#1a1a1a", margin: "0 0 28px" };
const h2 = { fontFamily: "Georgia, serif", fontSize: 22, color: "#1a1a1a", margin: "44px 0 12px" };
const p = { fontSize: 16.5, lineHeight: 1.75, color: "#4a4a4a", margin: "0 0 18px" };

export default function AboutPage() {
  return (
    <main style={wrap}>
      <div style={kicker}>About MISE</div>
      <h1>Dressing well shouldn’t be a full-time job.</h1>

      <p style={p}>
        MISE started from a simple frustration: the hard part of dressing well
        isn’t finding one nice piece. It’s putting the <em>whole</em> outfit
        together. The proportions, the palette, the shoes that actually finish
        the look. Most shopping sites sell you items. We build outfits.
      </p>

      <h2 style={h2}>What we do</h2>
      <p style={p}>
        MISE is a European platform that curates complete, wearable outfits for
        women and men, from a small circle of stores we genuinely rate: COS,
        Massimo Dutti, ARKET and The Frankie Shop. Every look is composed with a
        quiet, minimal, European sensibility, then broken down piece by piece so
        you can shop the whole thing in a couple of clicks.
      </p>

      <h2 style={h2}>How we build the looks</h2>
      <p style={p}>
        Each outfit is put together using a mix of technology and a human eye,
        balancing silhouette, colour and occasion the way a stylist would, not by
        stacking items at random. We keep the catalogue small and the standard
        high: if a look isn’t something we’d actually wear, it doesn’t go up.
      </p>

      <h2 style={h2}>We don’t sell anything</h2>
      <p style={p}>
        MISE holds no stock and ships nothing. When you find a piece you like, you
        buy it directly from the retailer, at the retailer’s price. We simply point
        you to the right product. If you buy through one of our links we may earn a
        small commission, at no extra cost to you and without influencing which
        outfits we build. More on that in our{" "}
        <a href="/disclosure" style={{ color: "#b0553f" }}>affiliate disclosure</a>.
      </p>

      <p style={{ ...p, marginTop: 40 }}>
        Questions or ideas? Write to us at{" "}
        <a href="mailto:hello@mise.style" style={{ color: "#b0553f" }}>hello@mise.style</a>.
      </p>
    </main>
  );
}
