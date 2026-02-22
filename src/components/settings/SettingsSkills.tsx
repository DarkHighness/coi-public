import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AISettings, SkillReadPolicy } from "../../types";
import { useSettings } from "../../hooks/useSettings";
import {
  getSkillCatalogOptions,
  isSystemProtectedSkillPath,
  resolveSkillPolicyGateConfig,
  resolveSkillPolicySelection,
} from "../../services/skills/skillPolicies";

type ExtraSettings = NonNullable<AISettings["extra"]>;
type SkillGroup = {
  key: string;
  label: string;
  skills: ReturnType<typeof getSkillCatalogOptions>;
};

const POLICY_ORDER: SkillReadPolicy[] = [
  "default",
  "required",
  "recommended",
  "forbidden",
];

const isSkillReadPolicy = (value: string): value is SkillReadPolicy =>
  (POLICY_ORDER as string[]).includes(value);

export const SettingsSkills: React.FC = () => {
  const { t } = useTranslation();
  const { settings: currentSettings, updateSettings: onUpdateSettings } =
    useSettings();
  const [query, setQuery] = useState("");

  const extra: ExtraSettings = currentSettings.extra || {};
  const catalog = useMemo(() => getSkillCatalogOptions(), []);
  const selectionSummary = useMemo(
    () =>
      resolveSkillPolicyGateConfig({
        settings: currentSettings,
      }),
    [currentSettings],
  );
  const normalizedPolicyMap = useMemo(
    () => resolveSkillPolicySelection(currentSettings),
    [currentSettings],
  );

  const filteredSkills = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return catalog;
    }

    return catalog.filter((skill) => {
      const haystack = [
        skill.title,
        skill.description,
        skill.canonicalPath,
        skill.domain,
        ...skill.tags,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [catalog, query]);

  const groupedSkills = useMemo(() => {
    const sorted = [...filteredSkills].sort((a, b) =>
      a.canonicalPath.localeCompare(b.canonicalPath),
    );
    const grouped = new Map<string, SkillGroup>();

    for (const skill of sorted) {
      const parts = skill.canonicalPath
        .replace(/^skills\//, "")
        .split("/")
        .filter(Boolean);
      const first = parts[0] || "other";
      const second = parts[1] || "_";
      const groupKey = `${first}/${second}`;
      const label = `skills/${groupKey}/`;

      const existing = grouped.get(groupKey);
      if (existing) {
        existing.skills.push(skill);
      } else {
        grouped.set(groupKey, {
          key: groupKey,
          label,
          skills: [skill],
        });
      }
    }

    return Array.from(grouped.values()).sort((a, b) =>
      a.key.localeCompare(b.key),
    );
  }, [filteredSkills]);

  const getPolicyValue = (canonicalPath: string): SkillReadPolicy => {
    if (normalizedPolicyMap.required.includes(canonicalPath)) {
      return "required";
    }
    if (normalizedPolicyMap.recommended.includes(canonicalPath)) {
      return "recommended";
    }
    if (normalizedPolicyMap.forbidden.includes(canonicalPath)) {
      return "forbidden";
    }
    return "default";
  };

  const updatePolicy = (canonicalPath: string, policy: SkillReadPolicy) => {
    const nextPolicies: Record<string, SkillReadPolicy> = {};
    for (const path of normalizedPolicyMap.required) {
      nextPolicies[path] = "required";
    }
    for (const path of normalizedPolicyMap.recommended) {
      nextPolicies[path] = "recommended";
    }
    for (const path of normalizedPolicyMap.forbidden) {
      nextPolicies[path] = "forbidden";
    }

    if (policy === "default") {
      delete nextPolicies[canonicalPath];
    } else if (
      policy === "forbidden" &&
      isSystemProtectedSkillPath(canonicalPath)
    ) {
      delete nextPolicies[canonicalPath];
    } else {
      nextPolicies[canonicalPath] = policy;
    }

    onUpdateSettings({
      ...currentSettings,
      extra: {
        ...extra,
        skillReadPolicies: nextPolicies,
      },
    });
  };

  const resetAllPolicies = () => {
    onUpdateSettings({
      ...currentSettings,
      extra: {
        ...extra,
        skillReadPolicies: {},
      },
    });
  };

  const getPolicyLabel = (policy: SkillReadPolicy): string => {
    switch (policy) {
      case "required":
        return t("settings.skills.policy.required") || "Must Read";
      case "recommended":
        return t("settings.skills.policy.recommended") || "Recommended";
      case "forbidden":
        return t("settings.skills.policy.forbidden") || "Forbidden";
      default:
        return t("settings.skills.policy.default") || "Default";
    }
  };

  return (
    <div className="space-y-5 animate-slide-in">
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-theme-border">
        <div>
          <div className="text-sm font-bold text-theme-primary uppercase tracking-widest">
            SKILLS
          </div>
          <p className="text-[11px] text-theme-muted mt-1">
            {t("settings.skills.description") ||
              "Configure per-skill read policy: Must Read / Recommended / Forbidden / Default."}
          </p>
        </div>
        <button
          onClick={resetAllPolicies}
          className="px-2 py-1 text-[10px] uppercase tracking-widest rounded border border-theme-border text-theme-text-secondary hover:text-theme-text hover:border-theme-primary transition-colors"
        >
          {t("settings.skills.resetAll") || "Reset All"}
        </button>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={
            t("settings.skills.searchPlaceholder") ||
            "Search skill by name/path/tag..."
          }
          className="w-full p-2 text-xs bg-theme-surface border border-theme-border rounded focus:outline-none focus:ring-1 focus:ring-theme-primary text-theme-text"
        />
      </div>

      <div className="grid grid-cols-3 gap-2 text-[10px]">
        <div className="p-2 rounded border border-theme-border/40 bg-theme-surface/50">
          <div className="uppercase tracking-widest text-theme-muted">
            {t("settings.skills.summary.required") || "Must Read"}
          </div>
          <div className="mt-1 text-theme-text font-bold">
            {selectionSummary.required.length}
          </div>
        </div>
        <div className="p-2 rounded border border-theme-border/40 bg-theme-surface/50">
          <div className="uppercase tracking-widest text-theme-muted">
            {t("settings.skills.summary.recommended") || "Recommended"}
          </div>
          <div className="mt-1 text-theme-text font-bold">
            {selectionSummary.recommended.length}
          </div>
        </div>
        <div className="p-2 rounded border border-theme-border/40 bg-theme-surface/50">
          <div className="uppercase tracking-widest text-theme-muted">
            {t("settings.skills.summary.forbidden") || "Forbidden"}
          </div>
          <div className="mt-1 text-theme-text font-bold">
            {selectionSummary.forbidden.length}
          </div>
        </div>
      </div>

      <div className="border border-theme-border/40 rounded-lg overflow-hidden">
        <div className="max-h-[52dvh] overflow-y-auto custom-scrollbar">
          {filteredSkills.length === 0 ? (
            <div className="p-4 text-xs text-theme-muted">
              {t("settings.skills.empty") || "No skills match current filter."}
            </div>
          ) : (
            groupedSkills.map((group) => (
              <div
                key={group.key}
                className="border-b last:border-b-0 border-theme-border/20"
              >
                <div className="px-3 py-2 bg-theme-surface/40 border-b border-theme-border/20">
                  <div className="text-[10px] font-mono text-theme-muted break-all">
                    {group.label}
                  </div>
                  <div className="text-[10px] text-theme-text-secondary mt-0.5">
                    {group.skills.length} skill
                    {group.skills.length > 1 ? "s" : ""}
                  </div>
                </div>

                {group.skills.map((skill) => {
                  const policy = getPolicyValue(skill.canonicalPath);
                  const isSystemProtected = isSystemProtectedSkillPath(
                    skill.canonicalPath,
                  );

                  return (
                    <div
                      key={skill.canonicalPath}
                      className="p-3 border-b last:border-b-0 border-theme-border/20"
                    >
                      <div className="grid grid-cols-[minmax(0,1fr)_10rem] gap-3 items-start">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="text-xs font-bold text-theme-text">
                              {skill.title}
                            </div>
                            <span className="px-1.5 py-0.5 rounded border border-theme-border/30 text-[9px] uppercase tracking-wider text-theme-muted">
                              {skill.domain}
                            </span>
                            {isSystemProtected ? (
                              <span className="px-1.5 py-0.5 rounded border border-amber-500/40 text-[9px] uppercase tracking-wider text-amber-500">
                                {t("settings.skills.systemProtected") ||
                                  "System Protected"}
                              </span>
                            ) : null}
                          </div>
                          <div className="text-[10px] font-mono text-theme-muted mt-1 break-all">
                            {skill.canonicalPath}
                          </div>
                          {skill.description ? (
                            <div className="text-[10px] text-theme-text-secondary mt-1 leading-relaxed">
                              {skill.description}
                            </div>
                          ) : null}
                        </div>

                        <div className="w-40 min-w-40 max-w-40 justify-self-end">
                          <select
                            value={policy}
                            onChange={(event) => {
                              const nextValue = event.target.value;
                              if (!isSkillReadPolicy(nextValue)) return;
                              updatePolicy(skill.canonicalPath, nextValue);
                            }}
                            className="w-full p-1.5 text-xs bg-theme-surface border border-theme-border rounded focus:outline-none focus:ring-1 focus:ring-theme-primary text-theme-text"
                          >
                            {POLICY_ORDER.map((optionValue) => (
                              <option
                                key={optionValue}
                                value={optionValue}
                                disabled={
                                  optionValue === "forbidden" &&
                                  isSystemProtected
                                }
                              >
                                {getPolicyLabel(optionValue)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsSkills;
