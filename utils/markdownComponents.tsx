import React from "react";

/**
 * Shared markdown components for consistent styling across the application
 * Used by StoryText and TypewriterText components
 */
export const markdownComponents = {
  p: ({ node, ...props }: any) => (
    <p className="mb-4 last:mb-0" {...props} />
  ),
  strong: ({ node, ...props }: any) => (
    <strong className="font-bold text-theme-primary" {...props} />
  ),
  em: ({ node, ...props }: any) => (
    <em className="italic text-theme-text/90" {...props} />
  ),
  code: ({ node, inline, ...props }: any) =>
    inline ? (
      <code className="px-1 py-0.5 bg-theme-surface/60 rounded text-sm font-mono text-theme-accent" {...props} />
    ) : (
      <code className="block p-3 bg-theme-surface/40 rounded font-mono text-sm my-2" {...props} />
    ),
  blockquote: ({ node, ...props }: any) => (
    <blockquote className="border-l-4 border-theme-primary/50 pl-4 my-4 italic text-theme-text/80" {...props} />
  ),
  ul: ({ node, ...props }: any) => (
    <ul className="list-disc list-inside my-2 space-y-1" {...props} />
  ),
  ol: ({ node, ...props }: any) => (
    <ol className="list-decimal list-inside my-2 space-y-1" {...props} />
  ),
  li: ({ node, ...props }: any) => (
    <li className="ml-2" {...props} />
  ),
  h1: ({ node, ...props }: any) => (
    <h1 className="text-2xl font-bold my-4 text-theme-primary" {...props} />
  ),
  h2: ({ node, ...props }: any) => (
    <h2 className="text-xl font-semibold my-3 text-theme-primary/90" {...props} />
  ),
  h3: ({ node, ...props }: any) => (
    <h3 className="text-lg font-semibold my-2 text-theme-primary/80" {...props} />
  ),
};
