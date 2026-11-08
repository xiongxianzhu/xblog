import { theme } from "antd";
import type { CSSProperties } from "react";
import "./admin-menu-arrow.css";

/** Menu-style two-stroke motion for controls without a native morphing arrow. */
export function AdminMenuArrow({ open = false }: { open?: boolean }) {
  const { token } = theme.useToken();
  return (
    <span
      className="admin-menu-arrow"
      data-open={open}
      aria-hidden="true"
      style={
        {
          "--admin-arrow-size": `${(token.fontSize / 7) * 5}px`,
          "--admin-arrow-duration": token.motionDurationSlow,
          "--admin-arrow-easing": token.motionEaseInOut,
          "--admin-arrow-radius": `${token.borderRadius}px`,
        } as CSSProperties
      }
    >
      <span className="admin-menu-arrow-strokes" />
    </span>
  );
}
