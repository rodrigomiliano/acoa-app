import { prisma } from "@/lib/db";
import { runPipeline, PipelineEvent } from "@/lib/agents/orchestrator";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { documentIds } = body;

  if (!documentIds?.length) {
    return NextResponse.json(
      { error: "At least one document ID is required" },
      { status: 400 }
    );
  }

  // Get the first document for analysis (MVP: single document)
  const document = await prisma.document.findUnique({
    where: { id: documentIds[0] },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Create analysis record
  const analysis = await prisma.analysis.create({
    data: {
      projectId: id,
      status: "running",
    },
  });

  // Return analysis ID immediately, then run pipeline in background
  // For SSE, we'll use a separate endpoint
  return NextResponse.json({ analysisId: analysis.id });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const url = new URL(request.url);
  const analysisId = url.searchParams.get("analysisId");

  if (!analysisId) {
    return NextResponse.json(
      { error: "analysisId query parameter is required" },
      { status: 400 }
    );
  }

  const analysis = await prisma.analysis.findUnique({
    where: { id: analysisId },
    include: { steps: true },
  });

  if (!analysis) {
    return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
  }

  return NextResponse.json(analysis);
}
