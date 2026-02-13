const KNOWN_TOOL_PREFIX_REGEX = /^(default_api|functions?|tool|tools|mcp)[:.]/i;
const TOOL_NAME_NAMESPACE_PREFIX_REGEX = /^[a-z0-9_-]+[:.]/i;

const collectToolNameCandidates = (rawName: string): string[] => {
  const seed = rawName.trim();
  if (!seed) return [];

  const visited = new Set<string>();
  const queue: string[] = [seed];
  const ordered: string[] = [];

  while (queue.length > 0 && ordered.length < 24) {
    const current = queue.shift()!;
    if (!current || visited.has(current)) continue;
    visited.add(current);
    ordered.push(current);

    const strippedKnownPrefix = current.replace(KNOWN_TOOL_PREFIX_REGEX, "");
    if (strippedKnownPrefix && strippedKnownPrefix !== current) {
      queue.push(strippedKnownPrefix);
    }

    const namespaceMatch = current.match(TOOL_NAME_NAMESPACE_PREFIX_REGEX);
    if (namespaceMatch) {
      const strippedNamespace = current.slice(namespaceMatch[0].length);
      if (strippedNamespace) {
        queue.push(strippedNamespace);
      }
    }
  }

  return ordered;
};

export const resolveOutlineToolNameAlias = (
  rawName: string,
  allowedNames: Iterable<string>,
): string => {
  const allowedSet = new Set(Array.from(allowedNames));
  for (const candidate of collectToolNameCandidates(rawName)) {
    if (allowedSet.has(candidate)) {
      return candidate;
    }
  }
  return rawName;
};
