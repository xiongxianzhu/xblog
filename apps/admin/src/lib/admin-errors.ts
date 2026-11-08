import { adminErrorText, translatedAdminNotice } from "@/lib/admin-messages";

type ErrorKey = Parameters<typeof adminErrorText>[0];
const errors: Record<string, ErrorKey> = {
  "Invalid credentials": "credentials",
  "User is disabled": "disabled",
  "User not found": "notFound",
  "Post not found": "notFound",
  "Page not found": "notFound",
  "Friend link not found": "notFound",
  "Slug already exists": "slugExists",
  "Username already exists": "usernameExists",
  "Email is already linked": "emailExists",
  "Phone number is already linked": "phoneExists",
  "Invalid phone number": "invalidPhone",
  "Current password is incorrect": "currentPassword",
  "Invalid or expired reset token": "tokenExpired",
  "Unsupported image type": "imageType",
  "Empty file": "emptyFile",
  "File too large": "fileSize",
  "Captcha required": "captcha",
  "Captcha verification failed": "captchaFailed",
  素材文件不存在: "notFound",
  素材不存在: "notFound",
  请选择当前素材类型下的有效分组: "invalidGroup",
  不能上传空文件: "emptyFile",
  "若手机号已绑定管理员账号，验证码已发送。": "smsSent",
  "若账号存在且已绑定邮箱，你将收到重置密码邮件。": "resetSent",
  导入成功: "imported",
  "文章路径已存在，未覆盖。": "importSkipped",
  "数据冲突，导入失败，请重试。": "importConflict",
  "文件不是 UTF-8 编码，请转换后重试。": "utf8",
  "文章头部 YAML 格式无效。": "yaml",
  "标题和文章路径不能为空。": "emptyTitle",
  "ZIP 已损坏、已加密或使用不支持的压缩格式。": "zip",
  "ZIP 含有不安全的文件路径。": "zipPath",
  "没有找到可导入的 Markdown 文件。": "noMarkdown",
};

/** Translate known server failures; unknown diagnostics stay out of user-facing prose. */
export function getAdminErrorMessage(error: unknown, fallback: ErrorKey = "requestFailed"): string {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  if (errors[message]) return adminErrorText(errors[message]);
  const translated = translatedAdminNotice(message);
  if (translated !== undefined) return translated;
  if (error instanceof TypeError) return adminErrorText("network");
  const status = typeof error === "object" && error !== null && "status" in error ? error.status : null;
  if (status === 401) return adminErrorText("unauthorized");
  if (status === 403) return adminErrorText("forbidden");
  if (status === 404) return adminErrorText("notFound");
  if (status === 409) return adminErrorText("conflict");
  if (status === 413) return adminErrorText("fileSize");
  if (status === 429) return adminErrorText("rateLimit");
  if (status === 422) return adminErrorText("validation");
  if (/元信息|YAML/.test(message)) return adminErrorText("metadata");
  if (/仍被|正在被|引用/.test(message)) return adminErrorText("mediaReferenced");
  if (/至少.*管理员|last.*admin/i.test(message)) return adminErrorText("lastAdmin");
  if (/超过.*(?:MB|KB)|too large|大小超过/.test(message)) return adminErrorText("fileSize");
  if (/文件格式|压缩格式/.test(message)) return adminErrorText("fileType");
  return adminErrorText(fallback);
}
