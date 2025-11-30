import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { markdownComponents } from "../../utils/markdownComponents";

interface MarkdownTextProps {
  content: string;
  className?: string;
  disableIndent?: boolean;
  indentSize?: number;
  inline?: boolean;
  components?: Record<string, React.ComponentType<any>>;
}

export const MarkdownText: React.FC<MarkdownTextProps> = ({
  content,
  className = "",
  disableIndent = false,
  indentSize = 8,
  inline = false,
  components: customComponents,
}) => {
  const components = React.useMemo(() => {
    // If custom components are provided, use them (merging with defaults if needed,
    // but here we'll just use them or the logic below)
    if (customComponents) return customComponents;

    if (inline) {
      return {
        ...markdownComponents,
        p: ({ node, ...props }: any) => <span {...props} />,
        div: ({ node, ...props }: any) => <span {...props} />,
      };
    }

    // Use switch case to adapt tailwind indent class
    let indentClass = "";
    switch (indentSize) {
      case 2:
        indentClass = "indent-2";
        break;
      case 4:
        indentClass = "indent-4";
        break;
      case 8:
        indentClass = "indent-8";
        break;
      default:
        indentClass = "indent-8";
    }

    if (disableIndent) {
      indentClass = "";
    }

    return {
      ...markdownComponents,
      p: ({ node, ...props }: any) => (
        <p className={indentClass + " mb-4 last:mb-0"} {...props} />
      ),
    };
  }, [disableIndent, indentSize, inline, customComponents]);

  if (inline) {
    return (
      <span className={`markdown-content-inline ${className}`}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {content}
        </ReactMarkdown>
      </span>
    );
  }

  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
};
