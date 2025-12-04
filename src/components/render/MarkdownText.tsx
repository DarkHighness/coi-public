import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { markdownComponents } from "../../utils/markdownComponents";

interface MarkdownTextProps {
  content: string;
  className?: string;
  disableIndent?: boolean;
  indentSize?: number;
  inline?: boolean;
  components?: Record<string, React.ComponentType<any>>;
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
    const components = React.useMemo(() => {
      // If custom components are provided, merge with markdownComponents and inject className
      if (customComponents) {
        const mergedComponents: Record<string, React.ComponentType<any>> = {
          ...markdownComponents,
        };

        for (const [key, CustomComponent] of Object.entries(customComponents)) {
          const DefaultComponent =
            markdownComponents[key as keyof typeof markdownComponents];

          mergedComponents[key] = (props: any) => {
            // Get default className from markdownComponents by rendering it
            let defaultClassName = "";
            if (DefaultComponent) {
              // Extract className from default component's props pattern
              // Since markdownComponents define className inline, we need to call it
              const defaultElement = DefaultComponent(props);
              if (React.isValidElement(defaultElement)) {
                const elementProps = defaultElement.props as {
                  className?: string;
                };
                if (elementProps?.className) {
                  defaultClassName = elementProps.className;
                }
              }
            }

            // Merge all classNames: default + passed className prop + props.className
            const allClassNames = [defaultClassName, className, props.className]
              .filter(Boolean)
              .join(" ");

            return <CustomComponent {...props} className={allClassNames} />;
          };
        }
        return mergedComponents;
      }

      if (inline) {
        return {
          ...markdownComponents,
          p: ({ node, ...props }: any) => (
            <span className={className} {...props} />
          ),
          div: ({ node, ...props }: any) => (
            <span className={className} {...props} />
          ),
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
          <p
            className={indentClass + " " + className + " mb-4 last:mb-0"}
            {...props}
          />
        ),
      };
    }, [disableIndent, indentSize, inline, customComponents, className]);

    // When customComponents provided, render without wrapper
    if (customComponents) {
      return (
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          components={components}
        >
          {content}
        </ReactMarkdown>
      );
    }

    if (inline) {
      return (
        <span className={`markdown-content-inline ${className}`}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            components={components}
          >
            {content}
          </ReactMarkdown>
        </span>
      );
    }

    return (
      <div className={`markdown-content ${className}`}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          components={components}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  },
);

MarkdownText.displayName = "MarkdownText";
