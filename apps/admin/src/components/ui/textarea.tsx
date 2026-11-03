import { Input } from "antd";
import { type ComponentProps, type ComponentRef, forwardRef } from "react";
export const Textarea = forwardRef<HTMLTextAreaElement, ComponentProps<"textarea">>(
  function Textarea(props, ref) {
    const assign = (instance: ComponentRef<typeof Input.TextArea> | null) => {
      const element = instance?.resizableTextArea?.textArea ?? null;
      if (typeof ref === "function") ref(element);
      else if (ref) ref.current = element;
    };
    return <Input.TextArea {...props} ref={assign} />;
  },
);
