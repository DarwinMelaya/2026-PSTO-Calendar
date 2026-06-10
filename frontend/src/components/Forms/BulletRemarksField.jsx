import { useRef, useState } from "react";
import { FiList } from "react-icons/fi";

const BULLET = "• ";
const BULLET_PATTERN = /^[•\-*]\s*/;

const hasBullet = (line) => BULLET_PATTERN.test(line);

const stripBullet = (line) => line.replace(BULLET_PATTERN, "");

const addBullet = (line) => {
  const stripped = stripBullet(line);
  return stripped ? BULLET + stripped : BULLET;
};

const BulletRemarksField = ({
  id,
  value,
  onChange,
  rows = 5,
  placeholder,
  inputClass = "",
}) => {
  const textareaRef = useRef(null);
  const [bulletsActive, setBulletsActive] = useState(false);

  const syncBulletState = () => {
    const ta = textareaRef.current;
    if (!ta) return;

    const { selectionStart, value: text } = ta;
    const lineStart = text.lastIndexOf("\n", selectionStart - 1) + 1;
    const lineEnd = text.indexOf("\n", selectionStart);
    const end = lineEnd === -1 ? text.length : lineEnd;
    const currentLine = text.slice(lineStart, end);
    setBulletsActive(hasBullet(currentLine));
  };

  const applyChange = (newValue, cursorPos) => {
    onChange({ target: { value: newValue } });
    requestAnimationFrame(() => {
      const ta = textareaRef.current;
      if (!ta) return;
      ta.selectionStart = ta.selectionEnd = cursorPos;
      ta.focus();
      syncBulletState();
    });
  };

  const getSelectionBlock = () => {
    const ta = textareaRef.current;
    if (!ta) return null;

    const { selectionStart, selectionEnd, value: text } = ta;
    const lineStart = text.lastIndexOf("\n", selectionStart - 1) + 1;
    const lineEndRaw = text.indexOf("\n", selectionStart);
    const lineEnd = lineEndRaw === -1 ? text.length : lineEndRaw;
    const blockStart = text.lastIndexOf("\n", selectionStart - 1) + 1;
    const blockEndRaw = text.indexOf("\n", selectionEnd);
    const blockEnd = blockEndRaw === -1 ? text.length : blockEndRaw;

    return {
      selectionStart,
      selectionEnd,
      text,
      lineStart,
      lineEnd,
      currentLine: text.slice(lineStart, lineEnd),
      blockStart,
      blockEnd,
      block: text.slice(blockStart, blockEnd),
    };
  };

  const toggleBullets = () => {
    const info = getSelectionBlock();
    if (!info) return;

    const { selectionStart, selectionEnd, text, blockStart, blockEnd, block } =
      info;

    if (!block && !text.trim()) {
      applyChange(BULLET, BULLET.length);
      return;
    }

    const lines = block.split("\n");
    const nonEmptyLines = lines.filter((line) => line.trim());
    const allBulleted =
      nonEmptyLines.length > 0 && nonEmptyLines.every((line) => hasBullet(line));

    const newLines = lines.map((line) => {
      if (!line.trim()) return line;
      return allBulleted ? stripBullet(line) : addBullet(line);
    });

    const newBlock = newLines.join("\n");
    const newValue = text.slice(0, blockStart) + newBlock + text.slice(blockEnd);
    const lengthDiff = newBlock.length - block.length;
    applyChange(newValue, selectionEnd + lengthDiff);
  };

  const handleKeyDown = (e) => {
    const info = getSelectionBlock();
    if (!info) return;

    const { selectionStart, selectionEnd, text, lineStart, lineEnd, currentLine } =
      info;

    if (e.key === "Enter" && !e.shiftKey && hasBullet(currentLine)) {
      e.preventDefault();

      if (!stripBullet(currentLine).trim()) {
        const newValue = text.slice(0, lineStart) + text.slice(lineEnd);
        applyChange(newValue, lineStart);
        return;
      }

      const insert = `\n${BULLET}`;
      const newValue =
        text.slice(0, selectionStart) + insert + text.slice(selectionEnd);
      applyChange(newValue, selectionStart + insert.length);
      return;
    }

    if (e.key === "Backspace" && selectionStart === selectionEnd) {
      const relPos = selectionStart - lineStart;
      if (
        relPos > 0 &&
        relPos <= BULLET.length &&
        text.slice(lineStart, lineStart + BULLET.length) === BULLET
      ) {
        e.preventDefault();
        const newValue =
          text.slice(0, lineStart) +
          stripBullet(currentLine) +
          text.slice(lineEnd);
        applyChange(newValue, lineStart);
      }
    }
  };

  const toolbarBtnClass = bulletsActive
    ? "rounded-md bg-blue-100 p-1.5 text-blue-700 ring-1 ring-blue-200"
    : "rounded-md p-1.5 text-slate-600 hover:bg-slate-200/70";

  return (
    <div className="overflow-hidden rounded-lg border border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
      <div className="flex items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-2 py-1.5">
        <button
          type="button"
          onClick={toggleBullets}
          className={toolbarBtnClass}
          title="Bullet list"
          aria-label="Toggle bullet list"
          aria-pressed={bulletsActive}
        >
          <FiList className="h-4 w-4" aria-hidden />
        </button>
        <span className="ml-1 text-xs text-slate-400">
          Press Enter for next bullet
        </span>
      </div>
      <textarea
        ref={textareaRef}
        id={id}
        value={value}
        onChange={(e) => {
          onChange(e);
          syncBulletState();
        }}
        onKeyDown={handleKeyDown}
        onClick={syncBulletState}
        onKeyUp={syncBulletState}
        onSelect={syncBulletState}
        rows={rows}
        placeholder={placeholder}
        className={`w-full resize-y border-0 px-4 py-2.5 text-slate-800 placeholder:text-slate-400 focus:outline-none ${inputClass}`}
      />
    </div>
  );
};

export default BulletRemarksField;
