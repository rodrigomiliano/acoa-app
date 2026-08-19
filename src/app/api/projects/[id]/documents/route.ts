import { prisma } from "@/lib/db";
import { parseFile } from "@/lib/parser";
import { NextResponse } from "next/server";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const documents = await prisma.document.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB" },
        { status: 400 }
      );
    }

    const ext = file.name.toLowerCase().split(".").pop();
    if (!["pdf", "docx", "md", "markdown"].includes(ext || "")) {
      return NextResponse.json(
        { error: "Unsupported file type. Accepted: PDF, DOCX, MD" },
        { status: 400 }
      );
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
  } catch (error) {
    console.error("Error uploading document:", error);
    const message =
      error instanceof Error ? error.message : "Failed to upload document";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
