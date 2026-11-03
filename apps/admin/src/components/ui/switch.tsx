import { Switch as AntSwitch } from "antd";
import type { ComponentProps } from "react";
export function Switch({
  onCheckedChange,
  ...props
}: Omit<ComponentProps<typeof AntSwitch>, "onChange"> & { onCheckedChange?: (checked: boolean) => void }) {
  return <AntSwitch {...props} onChange={onCheckedChange} />;
}
