import { execSync } from "node:child_process";
import { chmodSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = process.cwd();
const gitDir = resolve(repoRoot, ".git");

if (!existsSync(gitDir)) {
  console.log("[hooks] .git not found, skip installing hooks.");
  process.exit(0);
}

try {
  execSync("git config --local core.hooksPath .githooks", {
    cwd: repoRoot,
    stdio: "pipe",
  });

  const preCommitPath = resolve(repoRoot, ".githooks", "pre-commit");
  if (existsSync(preCommitPath)) {
    chmodSync(preCommitPath, 0o755);
  }

  const commitMsgPath = resolve(repoRoot, ".githooks", "commit-msg");
  if (existsSync(commitMsgPath)) {
    chmodSync(commitMsgPath, 0o755);
  }

  console.log("[hooks] Installed hooks path: .githooks");
} catch (error) {
  console.error("[hooks] Failed to install git hooks.", error);
  process.exit(1);
}
