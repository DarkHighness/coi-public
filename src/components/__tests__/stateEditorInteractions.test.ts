// @vitest-environment jsdom

import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { StateEditor } from "../StateEditor";
import { VfsSession } from "../../services/vfs/vfsSession";
import { vfsElevationTokenManager } from "../../services/vfs/core/elevation";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: () => "",
  }),
}));

vi.mock("@monaco-editor/react", () => ({
  default: ({ value }: { value: string }) =>
    React.createElement("div", { "data-testid": "monaco-mock" }, value),
}));

vi.mock("../render/MarkdownText", () => ({
  MarkdownText: ({ content }: { content: string }) =>
    React.createElement("div", { "data-testid": "markdown-preview" }, content),
}));

interface RenderResult {
  session: VfsSession;
  applyVfsMutation: ReturnType<typeof vi.fn>;
  onShowToast: ReturnType<typeof vi.fn>;
}

const setViewportWidth = (width: number) => {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width,
  });
};

const renderStateEditor = (
  files: Array<{
    path: string;
    content: string;
    contentType: "text/plain" | "text/markdown" | "application/json";
  }>,
): RenderResult => {
  const session = new VfsSession();
  for (const file of files) {
    session.writeFile(file.path, file.content, file.contentType);
  }

  const applyVfsMutation = vi.fn();
  const onShowToast = vi.fn();

  render(
    React.createElement(StateEditor, {
      isOpen: true,
      onClose: vi.fn(),
      gameState: { forkId: 0 } as any,
      vfsSession: session,
      editorSessionToken: vfsElevationTokenManager.issueEditorSessionToken(),
      applyVfsMutation,
      onShowToast,
    }),
  );

  return { session, applyVfsMutation, onShowToast };
};

const clickFolderToggle = (folderName: string) => {
  const folderButton = screen
    .getAllByRole("button", { name: new RegExp(folderName, "i") })
    .find((button) =>
      button.textContent?.toLowerCase().includes(folderName.toLowerCase()),
    );
  expect(folderButton).toBeTruthy();
  fireEvent.click(folderButton as HTMLElement);
};

const expandWorldKnowledgeSource = () => {
  clickFolderToggle("world");
  clickFolderToggle("knowledge");
  clickFolderToggle("source");
};

const expandWorldKnowledge = () => {
  clickFolderToggle("world");
  clickFolderToggle("knowledge");
};

const ensureFileVisible = async (
  filePattern: RegExp,
  foldersToExpand: string[],
) => {
  if (screen.queryByRole("button", { name: filePattern })) {
    return;
  }

  for (const folder of foldersToExpand) {
    clickFolderToggle(folder);
    if (screen.queryByRole("button", { name: filePattern })) {
      return;
    }
  }

  await screen.findByRole("button", { name: filePattern });
};

const getContextMenu = (): HTMLElement => {
  const menu = document.querySelector(
    "[data-state-editor-context-menu='true']",
  ) as HTMLElement | null;
  expect(menu).toBeTruthy();
  return menu as HTMLElement;
};

const checkboxForFile = (fileName: string): HTMLElement => {
  const all = screen.getAllByRole("checkbox");
  const matched = all.find((checkbox) => {
    const label = checkbox.closest("label");
    const siblingButton = label?.nextElementSibling;
    return siblingButton?.textContent?.includes(fileName) ?? false;
  });
  expect(matched).toBeTruthy();
  return matched as HTMLElement;
};

