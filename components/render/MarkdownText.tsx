import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { markdownComponents } from "../../utils/markdownComponents";

interface MarkdownTextProps {
  content: string;
  className?: string;
  disableIndent?: boolean;
}

export const MarkdownText: React.FC<MarkdownTextProps> = ({
  content,
  className = "",
  disableIndent = false,
}) => {
  const components = React.useMemo(() => {
    if (!disableIndent) return markdownComponents;
    return {
      ...markdownComponents,
      p: ({ node, ...props }: any) => (
        <p className="mb-4 last:mb-0" {...props} />
      ),
    };
  }, [disableIndent]);

  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
};
