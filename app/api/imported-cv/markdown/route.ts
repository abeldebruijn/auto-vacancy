import { auth } from "@clerk/nextjs/server";
import { isPdfFile, MAX_PDF_BYTES, pdfToMarkdown } from "@/lib/pdf-to-markdown";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (userId === null) {
    return jsonError("Authentication required.", 401);
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return jsonError("Upload one PDF file.", 400);
  }

  if (!isPdfFile(file)) {
    return jsonError("Upload a PDF file.", 415);
  }

  if (file.size === 0) {
    return jsonError("Upload a non-empty PDF file.", 400);
  }

  if (file.size > MAX_PDF_BYTES) {
    return jsonError("Upload a PDF smaller than 10 MB.", 413);
  }

  try {
    const markdown = await pdfToMarkdown(file);
    if (markdown === "") {
      return jsonError("No readable CV text found in this PDF.", 422);
    }

    return Response.json({ markdown });
  } catch {
    return jsonError("Could not convert this PDF to markdown.", 422);
  }
}
