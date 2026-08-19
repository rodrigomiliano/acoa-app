import { prisma } from "@/lib/db";
import { generateWithGemini } from "@/lib/llm";
import { NextResponse } from "next/server";

interface Document {
  id: string;
  name: string;
  content: string;
}

interface Analysis {
  id: string;
  status: string;
  steps: {
    agent: string;
    output: string | null;
  }[];
}

interface Memory {
  type: string;
  content: string;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const messages = await prisma.chatMessage.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(messages);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { content } = body;

  if (!content) {
    return NextResponse.json(
      { error: "Content is required" },
      { status: 400 }
    );
  }

  // Save user message
  await prisma.chatMessage.create({
    data: {
      projectId: id,
      role: "user",
      content,
    },
  });

  // Get RAG context from documents and analyses
  const documents = await prisma.document.findMany({
    where: { projectId: id },
    take: 3,
  });

  const analyses = await prisma.analysis.findMany({
    where: { projectId: id },
    include: { steps: true },
    take: 3,
  });

  const memory = await prisma.memory.findMany({
    where: { projectId: id },
    take: 5,
  });

  // Build context
  const context = `
DOCUMENTS:
${documents.map((d: Document) => `${d.name}:\n${d.content.substring(0, 1000)}`).join("\n\n")}

ANALYSES:
${analyses.map((a: Analysis) => `Analysis ${a.id} (${a.status}):\n${a.steps.map((s) => `${s.agent}: ${s.output?.substring(0, 200) || "pending"}`).join("\n")}`).join("\n\n")}

MEMORY:
${memory.map((m: Memory) => `${m.type}: ${m.content.substring(0, 300)}`).join("\n")}
`;

  // Generate response with RAG context
  const systemInstruction = `You are ACOA, an AI assistant for software quality assurance.

You help users understand their documents, analysis results, and provide insights about software quality.

When answering questions:
1. Use the provided context from documents and analyses
2. Be specific and cite sources when possible
3. If you don't have enough context, say so
4. Keep responses concise and actionable

CONTEXT FROM PROJECT:
${context}`;

  const response = await generateWithGemini(content, systemInstruction);

  // Save assistant message
  const assistantMessage = await prisma.chatMessage.create({
    data: {
      projectId: id,
      role: "assistant",
      content: response.text,
      context: JSON.stringify({
        documentsUsed: documents.map((d: Document) => d.id),
        analysesUsed: analyses.map((a: Analysis) => a.id),
      }),
    },
  });

  return NextResponse.json(assistantMessage);
}
