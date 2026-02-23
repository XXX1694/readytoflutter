import { useEffect, useRef, useState } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-dart';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-kotlin';
import 'prismjs/components/prism-swift';

export default function CodeBlock({ code, language = 'dart' }) {
  const ref = useRef(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (ref.current) Prism.highlightElement(ref.current);
  }, [code, language]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const langMap = { dart: 'Dart', yaml: 'YAML', bash: 'Bash', json: 'JSON', kotlin: 'Kotlin', swift: 'Swift' };

  return (
    <div className="relative group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200 dark:bg-slate-900 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">{langMap[language] ?? language}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors py-0.5 px-2 rounded"
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5 text-flutter-blue dark:text-flutter-sky" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-flutter-blue dark:text-flutter-sky">Copied!</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>

      {/* Code */}
      <div className="overflow-x-auto">
        <pre className={`language-${language}`} style={{ margin: 0, borderRadius: 0, border: 'none' }}>
          <code ref={ref} className={`language-${language}`}>{code}</code>
        </pre>
      </div>
    </div>
  );
}
