import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CustomRule, RuleCategory, GameState } from "../types";

// All available rule categories
const RULE_CATEGORIES: RuleCategory[] = [
  "systemCore",
  "worldSetting",
  "protagonist",
  "npcBehavior",
  "combatAction",
  "writingStyle",
  "dialogue",
  "mystery",
  "stateManagement",
  "hiddenTruth",
  "imageStyle",
  "cultural",
  "custom",
];

// Category icons
const CATEGORY_ICONS: Record<RuleCategory, string> = {
  systemCore: "⚙️",
  worldSetting: "🌍",
  protagonist: "👤",
  npcBehavior: "🎭",
  combatAction: "⚔️",
  writingStyle: "✍️",
  dialogue: "💬",
  mystery: "🔮",
  stateManagement: "📊",
  hiddenTruth: "🔒",
  imageStyle: "🎨",
  cultural: "🏛️",
  custom: "📝",
};

interface RulesEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  onShowToast?: (message: string, type: "success" | "error" | "info") => void;
}

export const RulesEditorModal: React.FC<RulesEditorModalProps> = ({
  isOpen,
  onClose,
  gameState,
  setGameState,
  onShowToast,
}) => {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] =
    useState<RuleCategory>("systemCore");
  const [isEditing, setIsEditing] = useState(false);
  const [editingRule, setEditingRule] = useState<CustomRule | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");

  // Get rules from gameState
  const rules = useMemo(
    () => gameState.customRules || [],
    [gameState.customRules]
  );

  // Filter rules by selected category
  const filteredRules = useMemo(() => {
    return rules
      .filter((r) => r.category === selectedCategory)
      .sort((a, b) => a.priority - b.priority);
  }, [rules, selectedCategory]);

  // Count rules per category
  const categoryRuleCounts = useMemo(() => {
    const counts: Record<RuleCategory, number> = {} as Record<
      RuleCategory,
      number
    >;
    RULE_CATEGORIES.forEach((cat) => {
      counts[cat] = rules.filter((r) => r.category === cat).length;
    });
    return counts;
  }, [rules]);

  // Total active rules count
  const totalRulesCount = useMemo(
    () => rules.filter((r) => r.enabled).length,
    [rules]
  );

  // Generate unique ID
  const generateId = () =>
    `rule_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  // Add new rule
  const handleAddRule = () => {
    if (!newTitle.trim() || !newContent.trim()) {
      onShowToast?.(t("rules.fillRequired"), "error");
      return;
    }

    const newRule: CustomRule = {
      id: generateId(),
      category: selectedCategory,
      title: newTitle.trim(),
      content: newContent.trim(),
      enabled: true,
      priority: filteredRules.length,
      createdAt: Date.now(),
    };

    setGameState((prev) => ({
      ...prev,
      customRules: [...(prev.customRules || []), newRule],
    }));

    setNewTitle("");
    setNewContent("");
    setIsEditing(false);
    onShowToast?.(t("rules.added"), "success");
  };

  // Update existing rule
  const handleUpdateRule = () => {
    if (!editingRule || !newTitle.trim() || !newContent.trim()) {
      return;
    }

    setGameState((prev) => ({
      ...prev,
      customRules: (prev.customRules || []).map((r) =>
        r.id === editingRule.id
          ? { ...r, title: newTitle.trim(), content: newContent.trim() }
          : r
      ),
    }));

    setEditingRule(null);
    setNewTitle("");
    setNewContent("");
    setIsEditing(false);
    onShowToast?.(t("rules.updated"), "success");
  };

  // Delete rule
  const handleDeleteRule = (id: string) => {
    setGameState((prev) => ({
      ...prev,
      customRules: (prev.customRules || []).filter((r) => r.id !== id),
    }));
    onShowToast?.(t("rules.deleted"), "info");
  };

  // Toggle rule enabled
  const handleToggleRule = (id: string) => {
    setGameState((prev) => ({
      ...prev,
      customRules: (prev.customRules || []).map((r) =>
        r.id === id ? { ...r, enabled: !r.enabled } : r
      ),
    }));
  };

  // Start editing a rule
  const startEditRule = (rule: CustomRule) => {
    setEditingRule(rule);
    setNewTitle(rule.title);
    setNewContent(rule.content);
    setIsEditing(true);
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingRule(null);
    setNewTitle("");
    setNewContent("");
    setIsEditing(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 md:p-4 animate-fade-in">
      <div className="bg-theme-surface border border-theme-border rounded-xl shadow-2xl w-full max-w-5xl h-[95vh] md:h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-none p-3 md:p-4 border-b border-theme-border flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-lg md:text-xl font-bold text-theme-text truncate">
              {t("rules.title")}
            </h2>
            <p className="text-xs md:text-sm text-theme-muted mt-0.5 hidden sm:block">
              {t("rules.subtitle")}
            </p>
            {/* Mobile: show active rules count */}
            <p className="text-xs text-theme-primary mt-0.5 sm:hidden">
              {t("rules.activeCount", { count: totalRulesCount })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-theme-hover rounded-lg transition-colors text-theme-muted hover:text-theme-text flex-none"
            aria-label={t("close")}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Mobile: Horizontal Category Tabs */}
        <div className="md:hidden flex-none border-b border-theme-border overflow-x-auto scrollbar-hide">
          <div className="flex p-2 gap-2 min-w-max">
            {RULE_CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg whitespace-nowrap transition-colors ${
                  selectedCategory === category
                    ? "bg-theme-primary text-theme-primary-contrast"
                    : "bg-theme-surface-highlight text-theme-text"
                }`}
              >
                <span>{CATEGORY_ICONS[category]}</span>
                <span className="text-sm">{t(`rules.category.${category}`)}</span>
                {categoryRuleCounts[category] > 0 && (
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full ${
                      selectedCategory === category
                        ? "bg-white/20"
                        : "bg-theme-primary/20 text-theme-primary"
                    }`}
                  >
                    {categoryRuleCounts[category]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Desktop: Category Sidebar */}
          <div className="hidden md:block w-48 flex-none border-r border-theme-border overflow-y-auto bg-theme-bg/50">
            {RULE_CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`w-full text-left px-4 py-3 flex items-center gap-2 transition-colors ${
                  selectedCategory === category
                    ? "bg-theme-primary/20 text-theme-primary border-r-2 border-theme-primary"
                    : "text-theme-text hover:bg-theme-hover"
                }`}
              >
                <span>{CATEGORY_ICONS[category]}</span>
                <span className="text-sm flex-1 truncate">
                  {t(`rules.category.${category}`)}
                </span>
                {categoryRuleCounts[category] > 0 && (
                  <span className="text-xs bg-theme-primary/20 text-theme-primary px-1.5 py-0.5 rounded-full">
                    {categoryRuleCounts[category]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Rules Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Category Description - Desktop only */}
            <div className="hidden md:block flex-none p-4 bg-theme-bg/30 border-b border-theme-border">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{CATEGORY_ICONS[selectedCategory]}</span>
                <div>
                  <h3 className="font-medium text-theme-text">
                    {t(`rules.category.${selectedCategory}`)}
                  </h3>
                  <p className="text-xs text-theme-muted">
                    {t(`rules.categoryDesc.${selectedCategory}`)}
                  </p>
                </div>
              </div>
            </div>

            {/* Rules List */}
            <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3">
              {filteredRules.length === 0 && !isEditing ? (
                <div className="text-center py-8 text-theme-muted">
                  <div className="text-4xl mb-3">{CATEGORY_ICONS[selectedCategory]}</div>
                  <p className="text-sm">{t("rules.noRules")}</p>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="mt-4 px-4 py-2 bg-theme-primary text-theme-primary-contrast rounded-lg hover:opacity-90 transition-opacity text-sm"
                  >
                    {t("rules.add")}
                  </button>
                </div>
              ) : (
                <>
                  {filteredRules.map((rule) => (
                    <div
                      key={rule.id}
                      className={`p-3 md:p-4 rounded-lg border transition-all ${
                        rule.enabled
                          ? "bg-theme-bg border-theme-border"
                          : "bg-theme-bg/50 border-theme-border/50 opacity-60"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Toggle */}
                        <button
                          onClick={() => handleToggleRule(rule.id)}
                          className={`mt-0.5 w-10 h-6 rounded-full transition-colors flex-none relative ${
                            rule.enabled ? "bg-theme-primary" : "bg-theme-muted/30"
                          }`}
                          aria-label={t("rules.toggle")}
                        >
                          <div
                            className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                              rule.enabled ? "left-5" : "left-1"
                            }`}
                          />
                        </button>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-theme-text text-sm md:text-base">
                            {rule.title}
                          </h4>
                          <p className="text-xs md:text-sm text-theme-muted mt-1 whitespace-pre-wrap line-clamp-3">
                            {rule.content}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-1 flex-none">
                          <button
                            onClick={() => startEditRule(rule)}
                            className="p-2 hover:bg-theme-hover rounded-lg text-theme-muted hover:text-theme-text transition-colors"
                            title={t("rules.edit")}
                            aria-label={t("rules.edit")}
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            className="p-2 hover:bg-red-500/10 rounded-lg text-theme-muted hover:text-red-500 transition-colors"
                            title={t("rules.delete")}
                            aria-label={t("rules.delete")}
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Add/Edit Form */}
              {isEditing && (
                <div className="p-3 md:p-4 rounded-lg border border-theme-primary bg-theme-primary/5 space-y-3">
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder={t("rules.titlePlaceholder")}
                    className="w-full px-3 py-2.5 bg-theme-bg border border-theme-border rounded-lg text-theme-text placeholder-theme-muted focus:outline-none focus:border-theme-primary text-sm"
                  />
                  <textarea
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder={t("rules.contentPlaceholder")}
                    rows={4}
                    className="w-full px-3 py-2.5 bg-theme-bg border border-theme-border rounded-lg text-theme-text placeholder-theme-muted focus:outline-none focus:border-theme-primary resize-none text-sm"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={cancelEdit}
                      className="px-4 py-2.5 text-theme-muted hover:text-theme-text transition-colors text-sm"
                    >
                      {t("cancel")}
                    </button>
                    <button
                      onClick={editingRule ? handleUpdateRule : handleAddRule}
                      className="px-4 py-2.5 bg-theme-primary text-theme-primary-contrast rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
                    >
                      {editingRule ? t("rules.save") : t("rules.add")}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer - Add button */}
            {!isEditing && filteredRules.length > 0 && (
              <div className="flex-none p-3 md:p-4 border-t border-theme-border">
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full md:w-auto px-4 py-2.5 bg-theme-primary text-theme-primary-contrast rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
                >
                  {t("rules.add")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RulesEditorModal;
