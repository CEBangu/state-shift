import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { getFramesDir } from "@/lib/storage";

export const runtime = "nodejs";

function getContentType(filename: string): string {
  const extension = path.extname(filename).toLowerCase();

  switch (extension) {
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    default:
      return "image/jpeg";
  }
}

type RouteContext = {
  params: Promise<{
    jobId: string;
    filename: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { jobId, filename } = await context.params;

  try {
    const filePath = path.join(getFramesDir(jobId), filename);
    const bytes = await readFile(filePath);

    return new NextResponse(bytes, {
      headers: {
        "Content-Type": getContentType(filename),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Frame not found." }, { status: 404 });
  }
}
