import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  destroy: vi.fn(),
  getText: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.auth,
}));

vi.mock("pdf-parse", () => ({
  PDFParse: vi.fn().mockImplementation(function MockPDFParse() {
    return {
      getText: mocks.getText,
      destroy: mocks.destroy,
    };
  }),
}));

function requestWithFile(file: File) {
  return {
    formData: async () => ({
      get: (key: string) => (key === "file" ? file : null),
    }),
  } as Request;
}

describe("vacancy source markdown route", () => {
  beforeEach(() => {
    mocks.auth.mockReset();
    mocks.auth.mockResolvedValue({ userId: "user_123" });
    mocks.getText.mockReset();
    mocks.destroy.mockReset();
    mocks.destroy.mockResolvedValue(undefined);
  });

  it("rejects unauthenticated requests", async () => {
    mocks.auth.mockResolvedValue({ userId: null });

    const response = await POST(requestWithFile(new File(["%PDF-1.7"], "vacancy.pdf")));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Authentication required." });
  });

  it("rejects non-PDF uploads", async () => {
    const response = await POST(requestWithFile(new File(["hello"], "vacancy.txt")));

    expect(response.status).toBe(415);
    expect(await response.json()).toEqual({ error: "Upload a PDF file." });
  });

  it("rejects oversized PDF uploads", async () => {
    const response = await POST(
      requestWithFile(
        new File([new Uint8Array(10 * 1024 * 1024 + 1)], "vacancy.pdf", {
          type: "application/pdf",
        }),
      ),
    );

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: "Upload a PDF smaller than 10 MB." });
  });

  it("returns markdown for a valid small PDF", async () => {
    mocks.getText.mockResolvedValue({
      pages: [
        { num: 1, text: "Frontend Developer\n\nBuild React interfaces." },
        { num: 2, text: "Apply before Friday." },
      ],
      text: "",
      total: 2,
    });

    const response = await POST(
      requestWithFile(new File(["%PDF-1.7"], "vacancy.pdf", { type: "application/pdf" })),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      markdown: "Frontend Developer\n\nBuild React interfaces.\n\nApply before Friday.",
    });
    expect(mocks.destroy).toHaveBeenCalledOnce();
  });

  it("does not return raw PDF bytes or filename metadata", async () => {
    mocks.getText.mockResolvedValue({
      pages: [],
      text: "Frontend Developer",
      total: 1,
    });

    const response = await POST(
      requestWithFile(new File(["%PDF-1.7"], "private-vacancy.pdf", { type: "application/pdf" })),
    );
    const body = await response.json();

    expect(body).toEqual({ markdown: "Frontend Developer" });
    expect(JSON.stringify(body)).not.toContain("%PDF");
    expect(JSON.stringify(body)).not.toContain("private-vacancy.pdf");
  });
});
