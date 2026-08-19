import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const memory = await prisma.memory.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
  });

  const analyses = await prisma.analysis.findMany({
    where: { projectId: id },
    include: { steps: true },
    orderBy: { startedAt: "desc" },
  });

  return NextResponse.json({
    memory,
    analyses,
    stats: {
      totalAnalyses: analyses.length,
      completedAnalyses: analyses.filter((a) => a.status === "completed")
        .length,
      totalSteps: analyses.reduce((acc, a) => acc + a.steps.length, 0),
      totalMemoryEntries: memory.length,
    },
  });
}
