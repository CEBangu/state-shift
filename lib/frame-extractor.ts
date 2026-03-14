import { readdir } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

import { FrameMetadata } from "@/lib/types";

type ExtractFramesInput = {
  videoPath: string;
  outputDir: string;
  sampleRateFps: number;
};

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", args, {
      stdio: ["ignore", "ignore", "pipe"],
    });

    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr || `ffmpeg exited with code ${code}`));
    });
  });
}

export async function extractSampledFrames({
  videoPath,
  outputDir,
  sampleRateFps,
}: ExtractFramesInput): Promise<FrameMetadata[]> {
  const outputPattern = path.join(outputDir, "frame-%06d.jpg");

  await runFfmpeg([
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    videoPath,
    "-vf",
    `fps=${sampleRateFps}`,
    "-q:v",
    "2",
    outputPattern,
  ]);

  const files = (await readdir(outputDir))
    .filter((entry) => entry.endsWith(".jpg"))
    .sort((left, right) => left.localeCompare(right));

  return files.map((imageName, index) => ({
    sampleIndex: index,
    timestampSec: index / sampleRateFps,
    imagePath: path.join(outputDir, imageName),
    imageName,
  }));
}
