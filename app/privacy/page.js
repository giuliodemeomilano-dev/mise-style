// app/privacy/page.js
export const metadata = {
  title: "Privacy policy — MISE",
  description:
    "How MISE handles data: what we collect, cookies, affiliate partners, and your rights under the GDPR.",
};

const wrap = { maxWidth: 720, margin: "0 auto", padding: "140px 24px 120px" };
const kicker = { fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase", color: "#b0553f", marginBottom: 16 };
const h1 = { fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 44, lineHeight: 1.1, color: "#1a1a1a", margin: "0 0 10px" };
const updated = { fontSize: 13, color: "#8a8378", margin: "0 0 32px" };
const h2 = { fontFamily: "Georgia, serif", fontSize: 22, color: "#1a1a1a", margin: "40px 0 12px" };
const p = { fontSize: 16, lineHeight: 1.75, color: "#4a4a4a", margin: "0 0 16px" };
const li = { fontSize: 16, lineHeight: 1.7, color: "#4a4a4a", margin: "0 0 10px" };
const a = { color: "#b0553f" };

export default function PrivacyPage() {
  return (
    <main style={wrap}>
      <div style={kicker}>Legal</div>
      <h1>Privacy policy</h1>
      <p style={updated}>Last updated: July 2026</p>

      <p style={p}>
        This policy explains what personal data MISE (“MISE”, “we”, “us”) collects
        when you use <strong>mise.style</strong>, why we collect it, and the rights you
        have under the EU General Data Protection Regulation (GDPR). We keep data
        collection to the minimum needed to run the site.
      </p>

      <h2 style={h2}>1. Who we are</h2>
      <p style={p}>
        MISE is an independent fashion-curation website operated from Italy. For any
        privacy question, or to exercise your rights, contact us at{" "}
        <a href="mailto:hello@mise.style" style={a}>hello@mise.style</a>. MISE is the
        data controller for the processing described here.
      </p>

      <h2 style={h2}>2. What we collect</h2>
      <p style={p}>MISE does not require you to create an account, and we do not ask for your name, address or payment details. We may process:</p>
      <ul>
        <li style={li}><strong>Usage &amp; device data</strong> — anonymised or aggregated analytics such as pages viewed, approximate region, browser type and referring site, used to understand how the site is used and improve it.</li>
        <li style={li}><strong>Outbound-click data</strong> — when you click a piece to go to a retailer, we and our affiliate partners may record that a click happened (for example which product, time, and a non-identifying reference) so purchases can be attributed.</li>
        <li style={li}><strong>Locally stored preferences</strong> — items you save (“wishlist”) and your language choice are stored in your own browser (local storage) and are not sent to us as personal data.</li>
      </ul>

      <h2 style={h2}>3. Cookies and similar technologies</h2>
      <p style={p}>We use a small number of cookies and similar technologies:</p>
      <ul>
        <li style={li}><strong>Essential</strong> — required for the site to function.</li>
        <li style={li}><strong>Analytics</strong> — to measure traffic in an aggregated way.</li>
        <li style={li}><strong>Affiliate</strong> — set by our affiliate partners (see section 5) when you click an outbound link, so a qualifying purchase can be credited to MISE.</li>
      </ul>
      <p style={p}>You can control or delete cookies through your browser settings. Blocking some cookies may affect how parts of the site work.</p>

      <h2 style={h2}>4. Why we process data and the legal basis</h2>
      <ul>
        <li style={li}><strong>To operate and secure the site</strong> — our legitimate interest in running a functional, safe service.</li>
        <li style={li}><strong>To measure and improve the site</strong> — our legitimate interest, using aggregated analytics; where required, on the basis of your consent.</li>
        <li style={li}><strong>To earn affiliate commissions</strong> — our legitimate interest in funding the site; affiliate cookies are set on the basis of your consent where required.</li>
      </ul>

      <h2 style={h2}>5. Third parties we share data with</h2>
      <p style={p}>We use trusted providers who process data on our behalf or as independent controllers:</p>
      <ul>
        <li style={li}><strong>Hosting &amp; infrastructure</strong> — our hosting and database providers, which process technical data needed to serve the site.</li>
        <li style={li}><strong>Analytics</strong> — a web-analytics provider, using aggregated/anonymised data.</li>
        <li style={li}><strong>Affiliate partners</strong> — Skimlinks and the retailers’ own affiliate programmes, which may set cookies and record outbound clicks to attribute purchases. When you leave MISE for a retailer, that retailer’s own privacy policy applies.</li>
      </ul>

      <h2 style={h2}>6. International transfers</h2>
      <p style={p}>Some providers may process data outside the European Economic Area. Where that happens, we rely on appropriate safeguards such as the European Commission’s Standard Contractual Clauses.</p>

      <h2 style={h2}>7. How long we keep data</h2>
      <p style={p}>We keep analytics and click data only as long as needed for the purposes above, then delete or further aggregate it. Preferences stored in your browser remain until you clear them.</p>

      <h2 style={h2}>8. Your rights</h2>
      <p style={p}>Under the GDPR you have the right to access, correct, delete or restrict your personal data, to object to processing based on legitimate interest, to data portability, and to withdraw consent at any time. To exercise any of these, email{" "}
        <a href="mailto:hello@mise.style" style={a}>hello@mise.style</a>. You also have the right to lodge a complaint with your local data protection authority (in Italy, the Garante per la protezione dei dati personali).</p>

      <h2 style={h2}>9. Children</h2>
      <p style={p}>MISE is not directed at children under 16, and we do not knowingly collect their data.</p>

      <h2 style={h2}>10. Changes to this policy</h2>
      <p style={p}>We may update this policy from time to time. The “last updated” date above reflects the latest version.</p>

      <p style={{ ...p, marginTop: 40 }}>
        Questions? Contact{" "}
        <a href="mailto:hello@mise.style" style={a}>hello@mise.style</a>.
      </p>
    </main>
  );
}
