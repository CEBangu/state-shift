import { SearchTrace } from "@/components/SearchTrace";
import { ClassifiedFrame, TransitionResult } from "@/lib/types";

type ResultViewProps = {
  result: TransitionResult;
};

function labelClassName(label: ClassifiedFrame["classification"]["label"]): string {
  return `label-${label}`;
}

function renderFrameCard(title: string, frame: ClassifiedFrame) {
  return (
    <article className="frame-card">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt={`${title} evidence`} src={frame.imagePath} />
      <div className="frame-copy">
        <h3>{title}</h3>
        <div className="frame-meta">
          <span className="pill">Sample {frame.sampleIndex}</span>
          <span className="pill">{frame.timestampSec.toFixed(2)}s</span>
          <span className={`pill ${labelClassName(frame.classification.label)}`}>
            {frame.classification.label}
          </span>
          <span className="pill">Confidence {frame.classification.confidence.toFixed(2)}</span>
        </div>
        <p>{frame.classification.reason}</p>
      </div>
    </article>
  );
}

export function ResultView({ result }: ResultViewProps) {
  return (
    <>
      <section className="result-panel">
        <div className="result-header">
          <span className="pill">Transition found</span>
          <h2>{result.transitionTimestampHuman}</h2>
          <p>{result.explanation}</p>
        </div>

        <div className="metrics">
          <div className="metric">
            <span className="metric-label">Timestamp</span>
            <span className="metric-value">{result.transitionTimestampSec.toFixed(2)}s</span>
          </div>
          <div className="metric">
            <span className="metric-label">Confidence</span>
            <span className="metric-value">{result.confidence.toFixed(2)}</span>
          </div>
          <div className="metric">
            <span className="metric-label">Gemini Calls</span>
            <span className="metric-value">{result.totalGeminiCalls}</span>
          </div>
        </div>

        <div className="evidence-grid">
          {renderFrameCard("Before evidence", result.beforeFrame)}
          {renderFrameCard("After evidence", result.afterFrame)}
        </div>
      </section>

      <SearchTrace trace={result.searchTrace} />
    </>
  );
}
