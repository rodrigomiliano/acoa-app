import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
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
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    isEvalSupported: false,
    useWorkerFetch: false,
    useSystemFonts: true,
  });

  const doc = await loadingTask.promise;

  let text = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .filter((item) => "str" in item)
      .map((item) => (item as { str: string }).str)
      .join(" ");
    text += pageText + "\n\n";
    page.cleanup();
  }

  const metadata = await doc.getMetadata().catch(() => null);
  const info = (metadata?.info ?? null) as Record<string, string> | null;

  return {
    content: text.trim(),
    metadata: {
      type: "pdf",
      pages: doc.numPages,
      title: info?.Title,
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
