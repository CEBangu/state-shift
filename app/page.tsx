import { UploadForm } from "@/components/UploadForm";

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero-banner">
          <div className="hero-eyebrow">
            <span className="hero-brand">StateShift</span>
            <span className="hero-subbrand">Gemini-powered video search</span>
          </div>
        </div>
        <div className="hero-grid">
          <div className="hero-copy">
            <h1>Find the exact moment reality shifts.</h1>
            <p>
              StateShift turns a long video into a semantic search problem. Upload a clip,
              describe the event in plain English, and the app will localize the state change
              using sampled frames, Gemini reasoning, and efficient boundary search.
            </p>
            <div className="hero-strip">
              <div className="hero-chip">
                <span className="hero-chip-label">Search style</span>
                <strong>Bracket + binary</strong>
              </div>
              <div className="hero-chip">
                <span className="hero-chip-label">Model</span>
                <strong>Gemini structured vision</strong>
              </div>
            </div>
          </div>
          <div className="hero-panel">
            <div className="hero-badge">Optimized For</div>
            <ul className="hero-points">
              <li>Long-form clips with one clear transition</li>
              <li>Minimal Gemini calls instead of exhaustive scanning</li>
              <li>Before/after visual evidence with explanations</li>
              <li>Efficiency stats and a full search trace</li>
            </ul>
            <div className="hero-panel-grid">
              <div className="hero-panel-card">
                <span className="hero-chip-label">Best case</span>
                <strong>One dominant state change</strong>
              </div>
              <div className="hero-panel-card">
                <span className="hero-chip-label">Default sampling</span>
                <strong>1 fps scout frames</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <UploadForm />
    </main>
  );
}
