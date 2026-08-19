import mammoth from "mammoth";

export interface ParsedDocument {
  content: string;
  metadata: {
    type: "pdf" | "docx" | "md";
    pages?: number;
    title?: string;
  };
}

function ensureDOMMatrixPolyfill() {
  if (typeof globalThis.DOMMatrix !== "undefined") return;

  class DOMMatrixPolyfill {
    a = 1;
    b = 0;
    c = 0;
    d = 1;
    e = 0;
    f = 0;
    m11 = 1;
    m12 = 0;
    m13 = 0;
    m14 = 0;
    m21 = 0;
    m22 = 1;
    m23 = 0;
    m24 = 0;
    m31 = 0;
    m32 = 0;
    m33 = 1;
    m34 = 0;
    m41 = 0;
    m42 = 0;
    m43 = 0;
    m44 = 1;
    is2D = true;
    isIdentity = true;

    constructor(init?: string | number[]) {
      if (typeof init === "string" && init) {
        const values = init.match(/-?[\d.]+/g)?.map(Number);
        if (values && values.length >= 6) {
          this.a = values[0];
          this.b = values[1];
          this.c = values[2];
          this.d = values[3];
          this.e = values[4];
          this.f = values[5];
        }
      } else if (Array.isArray(init) && init.length >= 6) {
        this.a = init[0];
        this.b = init[1];
        this.c = init[2];
        this.d = init[3];
        this.e = init[4];
        this.f = init[5];
      }
      this.m11 = this.a;
      this.m12 = this.b;
      this.m21 = this.c;
      this.m22 = this.d;
      this.m41 = this.e;
      this.m42 = this.f;
    }

    multiply(other: DOMMatrixPolyfill) {
      const r = new DOMMatrixPolyfill();
      r.a = this.a * other.a + this.c * other.b;
      r.b = this.b * other.a + this.d * other.b;
      r.c = this.a * other.c + this.c * other.d;
      r.d = this.b * other.c + this.d * other.d;
      r.e = this.a * other.e + this.c * other.f + this.e;
      r.f = this.b * other.e + this.d * other.f + this.f;
      return r;
    }

    translate(tx = 0, ty = 0) {
      const r = new DOMMatrixPolyfill();
      r.e = tx;
      r.f = ty;
      return this.multiply(r);
    }

    scale(sx: number, sy?: number) {
      const r = new DOMMatrixPolyfill();
      r.a = sx;
      r.d = sy ?? sx;
      return this.multiply(r);
    }

    toString() {
      return `matrix(${this.a},${this.b},${this.c},${this.d},${this.e},${this.f})`;
    }
  }

  globalThis.DOMMatrix = DOMMatrixPolyfill as unknown as typeof DOMMatrix;
}

export async function parsePDF(buffer: Buffer): Promise<ParsedDocument> {
  ensureDOMMatrixPolyfill();

  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

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
