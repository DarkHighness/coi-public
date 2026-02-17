import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

type Rule =
  | "any-disallowed"
  | "double-assertion-unknown-disallowed"
  | "unknown-outside-boundary";

interface Violation {
  file: string;
  line: number;
  column: number;
  rule: Rule;
  snippet: string;
}

const ROOT = process.cwd();
const SRC_ROOT = path.resolve(ROOT, "src");

const EXCLUDED_FILE_PATTERNS: RegExp[] = [
  /\.test\.(ts|tsx)$/,
  /\.spec\.(ts|tsx)$/,
  /\.d\.ts$/,
  /\/__tests__\//,
];

// Boundary policy:
// - unknown is allowed in service/runtime/hook boundaries.
// - For non-boundary usage, explicit guard paths must be listed here.
const UNKNOWN_ALLOWED_PREFIXES = [
  "src/services/",
  "src/runtime/",
  "src/hooks/",
] as const;

const UNKNOWN_ALLOWED_FILES = new Set<string>([
  "src/types.ts",
  "src/components/ActionPanel.tsx",
  "src/components/TimelineExport.tsx",
  "src/components/common/ToolCallCarousel.tsx",
  "src/components/gameViewer/NPCsTab.tsx",
  "src/components/render/MarkdownText.tsx",
  "src/components/sidebar/CharacterPanel.tsx",
  "src/components/sidebar/WorldInfoPanel.tsx",
  "src/components/sidebar/log/ToolCallItem.tsx",
  "src/components/stateEditorUtils.ts",
  "src/components/themes/ThemeCard.tsx",
  "src/components/themes/ThemePreviewModal.tsx",
  "src/components/themes/themeSort.ts",
  "src/components/themes/useThemePreferences.ts",
  "src/components/vfsExplorer/fileOps.ts",
  "src/contexts/SettingsContext.tsx",
  "src/contexts/ToastContext.tsx",
  "src/utils/entityDisplay.ts",
  "src/utils/indexedDB.ts",
  "src/utils/markdownComponents.tsx",
]);

function toPosix(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

function isExcluded(filePath: string): boolean {
  return EXCLUDED_FILE_PATTERNS.some((pattern) => pattern.test(filePath));
}

function collectSourceFiles(dir: string): string[] {
  const files: string[] = [];
  const walk = (currentDir: string): void => {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(entry.name)) {
        continue;
      }
      const relative = toPosix(path.relative(ROOT, fullPath));
      if (isExcluded(relative)) {
        continue;
      }
      files.push(fullPath);
    }
  };
  walk(dir);
  return files.sort();
}

function getLineText(sourceText: string, line: number): string {
  const lines = sourceText.split(/\r?\n/);
  return (lines[line - 1] || "").trim();
}

function isUnknownInCatchType(node: ts.Node): boolean {
  if (!node.parent || !ts.isParameter(node.parent)) {
    return false;
  }
  const parameter = node.parent;
  return parameter.type === node && ts.isCatchClause(parameter.parent);
}

function isUnknownAllowedForFile(relativePath: string): boolean {
  if (UNKNOWN_ALLOWED_FILES.has(relativePath)) {
    return true;
  }
  return UNKNOWN_ALLOWED_PREFIXES.some((prefix) => relativePath.startsWith(prefix));
}

function unwrapParentheses(expression: ts.Expression): ts.Expression {
  let current = expression;
  while (ts.isParenthesizedExpression(current)) {
    current = current.expression;
  }
  return current;
}

function isUnknownAssertionExpression(expression: ts.Expression): boolean {
  const unwrapped = unwrapParentheses(expression);
  return (
    (ts.isAsExpression(unwrapped) &&
      unwrapped.type.kind === ts.SyntaxKind.UnknownKeyword) ||
    (ts.isTypeAssertionExpression(unwrapped) &&
      unwrapped.type.kind === ts.SyntaxKind.UnknownKeyword)
  );
}

function makeViolation(
  sourceFile: ts.SourceFile,
  sourceText: string,
  node: ts.Node,
  rule: Rule,
): Violation {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(
    node.getStart(sourceFile),
  );
  return {
    file: toPosix(path.relative(ROOT, sourceFile.fileName)),
    line: line + 1,
    column: character + 1,
    rule,
    snippet: getLineText(sourceText, line + 1),
  };
}

function collectViolationsInFile(filePath: string): Violation[] {
  const sourceText = fs.readFileSync(filePath, "utf8");
  const scriptKind = filePath.endsWith(".tsx")
    ? ts.ScriptKind.TSX
    : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  );
  const relativePath = toPosix(path.relative(ROOT, filePath));
  const unknownAllowedInFile = isUnknownAllowedForFile(relativePath);
  const violations: Violation[] = [];

  const visit = (node: ts.Node): void => {
    if (node.kind === ts.SyntaxKind.AnyKeyword) {
      violations.push(
        makeViolation(sourceFile, sourceText, node, "any-disallowed"),
      );
    }

    if (node.kind === ts.SyntaxKind.UnknownKeyword) {
      const allowed = unknownAllowedInFile || isUnknownInCatchType(node);
      if (!allowed) {
        violations.push(
          makeViolation(
            sourceFile,
            sourceText,
            node,
            "unknown-outside-boundary",
          ),
        );
      }
    }

    if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) {
      if (isUnknownAssertionExpression(node.expression)) {
        violations.push(
          makeViolation(
            sourceFile,
            sourceText,
            node,
            "double-assertion-unknown-disallowed",
          ),
        );
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return violations;
}

function printViolations(violations: Violation[]): void {
  const byRule = new Map<Rule, number>();
  for (const violation of violations) {
    byRule.set(violation.rule, (byRule.get(violation.rule) || 0) + 1);
  }

  console.error("[type-escapes] Violations found:");
  for (const [rule, count] of byRule.entries()) {
    console.error(`  - ${rule}: ${count}`);
  }
  console.error("");

  for (const violation of violations) {
    console.error(
      `${violation.file}:${violation.line}:${violation.column} [${violation.rule}] ${violation.snippet}`,
    );
  }
}

function main(): void {
  if (!fs.existsSync(SRC_ROOT)) {
    console.error("[type-escapes] src/ directory not found.");
    process.exit(1);
  }

  const files = collectSourceFiles(SRC_ROOT);
  const violations = files.flatMap((file) => collectViolationsInFile(file));

  if (violations.length > 0) {
    printViolations(violations);
    process.exit(1);
  }

  console.log(
    `[type-escapes] OK (${files.length} files scanned, any=0, no double unknown assertions, unknown within boundary policy)`,
  );
}

main();
