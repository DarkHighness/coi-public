import React from "react";

interface MagicMirrorButtonProps {
  onAnimate: () => void;
}

export const MagicMirrorButton: React.FC<MagicMirrorButtonProps> = ({
  onAnimate,
}) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onAnimate();
    }}
    className="bg-black/60 hover:bg-theme-primary text-white p-2 rounded backdrop-blur-md border border-white/10 transition-all opacity-80 md:opacity-0 md:group-hover:opacity-100 md:translate-y-[-10px] md:group-hover:translate-y-0 duration-500 shadow-lg z-10"
    title="Animate"
  >
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
      ></path>
    </svg>
  </button>
);
