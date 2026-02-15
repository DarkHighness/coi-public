// @vitest-environment jsdom

import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const validateImportMock = vi.fn();
const importSaveMock = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

vi.mock("../services/saveExportService", () => ({
  validateImport: (...args: unknown[]) => validateImportMock(...args),
  importSave: (...args: unknown[]) => importSaveMock(...args),
}));

import { ImportSaveModal } from "./ImportSaveModal";

describe("ImportSaveModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    validateImportMock.mockResolvedValue({
      valid: true,
      errors: [],
      warnings: [],
    });
  });

  it("validates file selection through native clickable input", async () => {
    const { container, getByText } = render(
      React.createElement(ImportSaveModal, {
        existingSlots: [],
        onClose: vi.fn(),
        onImportComplete: vi.fn(),
      }),
    );

    const input = container.querySelector(
      "input[type='file']",
    ) as HTMLInputElement | null;
    expect(input).toBeTruthy();
    expect((input?.className ?? "").includes("hidden")).toBe(false);
    expect(input?.className ?? "").toContain("absolute");

    const file = new File(["zip"], "slot-export.zip", {
      type: "application/zip",
    });

    fireEvent.change(input as HTMLInputElement, { target: { files: [file] } });

    await waitFor(() => {
      expect(validateImportMock).toHaveBeenCalledWith(file);
    });

    expect(getByText("slot-export.zip")).toBeTruthy();
  });
});
