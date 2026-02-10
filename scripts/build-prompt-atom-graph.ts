import fs from "node:fs";
import path from "node:path";
import * as ts from "typescript";
import type {
  PromptAtomGraph,
  PromptAtomGraphNode,
  PromptEntryGraphNode,
} from "../src/services/prompts/trace/types";

type ImportBinding =
  | {
      kind: "named";
      importedName: string;
      targetFile: string;
    }
  | {
      kind: "namespace";
      targetFile: string;
    };

type AtomExportRecord = {
  exportName: string;
  atomId: string;
  callbackNode?: ts.Node;
};

type FileInfo = {
  source: ts.SourceFile;
  atomExports: AtomExportRecord[];
  namedReExports: Array<{
    exportName: string;
    targetFile: string;
    targetExportName: string;
  }>;
  wildcardReExports: string[];
  defaultAlias?: string;
};

const PROJECT_ROOT = process.cwd();
const SRC_ROOT = path.join(PROJECT_ROOT, "src");
const PROMPTS_ROOT = path.join(SRC_ROOT, "services", "prompts");
const ATOMS_ROOT = path.join(PROMPTS_ROOT, "atoms");
const SERVICES_ROOT = path.join(SRC_ROOT, "services");
const OUTPUT_PATH = path.join(
  PROMPTS_ROOT,
  "trace",
  "generated",
  "prompt-atom-graph.json",
);

function toPosixRelative(filePath: string): string {
  return path.relative(PROJECT_ROOT, filePath).split(path.sep).join("/");
}

function readAllTsFiles(dir: string): string[] {
  const out: string[] = [];
  if (!fs.existsSync(dir)) return out;
  const stack = [dir];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    const entries = fs.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const abs = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(abs);
        continue;
      }
      if (entry.isFile() && abs.endsWith(".ts") && !abs.endsWith(".d.ts")) {
        out.push(abs);
      }
    }
  }

  return out.sort((a, b) => a.localeCompare(b));
}

function hasExportModifier(node: ts.Node): boolean {
  return Boolean(
    ts
      .getModifiers(node as ts.HasModifiers)
      ?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword),
  );
}

function resolveImportTarget(fromFile: string, specifier: string): string | null {
  const candidates: string[] = [];

  if (specifier.startsWith("@/")) {
    const base = path.join(SRC_ROOT, specifier.slice(2));
    candidates.push(`${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"));
  } else if (specifier.startsWith(".")) {
    const base = path.resolve(path.dirname(fromFile), specifier);
    candidates.push(`${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"));
  } else {
    return null;
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return path.resolve(candidate);
    }
  }

  return null;
}

function collectImportBindings(source: ts.SourceFile): Map<string, ImportBinding> {
  const bindings = new Map<string, ImportBinding>();

  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const moduleText = statement.moduleSpecifier.text;
    const targetFile = resolveImportTarget(source.fileName, moduleText);
    if (!targetFile) continue;

    const clause = statement.importClause;
    if (!clause) continue;

    if (clause.name) {
      bindings.set(clause.name.text, {
        kind: "named",
        importedName: "default",
        targetFile,
      });
    }

    if (!clause.namedBindings) continue;

    if (ts.isNamespaceImport(clause.namedBindings)) {
      bindings.set(clause.namedBindings.name.text, {
        kind: "namespace",
        targetFile,
      });
      continue;
    }

    for (const element of clause.namedBindings.elements) {
      const importedName = element.propertyName
        ? element.propertyName.text
        : element.name.text;
      bindings.set(element.name.text, {
        kind: "named",
        importedName,
        targetFile,
      });
    }
  }

  return bindings;
}

function isDefineAtomCall(node: ts.CallExpression): boolean {
  if (!ts.isIdentifier(node.expression)) return false;
  return (
    node.expression.text === "defineAtom" ||
    node.expression.text === "defineSkillAtom"
  );
}

function getObjectLiteralStringProp(
  node: ts.ObjectLiteralExpression,
  key: string,
): string | undefined {
  for (const property of node.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const name = property.name;
    const propName = ts.isIdentifier(name)
      ? name.text
      : ts.isStringLiteral(name)
        ? name.text
        : undefined;
    if (propName !== key) continue;
    if (ts.isStringLiteral(property.initializer)) {
      return property.initializer.text;
    }
  }
  return undefined;
}

