import { Input } from "antd";
import { Eye, EyeOff } from "lucide-react";
import type { ComponentProps } from "react";
export function PasswordInput(props: Omit<ComponentProps<typeof Input.Password>, "iconRender">) {
  return (
    <Input.Password
      {...props}
      iconRender={(visible) => (visible ? <Eye size={16} /> : <EyeOff size={16} />)}
    />
  );
}
