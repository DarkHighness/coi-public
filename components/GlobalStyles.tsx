import React from "react";

interface GlobalStylesProps {
  themeConfig: {
    vars: Record<string, string>;
  };
}

export const GlobalStyles: React.FC<GlobalStylesProps> = ({ themeConfig }) => {
  return (
    <style>{`
      :root {
        --theme-bg: ${themeConfig.vars["--theme-bg"]};
        --theme-surface: ${themeConfig.vars["--theme-surface"]};
        --theme-surface-highlight: ${themeConfig.vars["--theme-surface-highlight"]};
        --theme-border: ${themeConfig.vars["--theme-border"]};
        --theme-primary: ${themeConfig.vars["--theme-primary"]};
        --theme-primary-hover: ${themeConfig.vars["--theme-primary-hover"]};
        --theme-text: ${themeConfig.vars["--theme-text"]};
        --theme-muted: ${themeConfig.vars["--theme-muted"]};
      }
    `}</style>
  );
};
