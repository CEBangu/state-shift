import { UploadForm } from "@/components/UploadForm";

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero-banner">
          <div className="hero-eyebrow">
            <span className="hero-brand">StateShift</span>
            <span className="hero-subbrand">Gemini-powered efficient video search</span>
          </div>
        </div>
        <div className="hero-grid">
          <div className="hero-copy">
            <div className="hero-copy-grid">
              <div className="hero-copy-main">
                <div className="hero-copy-top">
                  <h1>Find the exact moment reality shifts.</h1>
                  <p>
                    StateShift turns a long video into a semantic search problem. Upload a clip,
                    describe the event in plain English, and the app will localize the state change
                    using sampled frames, Gemini reasoning, and efficient boundary search.
                  </p>
                </div>
                <div className="hero-demo-cta">
                  <div>
                    <span className="hero-chip-label">Next step</span>
                    <strong>Try the demo below</strong>
                    <p>Upload a clip and ask for the moment you want to localize.</p>
                  </div>
                  <a className="hero-demo-link" href="#demo">
                    Jump to demo
                  </a>
                </div>
                <div className="hero-strip">
                  <div className="hero-chip">
                    <span className="hero-chip-label">Search style</span>
                    <strong>Bracket + Binary</strong>
                  </div>
                  <div className="hero-chip">
                    <span className="hero-chip-label">Model</span>
                    <strong>Gemini 3 Flash Preview</strong>
                  </div>
                  <div className="hero-chip">
                    <span className="hero-chip-label">Speed</span>
                    <strong>Super Fast</strong>
                  </div>
                </div>
              </div>
              <div className="hero-panel">
                <div className="hero-badge">Optimized Search</div>
                <p className="hero-panel-copy">
                  Built to jump to a single meaningful change in a long clip without paying for a
                  frame-by-frame crawl.
                </p>
                <ul className="hero-points">
                  <li>Long-form clips with one clear transition</li>
                  <li>Minimal Gemini calls instead of exhaustive scanning</li>
                  <li>Before/after visual evidence with explanations</li>
                  <li>Efficiency stats and a full search trace</li>
                </ul>
                <div className="hero-panel-callout">
                  <span className="hero-chip-label">Works especially well for</span>
                  <strong>Disappear, removed, opens, appears, becomes empty</strong>
                </div>
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
          </div>
        </div>
      </section>

      <section id="demo">
        <UploadForm />
      </section>
    </main>
  );
}
