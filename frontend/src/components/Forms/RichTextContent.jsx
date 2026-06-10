import { isRichTextHtml } from "../../utils/richText";

const RichTextContent = ({ html, className = "" }) => {
  const raw = (html ?? "").trim();
  if (!raw) return null;

  if (!isRichTextHtml(raw)) {
    return (
      <span className={`whitespace-pre-wrap ${className}`.trim()}>{raw}</span>
    );
  }

  return (
    <div
      className={`rich-text-content ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: raw }}
    />
  );
};

export default RichTextContent;
