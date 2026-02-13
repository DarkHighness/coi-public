import fs from "node:fs/promises";
import path from "node:path";

const ROOT_DIRS = ["src", "scripts", "utils"];

const EXCLUDE_DIR_PREFIXES = [
  path.join("src", "locales") + path.sep,
  path.join("src", "services", "prompts") + path.sep,
];

const INCLUDED_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".cjs", ".mjs"]);

const USER_VISIBLE_CALLEES = [
  { kind: "id", name: "showToast" },
  { kind: "id", name: "alert" },
  { kind: "id", name: "confirm" },
  { kind: "id", name: "prompt" },
  { kind: "member", object: "window", name: "alert" },
  { kind: "member", object: "window", name: "confirm" },
  { kind: "member", object: "window", name: "prompt" },
];

const CONSOLE_METHODS = new Set(["log", "warn", "error", "info", "debug"]);

const CJK_RE = /[\u4e00-\u9fff]/;

function isIdentStart(ch) {
  return (
    (ch >= "a" && ch <= "z") ||
    (ch >= "A" && ch <= "Z") ||
    ch === "_" ||
    ch === "$"
  );
}

function isIdentPart(ch) {
  return isIdentStart(ch) || (ch >= "0" && ch <= "9");
}

function hasCjk(text) {
  return CJK_RE.test(text);
}

function rel(p) {
  return p.split(path.sep).join("/");
}

async function listFilesRec(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...(await listFilesRec(full)));
    } else if (e.isFile()) {
      const ext = path.extname(e.name);
      if (INCLUDED_EXTS.has(ext)) out.push(full);
    }
  }
  return out;
}

function isExcluded(relativePath) {
  const norm = relativePath.split(path.sep).join(path.sep);
  return EXCLUDE_DIR_PREFIXES.some((prefix) => norm.startsWith(prefix));
}

function makeLineIndex(text) {
  const lineStartOffsets = [0];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\n") lineStartOffsets.push(i + 1);
  }
  return lineStartOffsets;
}

function offsetToLineCol(lineStartOffsets, offset) {
  // Binary search for last line start <= offset
  let lo = 0;
  let hi = lineStartOffsets.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lineStartOffsets[mid] <= offset) lo = mid + 1;
    else hi = mid - 1;
  }
  const line = Math.max(0, hi);
  const col = offset - lineStartOffsets[line];
  return { line: line + 1, col: col + 1 };
}

function isWs(ch) {
  return ch === " " || ch === "\t" || ch === "\n" || ch === "\r";
}

