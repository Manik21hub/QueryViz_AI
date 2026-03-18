"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Loader2, ArrowRight } from "lucide-react";

interface PromptBarProps {
  onSubmit: (prompt: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export default function PromptBar({ onSubmit, isLoading, disabled = false }: PromptBarProps) {
  const [prompt, setPrompt] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isLoading && !disabled) {
      onSubmit(prompt);
    }
  };

  // Focus input when dataset is uploaded (disabled becomes false)
  useEffect(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [disabled]);

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center w-full gap-3"
    >
      <div className="relative flex-1">
        <Search className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          ref={inputRef}
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask a question about your YouTube data..."
          disabled={isLoading || disabled}
          className="w-full bg-[#16161c] border border-white/5 shadow-inner rounded-xl py-3 pl-11 pr-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>
      <button
        type="submit"
        disabled={isLoading || !prompt.trim() || disabled}
        className="px-6 py-3 rounded-xl bg-[#4338ca] hover:bg-[#4f46e5] text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-indigo-400/20"
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            Ask <ArrowRight className="w-4 h-4 ml-1" />
          </>
        )}
      </button>
    </form>
  );
}
