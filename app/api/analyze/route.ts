import { writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { extractSampledFrames } from "@/lib/frame-extractor";
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

    const jobId = randomUUID();
    await ensureJobDirs(jobId);

    const videoPath = getJobVideoPath(jobId, video.name);
    const videoBuffer = Buffer.from(await video.arrayBuffer());
    await writeFile(videoPath, videoBuffer);

    const sampledFrames = await extractSampledFrames({
      videoPath,
      outputDir: getFramesDir(jobId),
      sampleRateFps: sampleRate,
    });

    if (!sampledFrames.length) {
      return NextResponse.json(
        { error: "ffmpeg did not extract any sampled frames from the uploaded video." },
        { status: 422 },
      );
    }

    const result = await searchTransition({
      sampledFrames,
      query: query.trim(),
    });

    return NextResponse.json({
      ...result,
      beforeFrame: toClientFrame(jobId, result.beforeFrame),
      afterFrame: toClientFrame(jobId, result.afterFrame),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected analysis failure.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
