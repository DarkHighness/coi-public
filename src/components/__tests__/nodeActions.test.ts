import { describe, expect, it, vi } from "vitest";
import { buildNodeActions } from "../vfsExplorer/nodeActions";

describe("nodeActions", () => {
  it("builds file actions in expected order", () => {
    const onSelect = vi.fn();

    const actions = buildNodeActions({
      nodeType: "file",
      actions: {
        rename: { onSelect },
        move: { onSelect },
        delete: { onSelect },
        copy_path: { onSelect },
        add_to_batch: { onSelect },
        remove_from_batch: { onSelect, show: false },
      },
    });

    expect(actions.map((item) => item.id)).toEqual([
      "rename",
      "move",
      "delete",
      "copy_path",
      "add_to_batch",
    ]);
  });

  it("preserves disabled reason for blocked items", () => {
    const onSelect = vi.fn();

    const actions = buildNodeActions({
      nodeType: "folder",
      actions: {
        new_file_here: {
          onSelect,
          enabled: false,
          disabledReason: "Folder is read-only",
        },
      },
    });

    expect(actions).toHaveLength(1);
    expect(actions[0]?.id).toBe("new_file_here");
    expect(actions[0]?.disabled).toBe(true);
    expect(actions[0]?.disabledReason).toBe("Folder is read-only");
  });

  it("includes quick template action for custom-rule folders", () => {
    const onSelect = vi.fn();

    const actions = buildNodeActions({
      nodeType: "folder",
      actions: {
        quick_rule_template_here: { onSelect },
        rename: { onSelect, show: false },
      },
    });

    expect(actions.map((item) => item.id)).toEqual(["quick_rule_template_here"]);
    expect(actions[0]?.labelKey).toBe("stateEditor.quickRuleTemplateHere");
  });
});