beforeEach(() => {
  setViewportWidth(1280);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", () => undefined);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("StateEditor interactions", () => {
  it("opens desktop context menu on right click and closes with Escape", async () => {
    renderStateEditor([
      {
        path: "world/knowledge/source/rename-me.md",
        content: "A",
        contentType: "text/markdown",
      },
      {
        path: "world/knowledge/target/README.md",
        content: "# Target",
        contentType: "text/markdown",
      },
    ]);

    await ensureFileVisible(/rename-me\.md/i, ["world", "knowledge", "source"]);

    const fileButton = await screen.findByRole("button", { name: /rename-me\.md/i });
    fireEvent.contextMenu(fileButton);

    const menu = getContextMenu();
    expect(within(menu).getByText("Actions")).toBeTruthy();
    expect(within(menu).getByText("Rename")).toBeTruthy();

    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByText("Actions")).toBeNull();
    });
  });

  it("closes desktop context menu on outside click", async () => {
    renderStateEditor([
      {
        path: "world/knowledge/source/a.md",
        content: "A",
        contentType: "text/markdown",
      },
      {
        path: "world/knowledge/target/README.md",
        content: "# Target",
        contentType: "text/markdown",
      },
    ]);

    await ensureFileVisible(/a\.md/i, ["world", "knowledge", "source"]);
    const fileButton = await screen.findByRole("button", { name: /a\.md/i });
    fireEvent.contextMenu(fileButton);

    expect(screen.getByText("Actions")).toBeTruthy();
    fireEvent.mouseDown(document.body);

    await waitFor(() => {
      expect(screen.queryByText("Actions")).toBeNull();
    });
  });

  it("adds file to batch from desktop context menu", async () => {
    renderStateEditor([
      {
        path: "world/knowledge/source/rename-me.md",
        content: "A",
        contentType: "text/markdown",
      },
      {
        path: "world/knowledge/target/README.md",
        content: "# Target",
        contentType: "text/markdown",
      },
    ]);

    await ensureFileVisible(/rename-me\.md/i, ["world", "knowledge", "source"]);

    const fileButton = await screen.findByRole("button", {
      name: /rename-me\.md/i,
    });
    fireEvent.contextMenu(fileButton);

    const menu = getContextMenu();
    fireEvent.click(within(menu).getByRole("menuitem", { name: /Add to Batch/i }));

    const moveSelectedButton = await screen.findByRole("button", {
      name: "Move Selected",
    });
    expect((moveSelectedButton as HTMLButtonElement).disabled).toBe(false);

    const checkbox = checkboxForFile("rename-me.md") as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it("shows disabled reason for README delete in desktop context menu", async () => {
    renderStateEditor([
      {
        path: "world/knowledge/README.md",
        content: "# Knowledge",
        contentType: "text/markdown",
      },
    ]);

    await ensureFileVisible(/README\.md/i, ["world", "knowledge"]);

    const readmeButtons = await screen.findAllByRole("button", {
      name: /README\.md/i,
    });
    expect(readmeButtons.length).toBeGreaterThan(0);
    fireEvent.contextMenu(readmeButtons[0] as HTMLElement);

    const menu = getContextMenu();
    const deleteButton = within(menu).getByRole("menuitem", { name: /Delete/i });
    expect((deleteButton as HTMLButtonElement).disabled).toBe(true);
    expect(
      screen.getByText("README files are locked and cannot be deleted."),
    ).toBeTruthy();
  });

  it("opens mobile action sheet from explicit more button with file actions", async () => {
    setViewportWidth(390);

    renderStateEditor([
      {
        path: "world/knowledge/source/a.md",
        content: "A",
        contentType: "text/markdown",
      },
      {
        path: "world/knowledge/target/README.md",
        content: "# Target",
        contentType: "text/markdown",
      },
    ]);

    fireEvent.click(screen.getAllByRole("button", { name: "Files" })[0] as HTMLElement);
    await ensureFileVisible(/a\.md/i, ["world", "knowledge", "source"]);

    const fileButton = await screen.findByRole("button", { name: /a\.md/i });
    const row = fileButton.parentElement as HTMLElement;
    const moreButton = within(row).getByTitle("More actions");
    fireEvent.click(moreButton);

    const heading = screen.getByText("More actions");
    expect(heading).toBeTruthy();

    const actionList = heading.parentElement?.nextElementSibling as HTMLElement | null;
    expect(actionList).toBeTruthy();
    expect(within(actionList as HTMLElement).getByText("Rename")).toBeTruthy();
    expect(within(actionList as HTMLElement).getByText("Move")).toBeTruthy();
    expect(within(actionList as HTMLElement).getByText("Delete")).toBeTruthy();
    expect(within(actionList as HTMLElement).getByText("Copy Path")).toBeTruthy();
    expect(within(actionList as HTMLElement).getByText("Add to Batch")).toBeTruthy();

    fireEvent.click(screen.getByLabelText("More actions"));

    await waitFor(() => {
      expect(screen.queryByText("More actions")).toBeNull();
    });
  });

  it("shows file-only batch selection and blocks move without selection", async () => {
    renderStateEditor([
      {
        path: "world/knowledge/source/a.md",
        content: "A",
        contentType: "text/markdown",
      },
      {
        path: "world/knowledge/target/README.md",
        content: "# Target",
        contentType: "text/markdown",
      },
    ]);

    fireEvent.click(await screen.findByRole("button", { name: "Batch" }));
    await ensureFileVisible(/a\.md/i, ["world", "knowledge", "source"]);

    const sourceFolderButton = await screen.findByRole("button", {
      name: /source/i,
    });
    const sourceRow = sourceFolderButton.parentElement as HTMLElement;
    expect(within(sourceRow).queryByRole("checkbox")).toBeNull();

    const aFileButton = await screen.findByRole("button", { name: /a\.md/i });
    const aFileRow = aFileButton.parentElement as HTMLElement;
    expect(within(aFileRow).getByRole("checkbox")).toBeTruthy();

    const moveSelectedButton = screen.getByRole("button", { name: "Move Selected" });
    expect((moveSelectedButton as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/Select files, then choose Move Selected/i)).toBeTruthy();
  });

  it("moves selected files in batch destination mode", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const { session, applyVfsMutation, onShowToast } = renderStateEditor([
      {
        path: "world/knowledge/source/a.md",
        content: "A",
        contentType: "text/markdown",
      },
      {
        path: "world/knowledge/source/b.md",
        content: "B",
        contentType: "text/markdown",
      },
      {
        path: "world/knowledge/target/README.md",
        content: "# Target",
        contentType: "text/markdown",
      },
    ]);

    fireEvent.click(await screen.findByRole("button", { name: "Batch" }));
    await ensureFileVisible(/a\.md/i, ["world", "knowledge", "source"]);

    fireEvent.click(checkboxForFile("a.md"));
    fireEvent.click(checkboxForFile("b.md"));

    fireEvent.click(screen.getByRole("button", { name: "Move Selected" }));

    const targetFolderButton = screen
      .getAllByRole("button", { name: /target/i })
      .find((button) => button.textContent?.toLowerCase().includes("target"));
    expect(targetFolderButton).toBeTruthy();
    const targetRow = targetFolderButton?.parentElement as HTMLElement;

    const destinationButton = within(targetRow).getByTitle("Select destination");
    fireEvent.click(destinationButton);

    await waitFor(() => {
      expect(applyVfsMutation).toHaveBeenCalledTimes(1);
    });

    expect(confirmSpy).toHaveBeenCalled();
    expect(session.readFile("world/knowledge/source/a.md")).toBeNull();
    expect(session.readFile("world/knowledge/source/b.md")).toBeNull();
    expect(session.readFile("world/knowledge/target/a.md")).toBeTruthy();
    expect(session.readFile("world/knowledge/target/b.md")).toBeTruthy();
    expect(onShowToast).toHaveBeenCalledWith("Moved 2 files", "success");
  });

  it("fails batch move atomically when destination has conflicts", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const { session, applyVfsMutation, onShowToast } = renderStateEditor([
      {
        path: "world/knowledge/source/a.md",
        content: "A",
        contentType: "text/markdown",
      },
      {
        path: "world/knowledge/source/b.md",
        content: "B",
        contentType: "text/markdown",
      },
      {
        path: "world/knowledge/target/README.md",
        content: "# Target",
        contentType: "text/markdown",
      },
      {
        path: "world/knowledge/target/a.md",
        content: "existing",
        contentType: "text/markdown",
      },
    ]);

    fireEvent.click(await screen.findByRole("button", { name: "Batch" }));
    await ensureFileVisible(/a\.md/i, ["world", "knowledge", "source"]);

    fireEvent.click(checkboxForFile("a.md"));
    fireEvent.click(checkboxForFile("b.md"));

    fireEvent.click(screen.getByRole("button", { name: "Move Selected" }));

    const targetFolderButton = screen
      .getAllByRole("button", { name: /target/i })
      .find((button) => button.textContent?.toLowerCase().includes("target"));
    expect(targetFolderButton).toBeTruthy();
    const targetRow = targetFolderButton?.parentElement as HTMLElement;

    const destinationButton = within(targetRow).getByTitle("Select destination");
    fireEvent.click(destinationButton);

    await waitFor(() => {
      expect(onShowToast).toHaveBeenCalledWith(
        expect.stringContaining("Target already exists"),
        "error",
      );
    });

    expect(confirmSpy).toHaveBeenCalled();
    expect(applyVfsMutation).not.toHaveBeenCalled();
    expect(session.readFile("world/knowledge/source/a.md")).toBeTruthy();
    expect(session.readFile("world/knowledge/source/b.md")).toBeTruthy();
    expect(session.readFile("world/knowledge/target/a.md")?.content).toBe(
      "existing",
    );
    expect(session.readFile("world/knowledge/target/b.md")).toBeNull();
  });
});
