/**
 * POST /api/chappie/ingest-file
 *
 * 添付ファイル（PDF / DOCX / TXT / MD）をテキストに変換して返す。
 * DB保存はせず、クライアント側でメモリ管理する。
 *
 * Request:  multipart/form-data, field: "file" (single)
 * Response: { filename, mimeType, text, truncated, charCount, tokensEstimate }
 */
import { NextResponse } from "next/server";

// pdf-parse / mammoth are Node-only CommonJS modules that touch `DOMMatrix`
// during evaluation. They're loaded inside the POST handler via dynamic
// require so Next.js' page-data collection phase never evaluates them.
type PdfParse = (
  dataBuffer: Buffer,
  options?: Record<string, unknown>,
) => Promise<{ text: string }>;
type MammothModule = {
  extractRawText: (input: { buffer: Buffer }) => Promise<{ value: string }>;
};

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_CHARS = 30_000;

const SUPPORTED_MIME = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
]);

/** 拡張子 → MIME のフォールバックマップ */
const EXT_TO_MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".txt": "text/plain",
  ".md": "text/markdown",
};

function resolvedMime(file: File): string {
  // File.type が信頼できる場合はそのまま使う
  if (file.type && SUPPORTED_MIME.has(file.type)) return file.type;
  // 拡張子からフォールバック
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  return EXT_TO_MIME[ext] ?? file.type;
}

export async function POST(req: Request) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid multipart form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file field is required" }, { status: 400 });
  }

  // サイズチェック
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "file too large (max 10MB)" }, { status: 413 });
  }

  const mimeType = resolvedMime(file);

  if (!SUPPORTED_MIME.has(mimeType)) {
    return NextResponse.json({ error: "unsupported file type" }, { status: 415 });
  }

  let rawText: string;
  try {
    if (mimeType === "application/pdf") {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse") as PdfParse;
      const parsed = await pdfParse(buffer);
      rawText = parsed.text;
    } else if (
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mammoth = require("mammoth") as MammothModule;
      const result = await mammoth.extractRawText({ buffer });
      rawText = result.value;
    } else {
      // text/plain or text/markdown
      rawText = await file.text();
    }
  } catch (err) {
    const label =
      mimeType === "application/pdf"
        ? "PDF"
        : mimeType.includes("word")
          ? "DOCX"
          : "text";
    console.error(`[ingest-file] failed to extract ${label}`, err);
    return NextResponse.json(
      { error: `failed to extract text from ${label}` },
      { status: 422 },
    );
  }

  const truncated = rawText.length > MAX_CHARS;
  const text = truncated ? rawText.slice(0, MAX_CHARS) : rawText;
  const charCount = text.length;
  const tokensEstimate = Math.ceil(charCount / 3);

  return NextResponse.json({
    filename: file.name,
    mimeType,
    text,
    truncated,
    charCount,
    tokensEstimate,
  });
}
