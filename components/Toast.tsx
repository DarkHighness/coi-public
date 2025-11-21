import React from "react";

interface ToastProps {
  show: boolean;
  message: string;
  type?: "info" | "error";
}

export const Toast: React.FC<ToastProps> = ({
  show,
  message,
  type = "info",
}) => {
  return (
    <div
      className={`fixed top-24 right-4 px-6 py-3 rounded-full shadow-lg transition-all duration-300 z-[100] ${
        show
          ? "opacity-100 translate-x-0"
          : "opacity-0 translate-x-4 pointer-events-none"
      } ${
        type === "error"
          ? "bg-red-900/90 text-red-100 border border-red-700"
          : "bg-theme-surface-highlight text-theme-primary border border-theme-primary"
      }`}
    >
      <span className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
        {type === "error" && (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
        )}
        {message}
      </span>
    </div>
  );
};
