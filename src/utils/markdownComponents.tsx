import React from "react";

/**
 * Shared markdown components for consistent styling across the application
 * Used by StoryText and TypewriterText components
 */
export const markdownComponents = {
  p: ({ node, ...props }: any) => (
    <p className="mb-4 last:mb-0 indent-8" {...props} />
  ),
  strong: ({ node, ...props }: any) => (
    <strong className="font-bold text-theme-primary" {...props} />
  ),
  em: ({ node, ...props }: any) => (
    <em className="italic text-theme-text/90" {...props} />
  ),
  code: ({ node, inline, className, children, ...props }: any) => {
    const match = /language-(\w+)/.exec(className || "");
    const isInline = inline || !match;

    if (isInline) {
      return (
        <code
          className="px-1 py-0.5 bg-theme-surface/60 rounded text-sm font-mono text-theme-accent break-words"
          {...props}
        >
          {children}
        </code>
      );
    }

    return (
      <div className="my-4 rounded-md overflow-hidden border border-theme-border/50 bg-theme-surface/40">
        <div className="px-3 py-1 text-xs text-theme-muted bg-theme-surface/60 border-b border-theme-border/30 font-mono uppercase tracking-wider">
          {match ? match[1] : "code"}
        </div>
        <div className="p-3 overflow-x-auto">
          <code className="text-sm font-mono text-theme-text/90" {...props}>
            {children}
          </code>
        </div>
      </div>
    );
  },
  math: ({ node, ...props }: any) => (
    <div className="my-4 text-center font-serif text-lg text-theme-primary overflow-x-auto py-2">
      {props.children}
    </div>
  ),
  inlineMath: ({ node, ...props }: any) => (
    <span className="font-serif text-theme-primary px-1">{props.children}</span>
  ),
  pre: ({ node, ...props }: any) => <span {...props} />,
  blockquote: ({ node, ...props }: any) => (
    <blockquote
      className="border-l-4 border-theme-primary/50 pl-4 my-4 italic text-theme-text/80"
      {...props}
    />
  ),
  ul: ({ node, ...props }: any) => (
    <ul className="list-disc list-inside my-2 space-y-1" {...props} />
  ),
  ol: ({ node, ...props }: any) => (
    <ol className="list-decimal list-inside my-2 space-y-1" {...props} />
  ),
  li: ({ node, ...props }: any) => (
    <li className="ml-2 flex items-center" {...props} />
  ),
  h1: ({ node, ...props }: any) => (
    <h1 className="text-2xl font-bold my-4 text-theme-primary" {...props} />
  ),
  h2: ({ node, ...props }: any) => (
    <h2
      className="text-xl font-semibold my-3 text-theme-primary/90"
      {...props}
    />
  ),
  h3: ({ node, ...props }: any) => (
    <h3
      className="text-lg font-semibold my-2 text-theme-primary/80"
      {...props}
    />
  ),
};
