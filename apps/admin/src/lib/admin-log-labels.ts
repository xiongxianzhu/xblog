import { adminText } from "@/lib/admin-messages";
export const LOGIN_METHOD_LABELS: Record<string, string> = {
  get password() {
    return adminText("m0751");
  },
  get sms() {
    return adminText("m0752");
  },
  oauth_github: "GitHub",
  get oauth_wechat() {
    return adminText("m0753");
  },
};
export const LOGIN_FAILURE_LABELS: Record<string, string> = {
  get invalid_credentials() {
    return adminText("m0754");
  },
  get invalid_code() {
    return adminText("m0755");
  },
  get user_disabled() {
    return adminText("m0262");
  },
  get oauth_failed() {
    return adminText("m0756");
  },
  get oauth_not_linked() {
    return adminText("m0757");
  },
  get oauth_already_linked() {
    return adminText("m0758");
  },
};
export const OPERATION_ACTION_LABELS: Record<string, string> = {
  get "user.create"() {
    return adminText("m0280");
  },
  get "user.update"() {
    return adminText("m0279");
  },
  get "user.reset_password"() {
    return adminText("m0010");
  },
  get "user.enable"() {
    return adminText("m0759");
  },
  get "user.disable"() {
    return adminText("m0760");
  },
  get "user.delete"() {
    return adminText("m0306");
  },
};
export function loginMethodLabel(method: string) {
  return LOGIN_METHOD_LABELS[method] ?? method;
}
export function loginFailureLabel(reason: string | null | undefined) {
  if (!reason) return "-";
  return LOGIN_FAILURE_LABELS[reason] ?? reason;
}
export function operationActionLabel(action: string) {
  return OPERATION_ACTION_LABELS[action] ?? action;
}
