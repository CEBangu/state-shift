import { UploadForm } from "@/components/UploadForm";

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">StateShift</span>
          <h1>Semantic change-point search for long videos.</h1>
          <p>
            Upload a video, describe the event in natural language, and let the
            app localize the transition using sampled frames plus Gemini-guided
            binary search.
          </p>
        </div>
        <div className="hero-panel">
          <div className="hero-badge">Demo MVP</div>
          <ul className="hero-points">
            <li>Uploads + local storage</li>
            <li>ffmpeg sampled frame extraction</li>
            <li>Gemini structured frame classification</li>
            <li>Efficient transition localization trace</li>
          </ul>
        </div>
      </section>

      <UploadForm />
    </main>
  );
}
