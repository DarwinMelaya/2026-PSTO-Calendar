/** Strip HTML tags for plain-text previews (tables, search, etc.). */
export const stripHtmlTags = (html) => {
  const raw = (html ?? "").trim();
  if (!raw) return "";
  if (!raw.includes("<")) return raw;

  if (typeof document !== "undefined") {
    const div = document.createElement("div");
    div.innerHTML = raw;
    return (div.textContent || "").replace(/\s+/g, " ").trim();
  }

  return raw
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

export const isRichTextHtml = (text) => {
  const raw = (text ?? "").trim();
  return raw.startsWith("<") && /<\/[a-z][\s\S]*>/i.test(raw);
};

const escapeHtml = (text) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Convert legacy plain text or existing HTML for the editor. */
export const toEditorHtml = (value) => {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  if (isRichTextHtml(raw)) return raw;

  return raw
    .split("\n")
    .map((line) => {
      const escaped = escapeHtml(line);
      return `<p>${escaped || "<br>"}</p>`;
    })
    .join("");
};

/** Normalize empty editor output. */
export const normalizeEditorHtml = (html) => {
  const raw = (html ?? "").trim();
  if (!raw || raw === "<p></p>" || raw === "<p><br></p>") return "";
  return raw;
};
