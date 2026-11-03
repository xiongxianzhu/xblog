import { Select } from "antd";
import { X } from "lucide-react";
export const POST_TAG_INPUT_MAX_TAGS = 10;
export function PostTagInput({
  value,
  onChange,
  maxTags = POST_TAG_INPUT_MAX_TAGS,
  ...props
}: {
  id?: string;
  value: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
  maxTags?: number;
  className?: string;
}) {
  return (
    <Select
      {...props}
      mode="tags"
      value={value}
      tokenSeparators={[",", "，"]}
      suffixIcon={null}
      removeIcon={<X size={12} />}
      style={{ width: "100%" }}
      maxCount={maxTags}
      onChange={(values) => {
        const seen = new Set<string>();
        onChange(
          values
            .map((value) => value.trim().slice(0, 50))
            .filter((value) => {
              const key = value.toLowerCase();
              if (!value || seen.has(key)) return false;
              seen.add(key);
              return true;
            })
            .slice(0, maxTags),
        );
      }}
    />
  );
}
