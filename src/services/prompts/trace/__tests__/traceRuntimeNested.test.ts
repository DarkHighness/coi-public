import { afterEach, describe, expect, it } from "vitest";
import {
  clearPromptTraceRegistry,
  defineAtom,
  defineSkillAtom,
  getLatestPromptTrace,
  getRegisteredPromptAtoms,
  runPromptWithTrace,
  setPromptTraceEnabled,
} from "../runtime";

describe("trace runtime nested recording", () => {
  afterEach(() => {
    clearPromptTraceRegistry();
    setPromptTraceEnabled(false);
  });

  it("records parent-child dependency via trace.record(atomFn)", () => {
    const technology = defineAtom(
      {
        atomId: "atoms/test/technology#technology",
        source: "tests/runtime",
        exportName: "technology",
      },
      () => "<technology />",
    );

    const technologySkill = defineSkillAtom(
      {
        atomId: "atoms/test/technology#technologySkill",
        source: "tests/runtime",
        exportName: "technologySkill",
      },
      (_input, trace) => ({
        main: trace.record(technology),
      }),
    );

    setPromptTraceEnabled(true);

    const prompt = runPromptWithTrace("test.trace.runtime.record", () => {
      const rendered = technologySkill(undefined);
      return rendered.main;
    });

    expect(prompt).toContain("technology");

    const trace = getLatestPromptTrace("test.trace.runtime.record");
    expect(trace).toBeDefined();

    const skillCall = trace?.atoms.find(
      (item) => item.atomId === "atoms/test/technology#technologySkill",
    );
    const techCall = trace?.atoms.find(
      (item) => item.atomId === "atoms/test/technology#technology",
    );

    expect(skillCall).toBeDefined();
    expect(techCall).toBeDefined();
    expect(techCall?.parentId).toBe(skillCall?.id);

    const registered = getRegisteredPromptAtoms();
    expect(
      registered.some(
        (item) => item.atomId === "atoms/test/technology#technology",
      ),
    ).toBe(true);
    expect(
      registered.some(
        (item) => item.atomId === "atoms/test/technology#technologySkill",
      ),
    ).toBe(true);
  });

  it("supports trace.record(meta, rawRenderer) for inline fragments", () => {
    const composedSkill = defineSkillAtom(
      {
        atomId: "atoms/test/inline#composedSkill",
        source: "tests/runtime",
        exportName: "composedSkill",
      },
      (_input, trace) => ({
        main: trace.record(
          {
            atomId: "atoms/test/inline#rawFragment",
            source: "tests/runtime",
            exportName: "rawFragment",
          },
          () => "<raw_fragment />",
        ),
      }),
    );

    setPromptTraceEnabled(true);

    runPromptWithTrace(
      "test.trace.runtime.inline",
      () => composedSkill(undefined).main,
    );

    const trace = getLatestPromptTrace("test.trace.runtime.inline");
    expect(trace).toBeDefined();
    expect(
      trace?.atoms.some(
        (item) => item.atomId === "atoms/test/inline#rawFragment",
      ),
    ).toBe(true);
  });
});
