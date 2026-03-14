import { NextResponse } from "next/server";

import { getJobProgress } from "@/lib/progress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    jobId: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { jobId } = await context.params;
  const progress = getJobProgress(jobId);

  if (!progress) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  return NextResponse.json(progress);
}
