import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import python from 'highlight.js/lib/languages/python';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import ini from 'highlight.js/lib/languages/ini';

// Lessons contain raw HTML for collapsible answers. It is sanitised, with only <details>/<summary> added.
const schema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'details', 'summary'],
  attributes: { ...defaultSchema.attributes, details: ['open'] },
};

export function Markdown({ children, variant }: { children: string; variant?: 'compact' | 'wide' }) {
  return (
    <div className={`prose ${variant ?? ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          rehypeRaw,
          [rehypeSanitize, schema],
          [rehypeHighlight, { languages: { python, bash, json, ini }, aliases: { python: ['py', 'python3'], bash: ['sh', 'shell', 'console'], ini: ['toml'] }, detect: false, ignoreMissing: true }],
        ]}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
