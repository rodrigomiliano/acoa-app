import { prisma } from "@/lib/db";
import { runAnalyst, AnalystOutput } from "./analyst";
import { runReviewer, ReviewerOutput } from "./reviewer";
import { runEditor, EditorOutput } from "./editor";
import { runCoverage, CoverageOutput } from "./coverage";

export interface PipelineEvent {
  type: "step_start" | "step_complete" | "step_error" | "pipeline_complete" | "needs_approval";
  step?: string;
  data?: unknown;
  error?: string;
}

export type PipelineCallback = (event: PipelineEvent) => void;

const MAX_ITERATIONS = 3;

export async function runPipeline(
  analysisId: string,
  documentContent: string,
  documentName: string,
  onEvent: PipelineCallback
): Promise<void> {
  let iteration = 0;
  let allIssues: string[] = [];
  let finalEditorOutput: EditorOutput | null = null;

  while (iteration < MAX_ITERATIONS) {
    iteration++;
    onEvent({ type: "step_start", step: "analyst", data: { iteration } });

    // Step 1: Analyst
    const analystStep = await createStep(analysisId, "analyst", {
      iteration,
      documentName,
    });

    let analystOutput: AnalystOutput;
    try {
      analystOutput = await runAnalyst(documentContent, documentName);
      await updateStep(analystStep.id, "completed", analystOutput);
      allIssues.push(
        ...analystOutput.issues.map((i) => `${i.id}: ${i.description}`)
      );
      onEvent({ type: "step_complete", step: "analyst", data: analystOutput });
    } catch (error) {
      await updateStep(analystStep.id, "failed", { error: String(error) });
      onEvent({
        type: "step_error",
        step: "analyst",
        error: String(error),
      });
      throw error;
    }

    // Check if HITL approval needed
    await createHITLRequest(analystStep.id, analystOutput);

    // Step 2: Reviewer
    onEvent({ type: "step_start", step: "reviewer" });
    const reviewerStep = await createStep(analysisId, "reviewer", {
      analystOutput,
    });

    let reviewerOutput: ReviewerOutput;
    try {
      reviewerOutput = await runReviewer(documentContent, analystOutput);
      await updateStep(reviewerStep.id, "completed", reviewerOutput);
      onEvent({
        type: "step_complete",
        step: "reviewer",
        data: reviewerOutput,
      });
    } catch (error) {
      await updateStep(reviewerStep.id, "failed", { error: String(error) });
      onEvent({
        type: "step_error",
        step: "reviewer",
        error: String(error),
      });
      throw error;
    }

    // Check if HITL approval needed
    await createHITLRequest(reviewerStep.id, reviewerOutput);

    // Step 3: Editor
    onEvent({ type: "step_start", step: "editor" });
    const editorStep = await createStep(analysisId, "editor", {
      analystOutput,
      reviewerOutput,
    });

    let editorOutput: EditorOutput;
    try {
      editorOutput = await runEditor(documentContent, reviewerOutput);
      await updateStep(editorStep.id, "completed", editorOutput);
      finalEditorOutput = editorOutput;
      onEvent({
        type: "step_complete",
        step: "editor",
        data: editorOutput,
      });
    } catch (error) {
      await updateStep(editorStep.id, "failed", { error: String(error) });
      onEvent({
        type: "step_error",
        step: "editor",
        error: String(error),
      });
      throw error;
    }

    // Check if HITL approval needed
    await createHITLRequest(editorStep.id, editorOutput);

    // Step 4: Coverage
    onEvent({ type: "step_start", step: "coverage" });
    const coverageStep = await createStep(analysisId, "coverage", {
      allIssues,
    });

    let coverageOutput: CoverageOutput;
    try {
      coverageOutput = await runCoverage(documentContent, allIssues);
      await updateStep(coverageStep.id, "completed", coverageOutput);
      onEvent({
        type: "step_complete",
        step: "coverage",
        data: coverageOutput,
      });
    } catch (error) {
      await updateStep(coverageStep.id, "failed", { error: String(error) });
      onEvent({
        type: "step_error",
        step: "coverage",
        error: String(error),
      });
      throw error;
    }

    // Check if we should continue iterating
    if (!coverageOutput.shouldContinue || iteration >= MAX_ITERATIONS) {
      break;
    }

    // Add recommendations to issues for next iteration
    allIssues.push(...coverageOutput.recommendations);
  }

  // Complete the analysis
  await prisma.analysis.update({
    where: { id: analysisId },
    data: {
      status: "completed",
      endedAt: new Date(),
    },
  });

  // Save to memory
  await prisma.memory.create({
    data: {
      projectId: (
        await prisma.analysis.findUnique({ where: { id: analysisId } })
      )!.projectId,
      type: "analysis_summary",
      content: JSON.stringify({
        analysisId,
        iterations: iteration,
        totalIssues: allIssues.length,
        finalDocument: finalEditorOutput?.editedDocument,
      }),
    },
  });

  onEvent({
    type: "pipeline_complete",
    data: {
      analysisId,
      iterations: iteration,
      totalIssues: allIssues.length,
    },
  });
}

async function createStep(
  analysisId: string,
  agent: string,
  input: unknown
) {
  return prisma.analysisStep.create({
    data: {
      analysisId,
      agent,
      status: "running",
      input: JSON.stringify(input),
    },
  });
}

async function updateStep(
  stepId: string,
  status: string,
  output: unknown
) {
  return prisma.analysisStep.update({
    where: { id: stepId },
    data: {
      status,
      output: JSON.stringify(output),
    },
  });
}

async function createHITLRequest(stepId: string, output: unknown) {
  return prisma.analysisStep.update({
    where: { id: stepId },
    data: {
      status: "pending_approval",
    },
  });
}

export async function approveStep(stepId: string, approved: boolean) {
  return prisma.analysisStep.update({
    where: { id: stepId },
    data: {
      status: approved ? "completed" : "failed",
      approved,
    },
  });
}
