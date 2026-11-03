import { Input as AntInput, type InputRef } from "antd";
import { type ComponentProps, forwardRef } from "react";
export const Input = forwardRef<HTMLInputElement, ComponentProps<"input">>(function Input(props, ref) {
  const assign = (instance: InputRef | null) => {
    const element = instance?.input ?? null;
    if (typeof ref === "function") ref(element);
    else if (ref) ref.current = element;
  };
  if (props.type === "file") return <input {...props} ref={ref} />;
  return <AntInput {...props} size={undefined} ref={assign} />;
});