function skipWsAndComments(text, i) {
  while (i < text.length) {
    const ch = text[i];
    if (isWs(ch)) {
      i++;
      continue;
    }
    if (ch === "/" && text[i + 1] === "/") {
      i += 2;
      while (i < text.length && text[i] !== "\n") i++;
      continue;
    }
    if (ch === "/" && text[i + 1] === "*") {
      i += 2;
      while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    break;
  }
  return i;
}

function readIdentifier(text, i) {
  if (!isIdentStart(text[i])) return null;
  let j = i + 1;
  while (j < text.length && isIdentPart(text[j])) j++;
  return { name: text.slice(i, j), end: j };
}

function readStringLiteral(text, i) {
  const quote = text[i];
  if (quote !== "'" && quote !== '"') return null;
  let j = i + 1;
  let value = "";
  while (j < text.length) {
    const ch = text[j];
    if (ch === "\\") {
      const next = text[j + 1];
      if (next !== undefined) {
        value += next;
        j += 2;
        continue;
      }
      j++;
      continue;
    }
    if (ch === quote) {
      return { value, end: j + 1 };
    }
    value += ch;
    j++;
  }
  return null;
}

function readTemplateLiteral(text, i) {
  if (text[i] !== "`") return null;
  let j = i + 1;
  let raw = "";
  let hasExpr = false;
  while (j < text.length) {
    const ch = text[j];
    if (ch === "\\") {
      const next = text[j + 1];
      if (next !== undefined) {
        raw += next;
        j += 2;
        continue;
      }
      j++;
      continue;
    }
    if (ch === "`") {
      return { raw, end: j + 1, hasExpr };
    }
    if (ch === "$" && text[j + 1] === "{") {
      // template expression
      hasExpr = true;
      j += 2;
      const exprRes = skipJsExpressionInTemplate(text, j);
      j = exprRes.end;
      raw += exprRes.rawPlaceholder;
      continue;
    }
    raw += ch;
    j++;
  }
  return null;
}

function skipJsExpressionInTemplate(text, i) {
  // We are positioned right after "${". Skip until matching "}" accounting for
  // nested braces and strings/comments. Return end at char after "}".
  let depth = 1;
  let j = i;
  while (j < text.length && depth > 0) {
    const ch = text[j];
    if (ch === "'" || ch === '"') {
      const s = readStringLiteral(text, j);
      if (s) {
        j = s.end;
        continue;
      }
    }
    if (ch === "`") {
      const t = readTemplateLiteral(text, j);
      if (t) {
        j = t.end;
        continue;
      }
    }
    if (ch === "/" && text[j + 1] === "/") {
      j += 2;
      while (j < text.length && text[j] !== "\n") j++;
      continue;
    }
    if (ch === "/" && text[j + 1] === "*") {
      j += 2;
      while (j < text.length && !(text[j] === "*" && text[j + 1] === "/")) j++;
      j += 2;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    j++;
  }
  return { end: j, rawPlaceholder: "" };
}

function firstArgStartsWithLiteral(text, callParenIndex) {
  let i = callParenIndex + 1;
  i = skipWsAndComments(text, i);
  const ch = text[i];
  if (ch === "'" || ch === '"') return { kind: "string", start: i };
  if (ch === "`") return { kind: "template", start: i };
  return null;
}

function scanFile(relativePath, text) {
  const lineIndex = makeLineIndex(text);
  const errors = [];
  const warnings = [];

  // State machine for top-level scanning. We only need to avoid matching
  // identifiers inside strings/comments.
  let i = 0;
  while (i < text.length) {
    const ch = text[i];

    // Skip comments
    if (ch === "/" && text[i + 1] === "/") {
      i += 2;
      while (i < text.length && text[i] !== "\n") i++;
      continue;
    }
    if (ch === "/" && text[i + 1] === "*") {
      i += 2;
      while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) i++;
      i += 2;
      continue;
    }

    // Skip strings/templates
    if (ch === "'" || ch === '"') {
      const s = readStringLiteral(text, i);
      if (!s) break;
      i = s.end;
      continue;
    }
    if (ch === "`") {
      const t = readTemplateLiteral(text, i);
      if (!t) break;
      i = t.end;
      continue;
    }

    // Identifiers / patterns
    const id = readIdentifier(text, i);
    if (!id) {
      i++;
      continue;
    }

    // User-visible: showToast/alert/confirm/prompt must not take literal as first arg
    for (const callee of USER_VISIBLE_CALLEES) {
      let match = false;
      let after = i;

      if (callee.kind === "id" && id.name === callee.name) {
        match = true;
        after = id.end;
      } else if (callee.kind === "member" && id.name === callee.object) {
        // window.confirm
        let j = id.end;
        j = skipWsAndComments(text, j);
        if (text[j] !== ".") continue;
        j++;
        j = skipWsAndComments(text, j);
        const member = readIdentifier(text, j);
        if (!member || member.name !== callee.name) continue;
        match = true;
        after = member.end;
      }

      if (!match) continue;

      let j = skipWsAndComments(text, after);
      if (text[j] !== "(") continue;
      const firstArg = firstArgStartsWithLiteral(text, j);
      if (firstArg) {
        if (firstArg.kind === "string") {
          const loc = offsetToLineCol(lineIndex, firstArg.start);
          errors.push({
            rule: "user-visible-i18n",
            file: relativePath,
            line: loc.line,
            col: loc.col,
            message: `${callee.kind === "id" ? callee.name : `${callee.object}.${callee.name}`} must not use a raw string literal; use i18n (t(...))`,
          });
        } else if (firstArg.kind === "template") {
          const lit = readTemplateLiteral(text, firstArg.start);
          if (lit) {
            const templateSource = text.slice(firstArg.start, lit.end);
            const loc = offsetToLineCol(lineIndex, firstArg.start);
            if (!lit.hasExpr) {
              errors.push({
                rule: "user-visible-i18n",
                file: relativePath,
                line: loc.line,
                col: loc.col,
                message: `${callee.kind === "id" ? callee.name : `${callee.object}.${callee.name}`} must not use a raw template literal; use i18n (t(...))`,
              });
            } else if (
              !templateSource.includes("t(") &&
              !templateSource.includes(".t(")
            ) {
              errors.push({
                rule: "user-visible-i18n",
                file: relativePath,
                line: loc.line,
                col: loc.col,
                message: `${callee.kind === "id" ? callee.name : `${callee.object}.${callee.name}`} template literal should include i18n (t(...))`,
              });
            }
          }
        }
      }
    }

    // console.*: string literals must not contain CJK
    if (id.name === "console") {
      let j = skipWsAndComments(text, id.end);
      if (text[j] === ".") {
        j++;
        j = skipWsAndComments(text, j);
        const method = readIdentifier(text, j);
        if (method && CONSOLE_METHODS.has(method.name)) {
          j = skipWsAndComments(text, method.end);
          if (text[j] === "(") {
            const firstArg = firstArgStartsWithLiteral(text, j);
            if (firstArg?.kind === "string") {
              const lit = readStringLiteral(text, firstArg.start);
              if (lit && hasCjk(lit.value)) {
                const loc = offsetToLineCol(lineIndex, firstArg.start);
                errors.push({
                  rule: "internal-english",
                  file: relativePath,
                  line: loc.line,
                  col: loc.col,
                  message: `console.${method.name} message must be English (no CJK characters)`,
                });
              }
            } else if (firstArg?.kind === "template") {
              const lit = readTemplateLiteral(text, firstArg.start);
              if (lit && hasCjk(lit.raw)) {
                const loc = offsetToLineCol(lineIndex, firstArg.start);
                errors.push({
                  rule: "internal-english",
                  file: relativePath,
                  line: loc.line,
                  col: loc.col,
                  message: `console.${method.name} message must be English (no CJK characters)`,
                });
              }
            }
          }
        }
      }
    }

    // throw (new)? Error("...") should not contain CJK
    if (id.name === "throw") {
      let j = skipWsAndComments(text, id.end);
      const maybeNew = readIdentifier(text, j);
      if (maybeNew?.name === "new") {
        j = skipWsAndComments(text, maybeNew.end);
      }
      const errId = readIdentifier(text, j);
      if (errId?.name === "Error") {
        j = skipWsAndComments(text, errId.end);
        if (text[j] === "(") {
          const firstArg = firstArgStartsWithLiteral(text, j);
          if (firstArg?.kind === "string") {
            const lit = readStringLiteral(text, firstArg.start);
            if (lit && hasCjk(lit.value)) {
              const loc = offsetToLineCol(lineIndex, firstArg.start);
              errors.push({
                rule: "internal-english",
                file: relativePath,
                line: loc.line,
                col: loc.col,
                message: `throw Error message must be English (no CJK characters)`,
              });
            }
          } else if (firstArg?.kind === "template") {
            const lit = readTemplateLiteral(text, firstArg.start);
            if (lit && hasCjk(lit.raw)) {
              const loc = offsetToLineCol(lineIndex, firstArg.start);
              errors.push({
                rule: "internal-english",
                file: relativePath,
                line: loc.line,
                col: loc.col,
                message: `throw Error message must be English (no CJK characters)`,
              });
            }
          }
        }
      }
    }

    i = id.end;
  }

  // Heuristic warnings: showToast(x) without t(...) can still be user-visible; flag for review.
  // Keep this as a warning to avoid blocking on dynamic errors.
  const showToastMaybe = /(?:^|[^\w$])showToast\s*\(/g;
  let m;
  while ((m = showToastMaybe.exec(text)) !== null) {
    const start = m.index + m[0].indexOf("showToast");
    const openParen = text.indexOf("(", start);
    if (openParen === -1) continue;
    const firstArg = firstArgStartsWithLiteral(text, openParen);
    if (firstArg) continue; // already handled
    // If the next token isn't "t" and the line contains no "t(", warn.
    const lineLoc = offsetToLineCol(lineIndex, start);
    const lineStart = lineIndex[lineLoc.line - 1];
    const lineEnd = text.indexOf("\n", lineStart);
    const lineText = text.slice(
      lineStart,
      lineEnd === -1 ? text.length : lineEnd,
    );
    if (!lineText.includes("t(")) {
      warnings.push({
        rule: "user-visible-review",
        file: relativePath,
        line: lineLoc.line,
        col: lineLoc.col,
        message:
          "showToast message may be user-visible but not obviously i18n (consider using t(...))",
      });
    }
  }

  return { errors, warnings };
}

async function main() {
  const repoRoot = process.cwd();
  const targets = [];
  for (const d of ROOT_DIRS) {
    const abs = path.join(repoRoot, d);
    try {
      const stat = await fs.stat(abs);
      if (stat.isDirectory()) targets.push(abs);
    } catch {
      // ignore missing
    }
  }

  const files = [];
  for (const t of targets) files.push(...(await listFilesRec(t)));

  let errorCount = 0;
  let warningCount = 0;

  for (const file of files) {
    const relativePath = rel(path.relative(repoRoot, file));
    if (isExcluded(relativePath)) continue;
    const text = await fs.readFile(file, "utf8");
    const { errors, warnings } = scanFile(relativePath, text);
    for (const e of errors) {
      errorCount++;
      // eslint-disable-next-line no-console
      console.error(`${e.file}:${e.line}:${e.col} [${e.rule}] ${e.message}`);
    }
    for (const w of warnings) {
      warningCount++;
      // eslint-disable-next-line no-console
      console.warn(`${w.file}:${w.line}:${w.col} [${w.rule}] ${w.message}`);
    }
  }

  if (warningCount > 0) {
    // eslint-disable-next-line no-console
    console.warn(`Warnings: ${warningCount}`);
  }
  if (errorCount > 0) {
    // eslint-disable-next-line no-console
    console.error(`Errors: ${errorCount}`);
    process.exitCode = 1;
  } else {
    // eslint-disable-next-line no-console
    console.log("i18n lint OK");
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("i18n lint crashed:", err);
  process.exitCode = 2;
});
