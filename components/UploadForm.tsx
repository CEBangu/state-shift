"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { ResultView } from "@/components/ResultView";
import { AnalyzeProgress, ProgressPhase, TransitionResult } from "@/lib/types";

const DEFAULT_QUERY = "Find when the bike disappears";

type AnalyzeError = {
  error: string;
};

const PROGRESS_STAGES = [
  { phase: "saving", title: "Saving the clip", body: "Parking the upload in local storage so the backend can work on it." },
  { phase: "extracting", title: "Cutting frames", body: "Sampling the video with ffmpeg instead of staring at every frame." },
  { phase: "classifying", title: "Briefing Gemini", body: "Sending selected scout frames to Gemini with the event prompt." },
  { phase: "searching", title: "Hunting the boundary", body: "Bracketing the semantic change, then tightening it with binary search." },
  { phase: "verifying", title: "Sanity-checking the edge", body: "Looking around the boundary for cleaner before/after evidence." },
] as const;

type AnalyzeSuccess = TransitionResult & {
  jobId: string;
};

function isAnalyzeError(payload: AnalyzeSuccess | AnalyzeError): payload is AnalyzeError {
  return "error" in payload;
}

export function UploadForm() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [sampleRate, setSampleRate] = useState("1");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TransitionResult | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [progress, setProgress] = useState<AnalyzeProgress | null>(null);
  const pollIntervalRef = useRef<number | null>(null);

  const activeProgressPhase: ProgressPhase | null = progress?.phase ?? null;

  useEffect(() => {
    if (!isAnalyzing) {
      setElapsedSeconds(0);
      return;
    }

    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      setElapsedSeconds(elapsed);
    }, 250);

    return () => window.clearInterval(timer);
  }, [isAnalyzing]);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        window.clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const visibleStages = useMemo(
    () =>
      PROGRESS_STAGES.map((stage, index) => ({
        ...stage,
        state:
          activeProgressPhase === null
            ? index === 0
              ? "active"
              : "waiting"
            : stage.phase === activeProgressPhase
              ? "active"
              : PROGRESS_STAGES.findIndex((candidate) => candidate.phase === activeProgressPhase) > index
                ? "done"
                : "waiting",
      })),
    [activeProgressPhase],
  );

  function startPolling(jobId: string) {
    if (pollIntervalRef.current) {
      window.clearInterval(pollIntervalRef.current);
    }

    const poll = async () => {
      try {
        const response = await fetch(`/api/analyze/${jobId}/status`, {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as AnalyzeProgress;
        setProgress(payload);

        if (payload.phase === "complete" || payload.phase === "error") {
          if (pollIntervalRef.current) {
            window.clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }
      } catch {
        // Ignore transient polling failures during analysis.
      }
    };

    void poll();
    pollIntervalRef.current = window.setInterval(() => {
      void poll();
    }, 1000);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!videoFile) {
      setError("Choose a local video file before starting analysis.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    setProgress(null);

    try {
      const jobId = crypto.randomUUID();
      startPolling(jobId);

      const formData = new FormData();
      formData.append("jobId", jobId);
      formData.append("video", videoFile);
      formData.append("query", query);
      formData.append("sampleRate", sampleRate);

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as AnalyzeSuccess | AnalyzeError;

      if (!response.ok || isAnalyzeError(payload)) {
        throw new Error(isAnalyzeError(payload) ? payload.error : "Analysis failed.");
      }

      setResult(payload);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Analysis failed.");
    } finally {
      if (pollIntervalRef.current) {
        window.clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
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
          <div className="status-header">
            <div>
              <span className="pill">In flight</span>
              <h3>{progress?.title ?? "Starting analysis"}</h3>
            </div>
            <div className="status-orbit" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>
          <p>{progress?.detail ?? "Waiting for the backend to accept the job."}</p>
          <div className="status-meta">
            <span className="pill">Elapsed {elapsedSeconds}s</span>
            <span className="pill">Smart search, not linear scan</span>
            {typeof progress?.geminiCalls === "number" ? (
              <span className="pill">Gemini calls {progress.geminiCalls}</span>
            ) : null}
            {typeof progress?.currentSampleIndex === "number" ? (
              <span className="pill">Sample {progress.currentSampleIndex}</span>
            ) : null}
            {typeof progress?.totalSampledFrames === "number" ? (
              <span className="pill">{progress.totalSampledFrames} sampled frames</span>
            ) : null}
          </div>
          <div className="status-steps">
            {visibleStages.map((stage, index) => (
              <div className={`status-step status-step-${stage.state}`} key={stage.title}>
                <strong>
                  {index + 1}. {stage.title}
                </strong>
                {stage.body}
              </div>
            ))}
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