function parseAtomDeclarations(
  source: ts.SourceFile,
  options: { exportedOnly: boolean },
): AtomExportRecord[] {
  const records: AtomExportRecord[] = [];

  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) {
      continue;
    }
    if (options.exportedOnly && !hasExportModifier(statement)) {
      continue;
    }

    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) continue;
      if (!declaration.initializer || !ts.isCallExpression(declaration.initializer)) {
        continue;
      }

      const call = declaration.initializer;
      if (!isDefineAtomCall(call)) continue;
      if (call.arguments.length < 1) continue;

      const metaArg = call.arguments[0];
      if (!ts.isObjectLiteralExpression(metaArg)) continue;

      const atomId = getObjectLiteralStringProp(metaArg, "atomId");
      if (!atomId) continue;

      const callbackNode = call.arguments.length > 1 ? call.arguments[1] : undefined;
      records.push({
        exportName: declaration.name.text,
        atomId,
        callbackNode,
      });
    }
  }

  return records;
}

function parseAtomExports(source: ts.SourceFile): AtomExportRecord[] {
  return parseAtomDeclarations(source, { exportedOnly: true });
}

function parseReExports(source: ts.SourceFile): {
  namedReExports: FileInfo["namedReExports"];
  wildcardReExports: string[];
} {
  const namedReExports: FileInfo["namedReExports"] = [];
  const wildcardReExports: string[] = [];

  for (const statement of source.statements) {
    if (!ts.isExportDeclaration(statement)) continue;
    if (!statement.moduleSpecifier) continue;
    if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const targetFile = resolveImportTarget(
      source.fileName,
      statement.moduleSpecifier.text,
    );
    if (!targetFile) continue;

    if (!statement.exportClause) {
      wildcardReExports.push(targetFile);
      continue;
    }

    if (ts.isNamedExports(statement.exportClause)) {
      for (const element of statement.exportClause.elements) {
        const exportName = element.name.text;
        const targetExportName = element.propertyName
          ? element.propertyName.text
          : element.name.text;
        namedReExports.push({
          exportName,
          targetFile,
          targetExportName,
        });
      }
    }
  }

  return { namedReExports, wildcardReExports };
}

function loadAtomsFileInfo(): Map<string, FileInfo> {
  const infoMap = new Map<string, FileInfo>();
  const files = readAllTsFiles(ATOMS_ROOT);

  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    const source = ts.createSourceFile(
      file,
      content,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );

    const atomExports = parseAtomExports(source);
    const { namedReExports, wildcardReExports } = parseReExports(source);

    let defaultAlias: string | undefined;
    for (const statement of source.statements) {
      if (!ts.isExportAssignment(statement)) continue;
      if (statement.isExportEquals) continue;
      if (ts.isIdentifier(statement.expression)) {
        defaultAlias = statement.expression.text;
      }
    }

    infoMap.set(path.resolve(file), {
      source,
      atomExports,
      namedReExports,
      wildcardReExports,
      defaultAlias,
    });
  }

  return infoMap;
}

function buildDirectAtomExportLookup(fileInfoMap: Map<string, FileInfo>): Map<string, string> {
  const lookup = new Map<string, string>();

  for (const [file, info] of fileInfoMap) {
    for (const atomExport of info.atomExports) {
      lookup.set(`${file}::${atomExport.exportName}`, atomExport.atomId);
    }
  }

  for (const [file, info] of fileInfoMap) {
    if (!info.defaultAlias) continue;
    const atomId = lookup.get(`${file}::${info.defaultAlias}`);
    if (atomId) {
      lookup.set(`${file}::default`, atomId);
    }
  }

  return lookup;
}

function resolveExportToAtomId(
  fileInfoMap: Map<string, FileInfo>,
  directLookup: Map<string, string>,
  file: string,
  exportName: string,
  visited: Set<string> = new Set(),
): string | undefined {
  const key = `${file}::${exportName}`;
  if (visited.has(key)) return undefined;
  visited.add(key);

  const direct = directLookup.get(key);
  if (direct) return direct;

  const info = fileInfoMap.get(file);
  if (!info) return undefined;

  for (const reExport of info.namedReExports) {
    if (reExport.exportName !== exportName) continue;
    const resolved = resolveExportToAtomId(
      fileInfoMap,
      directLookup,
      reExport.targetFile,
      reExport.targetExportName,
      visited,
    );
    if (resolved) return resolved;
  }

  for (const targetFile of info.wildcardReExports) {
    const resolved = resolveExportToAtomId(
      fileInfoMap,
      directLookup,
      targetFile,
      exportName,
      visited,
    );
    if (resolved) return resolved;
  }

  return undefined;
}

