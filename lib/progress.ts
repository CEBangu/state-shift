type ProgressPhase =
  | "queued"
  | "saving"
  | "extracting"
  | "classifying"
  | "searching"
  | "verifying"
  | "complete"
  | "error";

export type JobProgress = {
  jobId: string;
  phase: ProgressPhase;
  title: string;
  detail: string;
  updatedAt: number;
  geminiCalls: number;
  currentSampleIndex?: number;
  totalSampledFrames?: number;
  error?: string;
};

const progressStore = new Map<string, JobProgress>();

function now(): number {
  return Date.now();
}

export function createJobProgress(jobId: string): JobProgress {
  const initial: JobProgress = {
    jobId,
    phase: "queued",
    title: "Queued",
    detail: "Waiting to start analysis.",
    updatedAt: now(),
    geminiCalls: 0,
  };

  progressStore.set(jobId, initial);
  return initial;
}

export function getJobProgress(jobId: string): JobProgress | null {
  return progressStore.get(jobId) ?? null;
}

export function updateJobProgress(
  jobId: string,
  updates: Omit<Partial<JobProgress>, "jobId" | "updatedAt">,
): JobProgress {
  const existing = progressStore.get(jobId) ?? createJobProgress(jobId);
  const next: JobProgress = {
    ...existing,
    ...updates,
    jobId,
    updatedAt: now(),
  };

  progressStore.set(jobId, next);
  return next;
}

export function completeJobProgress(jobId: string): JobProgress {
  return updateJobProgress(jobId, {
    phase: "complete",
    title: "Transition found",
    detail: "Analysis finished successfully.",
  });
}

export function failJobProgress(jobId: string, error: string): JobProgress {
  return updateJobProgress(jobId, {
    phase: "error",
    title: "Analysis failed",
    detail: error,
    error,
  });
}
