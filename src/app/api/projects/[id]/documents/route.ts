import { prisma } from "@/lib/db";
import { parseFile } from "@/lib/parser";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const documents = await prisma.document.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(documents);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const formData = await request.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = await parseFile(buffer, file.name);

  const document = await prisma.document.create({
    data: {
      projectId: id,
      name: file.name,
      type: parsed.metadata.type,
      content: parsed.content,
      size: file.size,
    },
  });

  return NextResponse.json(document, { status: 201 });
}
