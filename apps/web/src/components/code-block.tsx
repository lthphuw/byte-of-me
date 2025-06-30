'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';

interface CodeBlockProps {
  className?: string;
  children?: string | string[];
}

export function CodeBlock({ className = '', children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match?.[1] || '';

  const code =
    typeof children === 'string'
      ? children
      : Array.isArray(children)
      ? children.join('')
      : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        customStyle={{
          borderRadius: '0.5rem',
          padding: '1rem',
          fontSize: '0.875rem',
        }}
        wrapLongLines
      >
        {code}
      </SyntaxHighlighter>

      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 bg-zinc-800 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition"
        aria-label="Copy code"
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
      </button>
    </div>
  );
}
