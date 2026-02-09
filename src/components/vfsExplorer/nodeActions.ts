export type NodeActionId =
  | "select"
  | "new_file_here"
  | "new_folder_here"
  | "quick_rule_template_here"
  | "move_here"
  | "rename"
  | "move"
  | "delete"
  | "copy_path"
  | "add_to_batch"
  | "remove_from_batch";

export interface NodeActionItem {
  id: NodeActionId;
  labelKey: string;
  fallbackLabel: string;
  danger?: boolean;
  disabled: boolean;
  disabledReason: string | null;
  onSelect: () => void;
}

export interface NodeActionConfig {
  onSelect: () => void;
  enabled?: boolean;
  disabledReason?: string | null;
  show?: boolean;
}

interface BuildNodeActionsInput {
  nodeType: "file" | "folder";
  actions: Partial<Record<NodeActionId, NodeActionConfig>>;
}

const ACTION_META: Record<
  NodeActionId,
  { labelKey: string; fallbackLabel: string; danger?: boolean }
> = {
  select: {
    labelKey: "stateEditor.select",
    fallbackLabel: "Select",
  },
  new_file_here: {
    labelKey: "stateEditor.newFileHere",
    fallbackLabel: "New File Here",
  },
  new_folder_here: {
    labelKey: "stateEditor.newFolderHere",
    fallbackLabel: "New Folder Here",
  },
  quick_rule_template_here: {
    labelKey: "stateEditor.quickRuleTemplateHere",
    fallbackLabel: "Quick Rule Template Here",
  },
  move_here: {
    labelKey: "stateEditor.moveHere",
    fallbackLabel: "Move Here",
  },
  rename: {
    labelKey: "stateEditor.rename",
    fallbackLabel: "Rename",
  },
  move: {
    labelKey: "stateEditor.move",
    fallbackLabel: "Move",
  },
  delete: {
    labelKey: "stateEditor.delete",
    fallbackLabel: "Delete",
    danger: true,
  },
  copy_path: {
    labelKey: "stateEditor.copyPath",
    fallbackLabel: "Copy Path",
  },
  add_to_batch: {
    labelKey: "stateEditor.addToBatch",
    fallbackLabel: "Add to Batch",
  },
  remove_from_batch: {
    labelKey: "stateEditor.removeFromBatch",
    fallbackLabel: "Remove from Batch",
  },
};

const FILE_ACTION_ORDER: NodeActionId[] = [
  "rename",
  "move",
  "delete",
  "copy_path",
  "add_to_batch",
  "remove_from_batch",
];

const FOLDER_ACTION_ORDER: NodeActionId[] = [
  "select",
  "new_file_here",
  "new_folder_here",
  "quick_rule_template_here",
  "move_here",
  "rename",
  "move",
  "delete",
  "copy_path",
];

export const buildNodeActions = ({
  nodeType,
  actions,
}: BuildNodeActionsInput): NodeActionItem[] => {
  const order = nodeType === "file" ? FILE_ACTION_ORDER : FOLDER_ACTION_ORDER;
  const result: NodeActionItem[] = [];

  for (const id of order) {
    const config = actions[id];
    if (!config || config.show === false) {
      continue;
    }

    const meta = ACTION_META[id];
    const enabled = config.enabled ?? true;

    result.push({
      id,
      labelKey: meta.labelKey,
      fallbackLabel: meta.fallbackLabel,
      danger: meta.danger,
      disabled: !enabled,
      disabledReason: enabled ? null : config.disabledReason ?? null,
      onSelect: config.onSelect,
    });
  }

  return result;
};
