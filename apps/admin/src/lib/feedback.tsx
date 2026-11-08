import { App } from "antd";
import { useEffect } from "react";
import { localizeAdminNotice } from "@/lib/admin-messages";
import { useAdminMessages } from "@/lib/use-admin-messages";

type Options = { duration?: number; description?: string; id?: string };
type Notice = Options & { type: "success" | "error" | "info" | "warning"; content: string };
let emit: (notice: Notice) => void = () => {};
const notice = (type: Notice["type"]) => (content: string, options?: Options) =>
  emit({ type, content, ...options });
export const toast = {
  success: notice("success"),
  error: notice("error"),
  info: notice("info"),
  warning: notice("warning"),
};
function NoticeContent({ content, description }: { content: string; description?: string }) {
  useAdminMessages();
  return (
    <>
      {localizeAdminNotice(content)}
      {description ? ` — ${localizeAdminNotice(description)}` : ""}
    </>
  );
}
export function FeedbackBridge() {
  const { message } = App.useApp();
  useEffect(() => {
    emit = ({ duration, description, id, ...notice }) => {
      void message.open({
        ...notice,
        key: id,
        content: <NoticeContent content={notice.content} description={description} />,
        duration: duration ? duration / 1000 : 3,
      });
    };
    return () => {
      emit = () => {};
    };
  }, [message]);
  return null;
}
