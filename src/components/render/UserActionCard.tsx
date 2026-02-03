import { MarkdownText } from "./MarkdownText";
import { useSettings } from "../../hooks/useSettings";

interface UserActionCardProps {
  text: string;
  labelDecided: string;
}

export const UserActionCard: React.FC<UserActionCardProps> = ({
  text,
  labelDecided,
}) => {
  const { themeMode } = useSettings();
  const isDarkMode =
    themeMode === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : themeMode === "night";

  return (
    <div className="px-2 md:px-6 my-10 md:my-12 animate-slide-in">
      <div className="mx-auto max-w-[72ch] flex justify-end">
        <div className="relative max-w-[60ch] md:max-w-[56ch]">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 -mr-2 md:-mr-4 w-[min(20rem,50%)] bg-gradient-to-l from-theme-surface/25 via-theme-surface/5 to-transparent opacity-70"
          />

          <div className="relative">
            <div className="flex justify-end mb-2">
              <span className="text-xs text-theme-primary font-bold uppercase tracking-widest opacity-50">
                {labelDecided}
              </span>
            </div>

            <div
              className={`mt-1 font-serif prose prose-lg text-theme-text leading-7 md:leading-8 text-right
              prose-p:my-4 md:prose-p:my-5
              prose-headings:font-semibold prose-headings:tracking-wide prose-headings:text-theme-text
              prose-strong:text-theme-text prose-em:text-theme-text/90
              prose-hr:my-6 prose-hr:border-theme-border/25
              prose-a:text-theme-primary prose-a:no-underline hover:prose-a:underline
              prose-blockquote:my-5 prose-blockquote:border-l-2 prose-blockquote:border-theme-border/35 prose-blockquote:pl-4 prose-blockquote:text-theme-text/85 prose-blockquote:not-italic
              prose-code:text-theme-text prose-code:bg-theme-surface/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
              prose-pre:bg-theme-surface/10 prose-pre:border prose-pre:border-theme-border/25
              ${isDarkMode ? "prose-invert" : ""}`}
            >
              <MarkdownText content={text} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
