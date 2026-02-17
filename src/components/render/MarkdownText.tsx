import React from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { markdownComponents } from "../../utils/markdownComponents";

type MarkdownElementProps = React.HTMLAttributes<HTMLElement> & {
  node?: unknown;
  inline?: boolean;
  children?: React.ReactNode;
};

type MarkdownCustomProps = {
  className?: string;
  [key: string]: unknown;
};

interface MarkdownTextProps {
  content: string;
  className?: string;
  disableIndent?: boolean;
  indentSize?: number;
  inline?: boolean;
  components?: Components;
}

export const MarkdownText = React.memo<MarkdownTextProps>(
  ({
    content,
    className = "",
    disableIndent = false,
    indentSize = 8,
    inline = false,
    components: customComponents,
  }) => {
    // Hoist plugins to prevent re-creation on every render
    const plugins = React.useMemo(() => [remarkGfm, remarkMath], []);

    const components = React.useMemo(() => {
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

      // If custom components are provided, merge with markdownComponents and inject className
      if (customComponents) {
        const mergedComponents: Components = {
          ...(markdownComponents as Components),
          ...customComponents,
        };
        const mutableComponents = mergedComponents as Record<string, unknown>;

        for (const [key, customComponent] of Object.entries(customComponents)) {
          if (typeof customComponent !== "function") {
            continue;
          }
          mutableComponents[key] = (props: MarkdownCustomProps) => {
            const allClassNames = [
              key === "p" ? indentClass : "",
              className,
              props.className,
            ]
              .filter(Boolean)
              .join(" ");
            return React.createElement(customComponent as React.ElementType, {
              ...props,
              className: allClassNames,
            });
          };
        }
        return mergedComponents;
      }

      if (inline) {
        return {
          ...(markdownComponents as Components),
          p: ({ node: _node, ...props }: MarkdownElementProps) => (
            <span className={className} {...props} />
          ),
          div: ({ node: _node, ...props }: MarkdownElementProps) => (
            <span className={className} {...props} />
          ),
        } satisfies Components;
      }

      return {
        ...(markdownComponents as Components),
        p: ({ node: _node, ...props }: MarkdownElementProps) => (
          <p
            className={indentClass + " " + className + " mb-4 last:mb-0"}
            {...props}
          />
        ),
      } satisfies Components;
    }, [disableIndent, indentSize, inline, customComponents, className]);

    // When customComponents provided, render without wrapper
    if (customComponents) {
      return (
        <ReactMarkdown remarkPlugins={plugins} components={components}>
          {content}
        </ReactMarkdown>
      );
    }

    if (inline) {
      return (
        <span className={`markdown-content-inline ${className}`}>
          <ReactMarkdown remarkPlugins={plugins} components={components}>
            {content}
          </ReactMarkdown>
        </span>
      );
    }

    return (
      <div className={`markdown-content ${className}`}>
        <ReactMarkdown remarkPlugins={plugins} components={components}>
          {content}
        </ReactMarkdown>
      </div>
    );
  },
);

MarkdownText.displayName = "MarkdownText";
