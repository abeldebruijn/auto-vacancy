import { describe, expect, it } from "vitest";
import { isMarkdownCvFile } from "@/lib/candidate-profile";

describe("isMarkdownCvFile", () => {
  it("accepts .md files case-insensitively", () => {
    expect(isMarkdownCvFile("candidate.md")).toBe(true);
    expect(isMarkdownCvFile("candidate.MD")).toBe(true);
  });

  it("rejects other markdown-like and future import formats", () => {
    expect(isMarkdownCvFile("candidate.markdown")).toBe(false);
    expect(isMarkdownCvFile("candidate.pdf")).toBe(false);
    expect(isMarkdownCvFile("candidate.docx")).toBe(false);
    expect(isMarkdownCvFile("candidate")).toBe(false);
  });
});
