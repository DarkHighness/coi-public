import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildLoopPromptSnapshot,
  formatLoopPromptSnapshotMarkdown,
  type LoopPromptSnapshotViewMode,
} from "../src/services/ai/agentic/debug/loopPromptSnapshot";

type Args = {
  languageCode: string;
  summaryLanguage?: string;
  outputPath?: string;
  viewMode: LoopPromptSnapshotViewMode;
};

const parseArgs = (argv: string[]): Args => {
  const args: Args = {
    languageCode: "en",
    viewMode: "both",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i] ?? "";
    if (token === "--lang" && argv[i + 1]) {
      args.languageCode = argv[i + 1]!;
      i += 1;
      continue;
    }
    if (token === "--summary-lang" && argv[i + 1]) {
      args.summaryLanguage = argv[i + 1]!;
      i += 1;
      continue;
    }
    if (token === "--out" && argv[i + 1]) {
      args.outputPath = argv[i + 1]!;
      i += 1;
      continue;
    }
    if (token === "--view" && argv[i + 1]) {
      const value = argv[i + 1]!;
      if (value === "static" || value === "effective" || value === "both") {
        args.viewMode = value;
        i += 1;
        continue;
      }
      throw new Error(`Invalid --view value: ${value}`);
    }
    if (token === "--help" || token === "-h") {
      console.log(
        [
          "Usage: node --import tsx scripts/print-loop-prompts.ts [options]",
          "",
          "Options:",
          "  --lang <code>          Base language code for turn/outline prompts (default: en)",
          "  --summary-lang <name>  Summary language label override (default derived from --lang)",
          "  --view <mode>          static | effective | both (default: both)",
          "  --out <path>           Write markdown snapshot to file",
          "  --help                 Show this help message",
        ].join("\n"),
      );
      process.exit(0);
    }
  }

  return args;
};

const main = (): void => {
  const args = parseArgs(process.argv.slice(2));

  const snapshot = buildLoopPromptSnapshot({
    languageCode: args.languageCode,
    summaryLanguage: args.summaryLanguage,
    viewMode: args.viewMode,
  });
  const markdown = formatLoopPromptSnapshotMarkdown(snapshot);

  if (args.outputPath) {
    const absolutePath = resolve(process.cwd(), args.outputPath);
    writeFileSync(absolutePath, markdown, "utf8");
    console.log(`Loop prompt snapshot written to: ${absolutePath}`);
    return;
  }

  console.log(markdown);
};

main();
