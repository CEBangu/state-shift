import { writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { extractSampledFrames } from "@/lib/frame-extractor";
import { completeJobProgress, createJobProgress, failJobProgress, updateJobProgress } from "@/lib/progress";
import { searchTransition } from "@/lib/search-transition";
import { ensureJobDirs, getFramesDir, getJobVideoPath, toFrameAssetUrl } from "@/lib/storage";
import { ClassifiedFrame } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function toClientFrame(jobId: string, frame: ClassifiedFrame): ClassifiedFrame {
  return {
    ...frame,
    imagePath: toFrameAssetUrl(jobId, frame.imageName),
  };
}

export async function POST(request: Request) {
  let jobId: string | null = null;
  try {
    const formData = await request.formData();
    const video = formData.get("video");
    const query = formData.get("query");
    const sampleRateValue = formData.get("sampleRate");

    if (!(video instanceof File)) {
      return NextResponse.json({ error: "A video file is required." }, { status: 400 });
    }

    if (typeof query !== "string" || !query.trim()) {
      return NextResponse.json({ error: "A natural-language query is required." }, { status: 400 });
    }

    const sampleRate = typeof sampleRateValue === "string" ? Number(sampleRateValue) : 1;

    if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
      return NextResponse.json({ error: "Sampling rate must be a positive number." }, { status: 400 });
    }

    const providedJobId = formData.get("jobId");
    jobId = typeof providedJobId === "string" && providedJobId.trim() ? providedJobId.trim() : randomUUID();
    const activeJobId = jobId;
    createJobProgress(activeJobId);
    updateJobProgress(activeJobId, {
      phase: "saving",
      title: "Saving the clip",
      detail: "Persisting the uploaded video to local storage.",
    });
    await ensureJobDirs(activeJobId);

    const videoPath = getJobVideoPath(activeJobId, video.name);
    const videoBuffer = Buffer.from(await video.arrayBuffer());
    await writeFile(videoPath, videoBuffer);

    updateJobProgress(activeJobId, {
      phase: "extracting",
      title: "Cutting frames",
      detail: `Sampling the video at ${sampleRate} fps with ffmpeg.`,
    });
    const sampledFrames = await extractSampledFrames({
      videoPath,
      outputDir: getFramesDir(activeJobId),
      sampleRateFps: sampleRate,
    });

    if (!sampledFrames.length) {
      failJobProgress(activeJobId, "ffmpeg did not extract any sampled frames from the uploaded video.");
      return NextResponse.json(
        { error: "ffmpeg did not extract any sampled frames from the uploaded video." },
        { status: 422 },
      );
    }

    updateJobProgress(activeJobId, {
      phase: "classifying",
      title: "Briefing Gemini",
      detail: "Sending the first semantic probes to Gemini.",
      totalSampledFrames: sampledFrames.length,
    });
    let activePhase: "classifying" | "searching" | "verifying" = "classifying";
    let activeTitle = "Briefing Gemini";
    const result = await searchTransition({
      sampledFrames,
      query: query.trim(),
      onPhaseChange: (phase, detail) => {
        const titleByPhase = {
          classifying: "Briefing Gemini",
          searching: "Hunting the boundary",
          verifying: "Sanity-checking the edge",
        } as const;
        activePhase = phase;
        activeTitle = titleByPhase[phase];

        updateJobProgress(activeJobId, {
          phase,
          title: activeTitle,
          detail,
          totalSampledFrames: sampledFrames.length,
        });
      },
      onGeminiCall: (sampleIndex, totalCalls) => {
        const progress = totalCalls === 0 ? "Preparing the next Gemini request." : `Gemini calls used so far: ${totalCalls}.`;
        updateJobProgress(activeJobId, {
          phase: activePhase,
          title: activeTitle,
          detail: progress,
          currentSampleIndex: sampleIndex,
          geminiCalls: totalCalls,
          totalSampledFrames: sampledFrames.length,
        });
      },
    });

    const linearScanGeminiCalls = sampledFrames.length;
    const geminiCallsSaved = Math.max(0, linearScanGeminiCalls - result.totalGeminiCalls);
    const geminiReductionRatio =
      linearScanGeminiCalls > 0 ? Number((geminiCallsSaved / linearScanGeminiCalls).toFixed(3)) : 0;

    completeJobProgress(activeJobId);
    updateJobProgress(activeJobId, {
      phase: "complete",
      title: "Transition found",
      detail: `Finished with ${result.totalGeminiCalls} Gemini calls across ${sampledFrames.length} sampled frames.`,
      geminiCalls: result.totalGeminiCalls,
      totalSampledFrames: sampledFrames.length,
      currentSampleIndex: result.transitionSampleIndex,
    });

    return NextResponse.json({
      jobId: activeJobId,
      ...result,
      totalSampledFrames: sampledFrames.length,
      linearScanGeminiCalls,
      geminiCallsSaved,
      geminiReductionRatio,
      beforeFrame: toClientFrame(activeJobId, result.beforeFrame),
      afterFrame: toClientFrame(activeJobId, result.afterFrame),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected analysis failure.";
    if (jobId) {
      failJobProgress(jobId, message);
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
