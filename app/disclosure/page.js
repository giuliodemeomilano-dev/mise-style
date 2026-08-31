// app/disclosure/page.js
export const metadata = {
  title: "Affiliate Disclosure | MISE",
  description:
    "MISE is reader-supported. When you buy through our links we may earn a commission, at no extra cost to you.",
};

const wrap = { maxWidth: 720, margin: "0 auto", padding: "140px 24px 120px" };
const kicker = { fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", color: "#b0553f", marginBottom: 16 };
const h1 = { fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 44, lineHeight: 1.1, color: "#1a1a1a", margin: "0 0 28px" };
const h2 = { fontFamily: "Georgia, serif", fontSize: 22, color: "#1a1a1a", margin: "40px 0 12px" };
const p = { fontSize: 16.5, lineHeight: 1.75, color: "#4a4a4a", margin: "0 0 18px" };

export default function DisclosurePage() {
  return (
    <main style={wrap}>
      <div style={kicker}>Transparency</div>
      <h1>Affiliate disclosure</h1>

      <p style={p}>
        MISE is reader-supported. The outfits on this site link to products sold by
        third-party retailers. When you click through and make a purchase, MISE may
        earn a commission from that retailer, <strong>at no extra cost to you</strong>.
        The price you pay is exactly the same as it would be going to the store directly.
      </p>

      <h2 style={h2}>Commissions don’t shape our curation</h2>
      <p style={p}>
        We build outfits around what looks good and works together, never around
        which pieces pay the most. We only feature items from retailers we’d shop
        ourselves. A commission never determines whether a piece makes it into a look.
      </p>

      <h2 style={h2}>Prices and availability</h2>
      <p style={p}>
        Prices, colours and availability are set by the retailers and shown on MISE
        for reference only. They can change at any time. Always confirm the final
        price, size and availability on the retailer’s own website before buying.
      </p>

      <h2 style={h2}>Our partners</h2>
      <p style={p}>
        MISE works with affiliate networks and retailer partner programmes to
        track qualifying purchases. We currently work with Awin. If we add other
        networks we will list them here. These partners may set cookies when you
        click an outbound link.
        You can read more in our{" "}
        <a href="/privacy" style={{ color: "#b0553f" }}>privacy policy</a>.
      </p>

      <p style={{ ...p, marginTop: 40 }}>
        Questions about this disclosure? Email{" "}
        <a href="mailto:hello@mise.style" style={{ color: "#b0553f" }}>hello@mise.style</a>.
      </p>
    </main>
  );
}
