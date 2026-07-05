export const LOGIN_METHOD_LABELS: Record<string, string> = {
  password: "密码",
  sms: "短信",
  oauth_github: "GitHub",
  oauth_wechat: "微信",
};

export const LOGIN_FAILURE_LABELS: Record<string, string> = {
  invalid_credentials: "账号或密码错误",
  invalid_code: "验证码无效",
  user_disabled: "账号已禁用",
  oauth_failed: "OAuth 失败",
  oauth_not_linked: "未绑定管理员",
  oauth_already_linked: "已绑定其他账号",
};

export const OPERATION_ACTION_LABELS: Record<string, string> = {
  "user.enable": "启用用户",
  "user.disable": "禁用用户",
  "user.delete": "删除用户",
};

export function loginMethodLabel(method: string) {
  return LOGIN_METHOD_LABELS[method] ?? method;
}

export function loginFailureLabel(reason: string | null | undefined) {
  if (!reason) return "—";
  return LOGIN_FAILURE_LABELS[reason] ?? reason;
}

export function operationActionLabel(action: string) {
  return OPERATION_ACTION_LABELS[action] ?? action;
}
