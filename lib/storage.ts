import { mkdir } from "node:fs/promises";
import path from "node:path";

export function getStorageRoot(): string {
  return path.join(process.cwd(), "storage");
}

export function getJobsRoot(): string {
  return path.join(getStorageRoot(), "jobs");
}

export function getJobRoot(jobId: string): string {
  return path.join(getJobsRoot(), jobId);
}

export function getJobVideoPath(jobId: string, originalName: string): string {
  return path.join(getJobRoot(jobId), `upload${path.extname(originalName) || ".mp4"}`);
}

export function getFramesDir(jobId: string): string {
  return path.join(getJobRoot(jobId), "frames");
}

export function toFrameAssetUrl(jobId: string, imageName: string): string {
  return `/api/assets/${jobId}/${imageName}`;
}

export async function ensureJobDirs(jobId: string): Promise<void> {
  await mkdir(getFramesDir(jobId), { recursive: true });
}
