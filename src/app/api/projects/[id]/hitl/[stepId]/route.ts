import { prisma } from "@/lib/db";
import { approveStep } from "@/lib/agents/orchestrator";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  const { id, stepId } = await params;
  const body = await request.json();
  const { approved } = body;

  if (typeof approved !== "boolean") {
    return NextResponse.json(
      { error: "approved boolean is required" },
      { status: 400 }
    );
  }

  // Verify the step belongs to an analysis in this project
  const step = await prisma.analysisStep.findUnique({
    where: { id: stepId },
    include: { analysis: true },
  });

  if (!step || step.analysis.projectId !== id) {
    return NextResponse.json({ error: "Step not found" }, { status: 404 });
  }

  await approveStep(stepId, approved);

  return NextResponse.json({ message: "Step approved" });
}
