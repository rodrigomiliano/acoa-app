import { prisma } from "@/lib/db";
import { runPipeline } from "@/lib/agents/orchestrator";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { analysisId, documentId } = body;

  if (!analysisId || !documentId) {
    return NextResponse.json(
      { error: "analysisId and documentId are required" },
      { status: 400 }
    );
  }

  const document = await prisma.document.findUnique({
    where: { id: documentId },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Run pipeline in background (non-blocking)
  runPipeline(
    analysisId,
    document.content,
    document.name,
    (event) => {
      // In a real app, this would push to WebSocket/SSE
      console.log("Pipeline event:", event);
    }
  ).catch((error) => {
    console.error("Pipeline error:", error);
    prisma.analysis.update({
      where: { id: analysisId },
      data: { status: "failed" },
    });
  });

  return NextResponse.json({ message: "Pipeline started" });
}
