"use client";

import { XIcon } from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";

import {
  adminBorderlessControlClass,
  adminBorderlessFocusClass,
} from "@/components/admin/ai-assistant-form-styles";
import { cn } from "@/lib/utils";

const DEFAULT_MAX_TAGS = 10;
const MAX_TAG_LENGTH = 50;

type PostTagInputProps = {
  id?: string;
  value: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
  maxTags?: number;
  className?: string;
};

function normalizeTag(raw: string): string | null {
  const tag = raw.trim();
  if (!tag) return null;
  return tag.length > MAX_TAG_LENGTH ? tag.slice(0, MAX_TAG_LENGTH) : tag;
}

function hasTag(tags: string[], candidate: string) {
  const key = candidate.toLowerCase();
  return tags.some((tag) => tag.toLowerCase() === key);
}

export function PostTagInput({
  id,
  value,
  onChange,
  disabled = false,
  maxTags = DEFAULT_MAX_TAGS,
  className,
}: PostTagInputProps) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const remaining = maxTags - value.length;

  function addTag(raw: string) {
    const tag = normalizeTag(raw);
    if (!tag || hasTag(value, tag) || value.length >= maxTags) {
      setDraft("");
      return;
    }
    onChange([...value, tag]);
    setDraft("");
  }

  function removeTag(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      addTag(draft);
      return;
    }

    if (event.key === "Backspace" && draft === "" && value.length > 0) {
      event.preventDefault();
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div
      className={cn(
        "admin-tag-input",
        adminBorderlessControlClass,
        adminBorderlessFocusClass,
        "flex min-h-10 cursor-text flex-wrap items-center gap-1.5 px-2 py-1.5 focus-within:border-primary/40",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {value.map((tag, index) => (
        <span
          key={`${tag}-${index}`}
          className="inline-flex max-w-full items-center gap-0.5 rounded-sm bg-primary px-2 py-0.5 text-xs text-primary-foreground"
        >
          <span className="truncate">{tag}</span>
          {!disabled ? (
            <button
              type="button"
              className="rounded-sm p-0.5 hover:bg-primary-foreground/20"
              aria-label={`删除标签 ${tag}`}
              onClick={(event) => {
                event.stopPropagation();
                removeTag(index);
              }}
            >
              <XIcon className="size-3 shrink-0" />
            </button>
          ) : null}
        </span>
      ))}
      {remaining > 0 ? (
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={draft}
          disabled={disabled}
          placeholder={value.length === 0 ? "按回车键 Enter 创建标签" : "Enter 添加"}
          className="admin-tag-input-field min-w-[7rem] flex-1 border-0 bg-transparent p-0 text-sm outline-none placeholder:text-muted-foreground"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
        />
      ) : null}
    </div>
  );
}

export { DEFAULT_MAX_TAGS as POST_TAG_INPUT_MAX_TAGS };
