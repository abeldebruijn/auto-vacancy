import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StartProfileScreen } from "@/components/profile/start-profile-screen";

function renderStartProfileScreen() {
  const props = {
    pastedMarkdown: "",
    status: null,
    onMarkdownChange: vi.fn(),
    onPasteImport: vi.fn(),
    onFileImport: vi.fn(),
    onManualStart: vi.fn(),
  };

  const view = render(<StartProfileScreen {...props} />);

  return { ...view, props };
}

describe("StartProfileScreen", () => {
  it("keeps pasted CV extraction disabled until markdown is present", () => {
    renderStartProfileScreen();

    expect(
      screen.getByRole("button", { name: /extract profile from pasted cv/i }),
    ).toBeDisabled();
  });

  it("extracts the profile from pasted markdown", async () => {
    const { props, rerender } = renderStartProfileScreen();
    expect(screen.getByLabelText(/paste markdown cv/i).tagName).toBe(
      "TEXTAREA",
    );

    fireEvent.input(screen.getByLabelText(/paste markdown cv/i), {
      target: { value: "# Abel\n\n## Experience\n- Developer" },
    });
    expect(props.onMarkdownChange).toHaveBeenCalled();

    rerender(
      <StartProfileScreen
        {...props}
        pastedMarkdown="# Abel\n\n## Experience\n- Developer"
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /extract profile from pasted cv/i }),
    );

    expect(props.onPasteImport).toHaveBeenCalledOnce();
  });

  it("uploads a selected .md CV file", async () => {
    const { props } = renderStartProfileScreen();
    const file = new File(["# Abel"], "abel-cv.md", {
      type: "text/markdown",
    });
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    // expect(input).toHaveAttribute("accept", ".md");

    fireEvent.change(input, { target: { files: [file] } });

    expect(props.onFileImport).toHaveBeenCalledWith(file);
  });
});
