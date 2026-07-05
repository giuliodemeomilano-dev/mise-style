// app/how-it-works/page.js
export const metadata = {
  title: "How it works — MISE",
  description:
    "Choose a style, see the complete outfit, and shop every piece directly at the original store. Here's how MISE works.",
};

const wrap = { maxWidth: 720, margin: "0 auto", padding: "140px 24px 120px" };
const kicker = { fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", color: "#b0553f", marginBottom: 16 };
const h1 = { fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 44, lineHeight: 1.1, color: "#1a1a1a", margin: "0 0 32px" };
const stepNum = { fontFamily: "Georgia, serif", fontSize: 30, color: "#b0553f", lineHeight: 1 };
const stepTitle = { fontFamily: "Georgia, serif", fontSize: 22, color: "#1a1a1a", margin: "8px 0 10px" };
const p = { fontSize: 16.5, lineHeight: 1.75, color: "#4a4a4a", margin: 0 };
const step = { padding: "28px 0", borderTop: "1px solid #ece7df" };

export default function HowItWorksPage() {
  return (
    <main style={wrap}>
      <div style={kicker}>How it works</div>
      <h1>The entire outfit, one click away.</h1>

      <div style={step}>
        <div style={stepNum}>01</div>
        <div style={stepTitle}>Choose a style</div>
        <p style={p}>
          Browse outfits by mood and occasion — office, weekend, evening, travel,
          brunch, date. Filter to what you’re actually dressing for, for women or men.
        </p>
      </div>

      <div style={step}>
        <div style={stepNum}>02</div>
        <div style={stepTitle}>See the complete outfit</div>
        <p style={p}>
          Every MISE look is a full, balanced outfit — top, bottom, shoes and the
          finishing pieces — assembled to work together, not a wall of single items.
        </p>
      </div>

      <div style={step}>
        <div style={stepNum}>03</div>
        <div style={stepTitle}>Shop each piece at the store</div>
        <p style={p}>
          Tap any piece to go straight to it on the retailer’s website. You buy and
          check out with the store directly — MISE holds no stock and never touches
          your payment. Prices shown are for reference; the final price is always the
          retailer’s.
        </p>
      </div>

      <p style={{ ...p, marginTop: 40, color: "#8a8378" }}>
        MISE may earn a commission when you buy through our links, at no extra cost to
        you. See our{" "}
        <a href="/disclosure" style={{ color: "#b0553f" }}>affiliate disclosure</a>.
      </p>
    </main>
  );
}
