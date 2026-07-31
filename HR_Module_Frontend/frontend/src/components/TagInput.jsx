import { useState } from "react";
import Icon from "./Icon";

export default function TagInput({ label, id, value = [], onChange, placeholder }) {
  const [draft, setDraft] = useState("");

  const addTag = () => {
    const tag = draft.trim();
    if (tag && !value.includes(tag)) {
      onChange([...value, tag]);
    }
    setDraft("");
  };

  const removeTag = (tag) => {
    onChange(value.filter((t) => t !== tag));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    } else if (e.key === "Backspace" && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-col gap-sm w-full">
      {label && (
        <label className="font-body-sm text-body-sm text-on-surface-variant font-medium" htmlFor={id}>
          {label}
        </label>
      )}
      <div className="w-full border border-surface-variant rounded focus-within:ring-1 focus-within:ring-primary focus-within:border-primary px-sm py-sm flex flex-wrap gap-xs items-center bg-surface-container-low dark:bg-transparent min-h-[44px]">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 bg-primary/15 text-primary font-label-mono text-label-mono uppercase px-sm py-xs rounded"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              aria-label={`Remove ${tag}`}
              className="hover:text-error"
            >
              <Icon name="close" className="text-[12px]" />
            </button>
          </span>
        ))}
        <input
          id={id}
          type="text"
          className="flex-1 min-w-[100px] outline-none border-none bg-transparent font-body-sm text-body-sm placeholder-on-surface-variant/50"
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
        />
      </div>
    </div>
  );
}
