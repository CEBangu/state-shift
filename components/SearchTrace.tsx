import { SearchTraceEntry } from "@/lib/types";

type SearchTraceProps = {
  trace: SearchTraceEntry[];
};

function labelClassName(label: SearchTraceEntry["label"]): string {
  return `label-${label}`;
}

export function SearchTrace({ trace }: SearchTraceProps) {
  if (!trace.length) {
    return null;
  }

  return (
    <section className="trace-panel">
      <span className="pill">Search trace</span>
      <h3>Gemini queried sampled frames</h3>
      <p>The trace shows which sampled frames were inspected during bracketing, binary search, and local verification.</p>

      <table className="trace-table">
        <thead>
          <tr>
            <th>Sample</th>
            <th>Timestamp</th>
            <th>Label</th>
            <th>Confidence</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody>
          {trace.map((entry) => (
            <tr key={entry.sampleIndex}>
              <td>{entry.sampleIndex}</td>
              <td>{entry.timestampSec.toFixed(2)}s</td>
              <td className={labelClassName(entry.label)}>{entry.label}</td>
              <td>{entry.confidence.toFixed(2)}</td>
              <td>{entry.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
