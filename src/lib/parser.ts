import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

export interface ParsedDocument {
  content: string;
  metadata: {
    type: "pdf" | "docx" | "md";
    pages?: number;
    title?: string;
  };
}

export async function parsePDF(buffer: Buffer): Promise<ParsedDocument> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const textResult = await parser.getText();
  const info = await parser.getInfo();
  return {
    content: textResult.text || "",
    metadata: {
      type: "pdf",
      pages: info.total,
      title: info.info?.Title,
    },
  };
}

export async function parseDOCX(buffer: Buffer): Promise<ParsedDocument> {
  const result = await mammoth.extractRawText({ buffer });
  return {
    content: result.value,
    metadata: {
      type: "docx",
      title: undefined,
    },
  };
}

export async function parseFile(
  buffer: Buffer,
  filename: string
): Promise<ParsedDocument> {
  const ext = filename.toLowerCase().split(".").pop();
  
  switch (ext) {
    case "pdf":
      return parsePDF(buffer);
    case "docx":
      return parseDOCX(buffer);
    case "md":
    case "markdown":
      return {
        content: buffer.toString("utf-8"),
        metadata: { type: "md" },
      };
    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}
