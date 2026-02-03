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
    <div className="flex justify-end mb-8 animate-slide-in">
      <div className="relative bg-theme-surface-highlight text-theme-text px-6 py-4 rounded-3xl rounded-tr-sm border border-theme-border max-w-[85%] md:max-w-[70%] shadow-lg">
        <span className="text-xs uppercase tracking-widest text-theme-primary font-bold block mb-1 opacity-70">
          {labelDecided}
        </span>
        <div
          className={`font-medium text-lg prose max-w-none ${isDarkMode ? "prose-invert" : ""}`}
        >
          <MarkdownText disableIndent content={text}></MarkdownText>
        </div>
      </div>
    </div>
  );
};
