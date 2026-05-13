import ReactMarkdown from 'react-markdown'
import { invoke } from '@tauri-apps/api/core'

interface Props {
  source: string
  className?: string
}

export function MarkdownPreview({ source, className }: Props) {
  if (!source.trim()) {
    return (
      <p className={`text-xs text-gray-400 italic ${className ?? ''}`}>（未入力）</p>
    )
  }
  return (
    <div className={`prose-repohub text-sm ${className ?? ''}`}>
      <ReactMarkdown
        components={{
          a: ({ href, children, ...rest }) => (
            <a
              {...rest}
              href={href}
              onClick={(e) => {
                if (!href || !/^https?:\/\//.test(href)) return
                e.preventDefault()
                invoke('open_url', { url: href }).catch(() => {})
              }}
              className="text-blue-600 hover:underline break-all"
              rel="noreferrer"
              target="_blank"
            >
              {children}
            </a>
          ),
          code: ({ children, ...rest }) => (
            <code
              {...rest}
              className="font-mono text-[12px] px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-700"
            >
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="font-mono text-xs p-2 rounded bg-gray-100 dark:bg-gray-700 overflow-x-auto">
              {children}
            </pre>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-0.5 my-2">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-0.5 my-2">{children}</ol>
          ),
          h1: ({ children }) => <h3 className="text-base font-bold mt-2 mb-1">{children}</h3>,
          h2: ({ children }) => <h4 className="text-sm font-bold mt-2 mb-1">{children}</h4>,
          h3: ({ children }) => <h5 className="text-sm font-semibold mt-1 mb-0.5">{children}</h5>,
          p: ({ children }) => <p className="my-1.5 leading-relaxed">{children}</p>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-gray-300 dark:border-gray-600 pl-3 text-gray-600 dark:text-gray-300 my-2">
              {children}
            </blockquote>
          ),
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  )
}
