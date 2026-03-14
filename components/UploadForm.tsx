"use client";

import { FormEvent, useState } from "react";

import { ResultView } from "@/components/ResultView";
import { TransitionResult } from "@/lib/types";

const DEFAULT_QUERY = "Find when the bike disappears";

type AnalyzeError = {
  error: string;
};

function isAnalyzeError(payload: TransitionResult | AnalyzeError): payload is AnalyzeError {
  return "error" in payload;
}

export function UploadForm() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [sampleRate, setSampleRate] = useState("1");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TransitionResult | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!videoFile) {
      setError("Choose a local video file before starting analysis.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("video", videoFile);
      formData.append("query", query);
      formData.append("sampleRate", sampleRate);

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as TransitionResult | AnalyzeError;

      if (!response.ok || isAnalyzeError(payload)) {
        throw new Error(isAnalyzeError(payload) ? payload.error : "Analysis failed.");
      }

      setResult(payload);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Analysis failed.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <>
      <section className="card">
        <div>
          <span className="pill">Phase-ready MVP</span>
          <h2>Run semantic event localization</h2>
          <p>
            This demo extracts sampled frames, classifies only selected frames with Gemini,
            and localizes the change-point with bracketing plus binary search.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <label className="field">
              <span className="label-row">
                <span>Video upload</span>
                <span className="helper-text">Short local demo clip</span>
              </span>
              <input
                accept="video/*"
                type="file"
                onChange={(event) => {
                  setVideoFile(event.target.files?.[0] ?? null);
                }}
              />
            </label>

            <label className="field">
              <span className="label-row">
                <span>Sampling rate (fps)</span>
                <span className="helper-text">Default 1 fps</span>
              </span>
              <input
                inputMode="decimal"
                min="0.1"
                step="0.1"
                type="number"
                value={sampleRate}
                onChange={(event) => setSampleRate(event.target.value)}
              />
            </label>

            <label className="field-full">
              <span className="label-row">
                <span>Natural-language event query</span>
                <span className="helper-text">Describe the state change you want to find</span>
              </span>
              <textarea value={query} onChange={(event) => setQuery(event.target.value)} />
            </label>
          </div>

          <div className="actions">
            <div className="helper-text">
              Recommended queries: “Find when the package is removed”, “Find when the door opens”.
            </div>
            <div>
              <button className="button button-primary" disabled={isAnalyzing} type="submit">
                {isAnalyzing ? "Analyzing video..." : "Analyze video"}
              </button>
            </div>
          </div>
        </form>
      </section>

      {isAnalyzing ? (
        <section className="status-panel">
          <h3>Analysis in progress</h3>
          <p>The server is persisting the upload, extracting sampled frames, then running Gemini-guided search.</p>
          <div className="status-steps">
            <div className="status-step">
              <strong>1. Upload</strong>
              Persist the local video into demo storage.
            </div>
            <div className="status-step">
              <strong>2. Extract</strong>
              Sample frames with `ffmpeg` at the configured rate.
            </div>
            <div className="status-step">
              <strong>3. Search</strong>
              Use Gemini only on selected sampled frames.
            </div>
          </div>
        </section>
      ) : null}

      {error ? (
        <section className="error-panel">
          <h3>Analysis failed</h3>
          <p>{error}</p>
        </section>
      ) : null}

      {result ? <ResultView result={result} /> : null}
    </>
  );
}
