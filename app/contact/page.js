// app/contact/page.js
export const metadata = {
  title: "Contact — MISE",
  description: "Get in touch with MISE — questions, press, or partnerships.",
};

const wrap = { maxWidth: 720, margin: "0 auto", padding: "140px 24px 120px" };
const kicker = { fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", color: "#b0553f", marginBottom: 16 };
const h1 = { fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 44, lineHeight: 1.1, color: "#1a1a1a", margin: "0 0 28px" };
const p = { fontSize: 16.5, lineHeight: 1.75, color: "#4a4a4a", margin: "0 0 18px" };
const mail = { display: "inline-block", marginTop: 8, fontFamily: "Georgia, serif", fontSize: 24, color: "#b0553f", textDecoration: "none" };

export default function ContactPage() {
  return (
    <main style={wrap}>
      <div style={kicker}>Contact</div>
      <h1>Say hello.</h1>

      <p style={p}>
        Questions about an outfit, a piece, press or a partnership? We read
        everything and reply to what we can.
      </p>

      <a href="mailto:hello@mise.style" style={mail}>hello@mise.style</a>

      <p style={{ ...p, marginTop: 40, color: "#8a8378" }}>
        MISE is an independent, European fashion-curation project. We don’t sell or
        ship products — every piece is bought directly from the original retailer.
      </p>
    </main>
  );
}
