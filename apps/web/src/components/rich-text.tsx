import DOMPurify from 'isomorphic-dompurify';

export function RichText({ html }: { html: string }) {
  const root = DOMPurify.sanitize(html);
  return <span dangerouslySetInnerHTML={{ __html: root.toString() }} />;
}
