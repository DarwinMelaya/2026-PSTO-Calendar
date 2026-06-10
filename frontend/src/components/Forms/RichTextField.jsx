import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import {
  MdFormatAlignCenter,
  MdFormatAlignJustify,
  MdFormatAlignLeft,
  MdFormatAlignRight,
  MdFormatBold,
  MdFormatClear,
  MdFormatItalic,
  MdFormatListBulleted,
  MdFormatListNumbered,
  MdFormatStrikethrough,
  MdFormatUnderlined,
} from "react-icons/md";
import { normalizeEditorHtml, toEditorHtml } from "../../utils/richText";

const ToolBtn = ({ active, onClick, title, children, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    aria-label={title}
    aria-pressed={active ?? false}
    className={`rounded p-1.5 text-slate-700 transition hover:bg-slate-200/80 disabled:cursor-not-allowed disabled:opacity-40 ${
      active ? "bg-blue-100 text-blue-700 ring-1 ring-blue-200" : ""
    }`}
  >
    {children}
  </button>
);

const ToolbarDivider = () => (
  <span className="mx-0.5 w-px self-stretch bg-slate-300" aria-hidden />
);

const RichTextField = ({
  id,
  value,
  onChange,
  placeholder = "Start typing…",
  minHeight = "6rem",
}) => {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        code: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Underline,
      TextAlign.configure({ types: ["paragraph"] }),
      Placeholder.configure({ placeholder }),
    ],
    content: toEditorHtml(value),
    editorProps: {
      attributes: {
        class: "rich-text-editor__body",
        id,
        style: `min-height: ${minHeight}`,
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange({
        target: { value: normalizeEditorHtml(ed.getHTML()) },
      });
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (editor.isFocused) return;

    const next = toEditorHtml(value ?? "");
    const current = editor.getHTML();
    if (next !== current) {
      editor.commands.setContent(next, false);
    }
  }, [editor, value]);

  if (!editor) {
    return (
      <div className="rich-text-editor rounded-lg border border-slate-300 bg-white">
        <div className="h-10 border-b border-slate-200 bg-slate-50" />
        <div
          className="animate-pulse bg-slate-50"
          style={{ minHeight }}
          aria-hidden
        />
      </div>
    );
  }

  const iconClass = "h-[18px] w-[18px]";

  return (
    <div className="rich-text-editor overflow-hidden rounded-lg border border-slate-300 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
      <div
        className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-2 py-1.5"
        role="toolbar"
        aria-label="Text formatting"
      >
        <ToolBtn
          title="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <MdFormatBold className={iconClass} aria-hidden />
        </ToolBtn>
        <ToolBtn
          title="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <MdFormatItalic className={iconClass} aria-hidden />
        </ToolBtn>
        <ToolBtn
          title="Underline"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <MdFormatUnderlined className={iconClass} aria-hidden />
        </ToolBtn>
        <ToolBtn
          title="Strikethrough"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <MdFormatStrikethrough className={iconClass} aria-hidden />
        </ToolBtn>

        <ToolbarDivider />

        <ToolBtn
          title="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <MdFormatListBulleted className={iconClass} aria-hidden />
        </ToolBtn>
        <ToolBtn
          title="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <MdFormatListNumbered className={iconClass} aria-hidden />
        </ToolBtn>

        <ToolbarDivider />

        <ToolBtn
          title="Align left"
          active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          <MdFormatAlignLeft className={iconClass} aria-hidden />
        </ToolBtn>
        <ToolBtn
          title="Align center"
          active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          <MdFormatAlignCenter className={iconClass} aria-hidden />
        </ToolBtn>
        <ToolBtn
          title="Align right"
          active={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        >
          <MdFormatAlignRight className={iconClass} aria-hidden />
        </ToolBtn>
        <ToolBtn
          title="Justify"
          active={editor.isActive({ textAlign: "justify" })}
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        >
          <MdFormatAlignJustify className={iconClass} aria-hidden />
        </ToolBtn>

        <ToolbarDivider />

        <ToolBtn
          title="Clear formatting"
          onClick={() =>
            editor.chain().focus().clearNodes().unsetAllMarks().run()
          }
        >
          <MdFormatClear className={iconClass} aria-hidden />
        </ToolBtn>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
};

export default RichTextField;
