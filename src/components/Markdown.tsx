import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

// Custom theme based on oneDark but with transparent backgrounds
const codeTheme = {
  ...oneDark,
  'pre[class*="language-"]': {
    ...oneDark['pre[class*="language-"]'],
    background: "transparent",
  },
  'code[class*="language-"]': {
    ...oneDark['code[class*="language-"]'],
    background: "transparent",
  },
};

interface MarkdownProps {
  content: string;
}

export function Markdown({ content }: MarkdownProps) {
  return (
    <div className="overflow-x-auto">
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children }) {
          const match = /language-(\w+)/.exec(className || "");
          const isInline = !match && !String(children).includes("\n");

          if (isInline) {
            return (
              <code className="px-1.5 py-0.5 bg-slate-800 text-slate-300 text-xs rounded">
                {children}
              </code>
            );
          }

          return (
            <SyntaxHighlighter
              style={codeTheme}
              language={match ? match[1] : "text"}
              PreTag="div"
              customStyle={{
                margin: "0.5rem 0",
                padding: "0.75rem",
                borderRadius: "4px",
                fontSize: "0.75rem",
                background: "#0f172a",
                border: "1px solid #1e293b",
              }}
            >
              {String(children).replace(/\n$/, "")}
            </SyntaxHighlighter>
          );
        },
        p({ children }) {
          return <p className="mb-2 last:mb-0">{children}</p>;
        },
        ul({ children }) {
          return <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>;
        },
        li({ children }) {
          return <li className="text-slate-300">{children}</li>;
        },
        strong({ children }) {
          return <strong className="font-semibold text-slate-200">{children}</strong>;
        },
        em({ children }) {
          return <em className="italic text-slate-300">{children}</em>;
        },
        h1({ children }) {
          return <h1 className="text-lg font-semibold text-slate-200 mb-2 mt-3">{children}</h1>;
        },
        h2({ children }) {
          return <h2 className="text-base font-semibold text-slate-200 mb-2 mt-3">{children}</h2>;
        },
        h3({ children }) {
          return <h3 className="text-sm font-semibold text-slate-200 mb-1 mt-2">{children}</h3>;
        },
        blockquote({ children }) {
          return (
            <blockquote className="border-l-2 border-slate-600 pl-3 my-2 text-slate-400 italic">
              {children}
            </blockquote>
          );
        },
        a({ href, children }) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 underline"
            >
              {children}
            </a>
          );
        },
        hr() {
          return <hr className="border-slate-700 my-3" />;
        },
        table({ children }) {
          return (
            <div className="overflow-x-auto my-2">
              <table className="min-w-full text-xs border border-slate-700">
                {children}
              </table>
            </div>
          );
        },
        thead({ children }) {
          return <thead className="bg-slate-800">{children}</thead>;
        },
        tbody({ children }) {
          return <tbody className="divide-y divide-slate-700">{children}</tbody>;
        },
        tr({ children }) {
          return <tr className="hover:bg-slate-800/50">{children}</tr>;
        },
        th({ children }) {
          return (
            <th className="px-2 py-1 text-left text-slate-300 font-medium border-b border-slate-600">
              {children}
            </th>
          );
        },
        td({ children }) {
          return <td className="px-2 py-1 text-slate-400">{children}</td>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
    </div>
  );
}
