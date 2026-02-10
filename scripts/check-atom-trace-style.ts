import fs from "node:fs";
import path from "node:path";
import * as ts from "typescript";

type GraphAtomNode = {
  atomId: string;
  filePath: string;
  exportName: string;
  directDependencies: string[];
};

type GraphShape = {
  atomNodes: GraphAtomNode[];
};

const ROOT = process.cwd();
const ATOMS_ROOT = path.join(ROOT, "src/services/prompts/atoms");
const GRAPH_PATH = path.join(
  ROOT,
  "src/services/prompts/trace/generated/prompt-atom-graph.json",
);

function toRel(file: string): string {
  return path.relative(ROOT, file).split(path.sep).join("/");
}

function readGraph(): GraphShape {
  if (!fs.existsSync(GRAPH_PATH)) {
    throw new Error(
      `Missing graph at ${toRel(GRAPH_PATH)}. Run pnpm prompts:deps:build first.`,
    );
  }

  return JSON.parse(fs.readFileSync(GRAPH_PATH, "utf8")) as GraphShape;
}

function listTsFiles(dir: string): string[] {
  const out: string[] = [];
  const stack = [dir];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "__tests__") continue;
        stack.push(absolute);
        continue;
      }

      if (
        entry.isFile() &&
        absolute.endsWith(".ts") &&
        !absolute.endsWith(".d.ts")
      ) {
        out.push(absolute);
      }
    }
  }

  return out;
}

function isDefineCall(node: ts.CallExpression): boolean {
  return (
    ts.isIdentifier(node.expression) &&
    (node.expression.text === "defineAtom" ||
      node.expression.text === "defineSkillAtom")
  );
}

function isTraceRecordCall(node: ts.CallExpression): boolean {
  return (
    ts.isPropertyAccessExpression(node.expression) &&
    ts.isIdentifier(node.expression.expression) &&
    node.expression.expression.text === "trace" &&
    node.expression.name.text === "record"
  );
}

function main(): void {
  const graph = readGraph();
  const atomExportNames = new Set(graph.atomNodes.map((item) => item.exportName));

  const directDepsByFileExport = new Map<string, Map<string, Set<string>>>();
  for (const node of graph.atomNodes) {
    const depExports = new Set(
      (node.directDependencies || [])
        .map((atomId) => atomId.split("#")[1])
        .filter(Boolean),
    );

    const absFile = path.join(ROOT, node.filePath);
    const map = directDepsByFileExport.get(absFile) || new Map();
    map.set(node.exportName, depExports);
    directDepsByFileExport.set(absFile, map);
  }

  const files = listTsFiles(ATOMS_ROOT);
  const errors: string[] = [];

  for (const file of files) {
    const sourceText = fs.readFileSync(file, "utf8");
    const source = ts.createSourceFile(
      file,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );

    const exportDepMap = directDepsByFileExport.get(file) || new Map();

    const parentStack: ts.Node[] = [];

    const visitGlobal = (node: ts.Node): void => {
      parentStack.push(node);

      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        if (atomExportNames.has(node.expression.text)) {
          const inDefineCallback = parentStack.some(
            (parent) => ts.isCallExpression(parent) && isDefineCall(parent),
          );
          if (!inDefineCallback) {
            const { line, character } = source.getLineAndCharacterOfPosition(
              node.getStart(source),
            );
            errors.push(
              `${toRel(file)}:${line + 1}:${character + 1} non-atom function calls atom ${node.expression.text}. Wrap composition in defineAtom/defineSkillAtom + trace.record.`,
            );
          }
        }
      }

      ts.forEachChild(node, visitGlobal);
      parentStack.pop();
    };

    visitGlobal(source);

    for (const statement of source.statements) {
      if (!ts.isVariableStatement(statement)) continue;

      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name)) continue;
        const exportName = declaration.name.text;
        const expectedDeps = exportDepMap.get(exportName);
        if (!expectedDeps || expectedDeps.size === 0) continue;

        if (!declaration.initializer || !ts.isCallExpression(declaration.initializer)) {
          continue;
        }

        const initCall = declaration.initializer;
        if (!isDefineCall(initCall)) continue;

        const callback = initCall.arguments[1];
        if (!callback) continue;
        if (!ts.isArrowFunction(callback) && !ts.isFunctionExpression(callback)) {
          continue;
        }

        const visitCallback = (node: ts.Node): void => {
          if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
            if (expectedDeps.has(node.expression.text)) {
              const parent = node.parent;
              const wrappedByRecord =
                ts.isCallExpression(parent) &&
                isTraceRecordCall(parent) &&
                parent.arguments.includes(node);

              if (!wrappedByRecord) {
                const { line, character } = source.getLineAndCharacterOfPosition(
                  node.getStart(source),
                );
                errors.push(
                  `${toRel(file)}:${line + 1}:${character + 1} dependency ${node.expression.text} in ${exportName} must use trace.record(...).`,
                );
              }
            }
          }

          ts.forEachChild(node, visitCallback);
        };

        visitCallback(callback.body);
      }
    }
  }

  if (errors.length > 0) {
    console.error("[atom-trace-style] Violations found:\n");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log("[atom-trace-style] OK");
}

main();
