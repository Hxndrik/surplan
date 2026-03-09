import { useState, useEffect, useRef } from 'react';
import { generateMultiAgentPrompt } from '../../lib/backup';
import { useToast } from '../../hooks/useToast';

interface MultiAgentPromptModalProps {
  onClose: () => void;
}

export function MultiAgentPromptModal({ onClose }: MultiAgentPromptModalProps) {
  const toast = useToast();
  const [content, setContent] = useState('');
  const [copied, setCopied] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setContent(generateMultiAgentPrompt());
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      toast.success('Prompt copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => toast.error('Failed to copy'));
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'claude-build-prompt.md';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Prompt downloaded as .md');
  };

  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const lineCount = content.split('\n').length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-bg-secondary border border-border-default rounded-xl shadow-2xl w-full max-w-4xl mx-4 flex flex-col max-h-[90vh] animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-default flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-accent text-base">✦</span>
              <h2 className="text-sm font-semibold text-text-primary">Claude Code Build Prompt</h2>
            </div>
            <p className="text-[11px] text-text-muted mt-0.5">
              Copy and paste into a new Claude Code session to kick off your build
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-text-muted font-mono">{lineCount} lines · {wordCount} words</span>
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-bg-tertiary border border-border-default hover:border-border-active text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download .md
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className={`flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-lg border transition-colors cursor-pointer font-medium ${
                copied
                  ? 'bg-success/10 border-success/40 text-success'
                  : 'bg-accent hover:bg-accent-hover border-transparent text-white'
              }`}
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                  </svg>
                  Copy Prompt
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Info banner */}
        <div className="px-5 py-2.5 bg-accent/5 border-b border-accent/10 flex-shrink-0 flex items-start gap-2">
          <svg className="w-3.5 h-3.5 text-accent mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          <p className="text-[11px] text-text-secondary leading-relaxed">
            This prompt instructs Claude Code to <strong className="text-text-primary">plan first</strong>, use <strong className="text-text-primary">parallel subagents</strong> for independent work streams, and ask only <strong className="text-text-primary">truly critical questions</strong>. Paste it at the start of a fresh Claude Code session.
          </p>
        </div>

        {/* Prompt content */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <textarea
            ref={textRef}
            readOnly
            value={content}
            className="flex-1 w-full bg-bg-primary text-text-secondary text-[11px] font-mono leading-relaxed p-5 resize-none focus:outline-none"
            spellCheck={false}
            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
          />
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border-default flex-shrink-0 flex items-center justify-between">
          <p className="text-[10px] text-text-muted">
            Click inside the text area to select all · <kbd className="border border-border-default rounded px-1 text-[9px]">Esc</kbd> to close
          </p>
          <button
            type="button"
            onClick={handleCopy}
            className={`flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-lg border transition-colors cursor-pointer font-medium ${
              copied
                ? 'bg-success/10 border-success/40 text-success'
                : 'bg-accent hover:bg-accent-hover border-transparent text-white'
            }`}
          >
            {copied ? '✓ Copied!' : '✦ Copy Prompt'}
          </button>
        </div>
      </div>
    </div>
  );
}