function collectCalledAtomIds(
  rootNode: ts.Node,
  imports: Map<string, ImportBinding>,
  localAtomIds: Map<string, string>,
  resolveImportedAtomId: (binding: ImportBinding, propertyName?: string) =>
    | string
    | undefined,
): string[] {
  const deps = new Set<string>();

  const resolveExpressionAtomId = (
    expression: ts.Expression | undefined,
  ): string | undefined => {
    if (!expression) return undefined;

    if (ts.isIdentifier(expression)) {
      const localAtomId = localAtomIds.get(expression.text);
      if (localAtomId) {
        return localAtomId;
      }

      const binding = imports.get(expression.text);
      if (binding && binding.kind === "named") {
        return resolveImportedAtomId(binding);
      }

      return undefined;
    }

    if (ts.isPropertyAccessExpression(expression)) {
      if (ts.isIdentifier(expression.expression)) {
        const nsBinding = imports.get(expression.expression.text);
        if (nsBinding && nsBinding.kind === "namespace") {
          return resolveImportedAtomId(nsBinding, expression.name.text);
        }
      }
    }

    return undefined;
  };

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const directAtomId = resolveExpressionAtomId(node.expression);
      if (directAtomId) {
        deps.add(directAtomId);
      }

      if (
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === "record" &&
        ts.isIdentifier(node.expression.expression) &&
        node.expression.expression.text === "trace"
      ) {
        const firstArg = node.arguments[0];
        const targetExpr =
          firstArg && ts.isObjectLiteralExpression(firstArg)
            ? node.arguments[1]
            : firstArg;
        const recordedAtomId = resolveExpressionAtomId(
          targetExpr as ts.Expression | undefined,
        );
        if (recordedAtomId) {
          deps.add(recordedAtomId);
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(rootNode);
  return [...deps].sort((a, b) => a.localeCompare(b));
}


function buildAtomNodes(
  fileInfoMap: Map<string, FileInfo>,
  directLookup: Map<string, string>,
): PromptAtomGraphNode[] {
  const nodes: PromptAtomGraphNode[] = [];

  for (const [file, info] of [...fileInfoMap.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    const imports = collectImportBindings(info.source);
    const localAtomMap = new Map<string, string>(
      info.atomExports.map((item) => [item.exportName, item.atomId]),
    );

    const resolveImportedAtomId = (
      binding: ImportBinding,
      propertyName?: string,
    ): string | undefined => {
      if (binding.kind === "named") {
        return resolveExportToAtomId(
          fileInfoMap,
          directLookup,
          binding.targetFile,
          binding.importedName,
        );
      }

      if (binding.kind === "namespace" && propertyName) {
        return resolveExportToAtomId(
          fileInfoMap,
          directLookup,
          binding.targetFile,
          propertyName,
        );
      }

      return undefined;
    };

    for (const atomExport of info.atomExports) {
      const callbackRoot = atomExport.callbackNode ?? info.source;
      const deps = collectCalledAtomIds(
        callbackRoot,
        imports,
        localAtomMap,
        resolveImportedAtomId,
      ).filter((dep) => dep !== atomExport.atomId);

      nodes.push({
        atomId: atomExport.atomId,
        filePath: toPosixRelative(file),
        exportName: atomExport.exportName,
        directDependencies: deps,
      });
    }
  }

  return nodes.sort((a, b) => a.atomId.localeCompare(b.atomId));
}

function collectTransitiveAtoms(
  rootAtomIds: string[],
  directDepMap: Map<string, string[]>,
): string[] {
  const visited = new Set<string>();
  const stack = [...rootAtomIds];

  while (stack.length > 0) {
    const atomId = stack.pop();
    if (!atomId || visited.has(atomId)) continue;
    visited.add(atomId);

    const deps = directDepMap.get(atomId) || [];
    for (const dep of deps) {
      if (!visited.has(dep)) {
        stack.push(dep);
      }
    }
  }

  return [...visited].sort((a, b) => a.localeCompare(b));
}

function findContainingExportName(node: ts.Node): string {
  let current: ts.Node | undefined = node;

  while (current) {
    if (ts.isFunctionDeclaration(current) && current.name) {
      return current.name.text;
    }

    if (
      ts.isArrowFunction(current) ||
      ts.isFunctionExpression(current) ||
      ts.isFunctionDeclaration(current)
    ) {
      const maybeVar = current.parent;
      if (
        maybeVar &&
        ts.isVariableDeclaration(maybeVar) &&
        ts.isIdentifier(maybeVar.name)
      ) {
        return maybeVar.name.text;
      }
    }

    current = current.parent;
  }

  return "anonymous";
}

function buildPromptEntries(
  fileInfoMap: Map<string, FileInfo>,
  directLookup: Map<string, string>,
  atomNodes: PromptAtomGraphNode[],
): PromptEntryGraphNode[] {
  const entries: PromptEntryGraphNode[] = [];
  const allServiceFiles = readAllTsFiles(SERVICES_ROOT);
  const directDepMap = new Map(
    atomNodes.map((node) => [node.atomId, node.directDependencies]),
  );

  for (const file of allServiceFiles) {
    const content = fs.readFileSync(file, "utf8");
    if (!content.includes("runPromptWithTrace(")) continue;

    const source = ts.createSourceFile(
      file,
      content,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );

    const imports = collectImportBindings(source);
    const localAtomRecords = parseAtomDeclarations(source, { exportedOnly: false });
    const localAtomMap = new Map<string, string>(
      localAtomRecords.map((item) => [item.exportName, item.atomId]),
    );

    const resolveImportedAtomId = (
      binding: ImportBinding,
      propertyName?: string,
    ): string | undefined => {
      if (binding.kind === "named") {
        return resolveExportToAtomId(
          fileInfoMap,
          directLookup,
          binding.targetFile,
          binding.importedName,
        );
      }

      if (binding.kind === "namespace" && propertyName) {
        return resolveExportToAtomId(
          fileInfoMap,
          directLookup,
          binding.targetFile,
          propertyName,
        );
      }

      return undefined;
    };

    const localDirectDepMap = new Map<string, string[]>();
    for (const localAtom of localAtomRecords) {
      if (!localAtom.callbackNode) continue;
      const deps = collectCalledAtomIds(
        localAtom.callbackNode,
        imports,
        localAtomMap,
        resolveImportedAtomId,
      ).filter((atomId) => atomId !== localAtom.atomId);
      localDirectDepMap.set(localAtom.atomId, deps);
    }

    const directDepMapWithLocal = new Map<string, string[]>(directDepMap);
    for (const [atomId, deps] of localDirectDepMap.entries()) {
      directDepMapWithLocal.set(atomId, deps);
    }

    const visit = (node: ts.Node): void => {
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === "runPromptWithTrace" &&
        node.arguments.length >= 2 &&
        ts.isStringLiteral(node.arguments[0])
      ) {
        const promptId = node.arguments[0].text;
        const callback = node.arguments[1];

        if (
          !ts.isArrowFunction(callback) &&
          !ts.isFunctionExpression(callback)
        ) {
          return;
        }

        const directAtoms = collectCalledAtomIds(
          callback.body,
          imports,
          localAtomMap,
          resolveImportedAtomId,
        );

        const transitiveAtoms = collectTransitiveAtoms(
          directAtoms,
          directDepMapWithLocal,
        );

        entries.push({
          promptId,
          filePath: toPosixRelative(file),
          exportName: findContainingExportName(node),
          directAtoms,
          transitiveAtoms,
        });
      }

      ts.forEachChild(node, visit);
    };

    visit(source);
  }

  const deduped = new Map<string, PromptEntryGraphNode>();
  for (const entry of entries) {
    deduped.set(entry.promptId, entry);
  }

  return [...deduped.values()].sort((a, b) =>
    a.promptId.localeCompare(b.promptId),
  );
}

function buildGraph(): PromptAtomGraph {
  const fileInfoMap = loadAtomsFileInfo();
  const directLookup = buildDirectAtomExportLookup(fileInfoMap);
  const atomNodes = buildAtomNodes(fileInfoMap, directLookup);
  const promptEntries = buildPromptEntries(fileInfoMap, directLookup, atomNodes);

  return {
    generatedAt: new Date().toISOString(),
    atomNodes,
    promptEntries,
  };
}

function stripGeneratedAt(graph: PromptAtomGraph): Omit<PromptAtomGraph, "generatedAt"> {
  const { generatedAt, ...rest } = graph;
  void generatedAt;
  return rest;
}

function main(): void {
  const args = new Set(process.argv.slice(2));
  const checkOnly = args.has("--check");

  const graph = buildGraph();
  const payload = `${JSON.stringify(graph, null, 2)}\n`;

  if (checkOnly) {
    if (!fs.existsSync(OUTPUT_PATH)) {
      console.error(
        `[prompt-atom-graph] Missing generated graph at ${toPosixRelative(OUTPUT_PATH)}. Run build first.`,
      );
      process.exit(1);
    }

    const existingRaw = fs.readFileSync(OUTPUT_PATH, "utf8");
    const existing = JSON.parse(existingRaw) as PromptAtomGraph;

    if (
      JSON.stringify(stripGeneratedAt(existing)) !==
      JSON.stringify(stripGeneratedAt(graph))
    ) {
      console.error(
        `[prompt-atom-graph] Graph is outdated. Run: pnpm prompts:deps:build`,
      );
      process.exit(1);
    }

    console.log("[prompt-atom-graph] Graph is up to date.");
    return;
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, payload, "utf8");
  console.log(
    `[prompt-atom-graph] Wrote ${toPosixRelative(OUTPUT_PATH)} with ${graph.atomNodes.length} atoms and ${graph.promptEntries.length} prompt entries.`,
  );
}

main();
