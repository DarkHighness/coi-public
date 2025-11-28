import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { markdownComponents } from "../../utils/markdownComponents";

interface MarkdownTextProps {
  content: string;
  className?: string;
  disableIndent?: boolean;
  components?: Record<string, React.ComponentType<any>>;
}

export const MarkdownText: React.FC<MarkdownTextProps> = ({
  content,
  className = "",
  disableIndent = false,
  components: customComponents,
}) => {
  const components = React.useMemo(() => {
    // If custom components are provided, use them (merging with defaults if needed,
    // but here we'll just use them or the logic below)
    if (customComponents) return customComponents;

    if (!disableIndent) return markdownComponents;
    return {
      ...markdownComponents,
      p: ({ node, ...props }: any) => (
        <p className="mb-4 last:mb-0" {...props} />
      ),
    };
  }, [disableIndent, customComponents]);

  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
};
