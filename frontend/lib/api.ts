import type {
  FriendLinkPublic,
  PagePublic,
  PostPublic,
  PostSummary,
} from "@/lib/types";
import type { SitePublicTheme } from "@/lib/themes";
import { DEFAULT_SITE_THEME } from "@/lib/themes";

export type { SitePublicTheme };

const API_PREFIX = "/api/v1";

/** 浏览器用当前页面 origin（:3000）；服务端组件直连 backend（:8000）。 */
function getRequestOrigin(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
}

function buildUrl(path: string, params?: Record<string, string | number | undefined>): string {
  const url = new URL(`${API_PREFIX}${path}`, getRequestOrigin());
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

/** AI SSE 等场景使用（不经过 fetchAuth JSON 解析）。 */
export function buildUrlForAi(path: string): string {
  return buildUrl(path);
}

function parseApiError(text: string, statusText: string): string {
  try {
    const body = JSON.parse(text) as { msg?: string; message?: string; detail?: string };
    return body.msg ?? body.message ?? (typeof body.detail === "string" ? body.detail : undefined) ?? statusText;
  } catch {
    return text || statusText;
  }
}

type ApiEnvelope<T = unknown> = {
  code: number;
  msg: string;
  data: T;
};

function isApiEnvelope(value: unknown): value is ApiEnvelope {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "msg" in value &&
    "data" in value
  );
}

function formatEnvelopeError(body: ApiEnvelope<unknown>): string {
  const { msg, data } = body;
  if (typeof data === "object" && data !== null && !Array.isArray(data)) {
    const record = data as { message?: string };
    if (typeof record.message === "string" && record.message !== msg) {
      return record.message;
    }
  }
  if (Array.isArray(data)) {
    const parts = data.map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        const record = item as { msg?: string; loc?: unknown[] };
        if (typeof record.msg === "string") {
          const loc = Array.isArray(record.loc) ? record.loc.filter((part) => part !== "body").join(".") : "";
          return loc ? `${loc}: ${record.msg}` : record.msg;
        }
      }
      return null;
    }).filter((part): part is string => Boolean(part));
    if (parts.length) return parts.join("；");
  }
  return msg || "请求失败";
}

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

function getEnvelopeData(body: ApiEnvelope<unknown>): unknown {
  return body.data;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    if (!response.ok) {
      throw new Error(response.statusText || "请求失败");
    }
    return undefined as T;
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    if (!response.ok) {
      throw new Error(text || response.statusText);
    }
    throw new Error("响应格式无效");
  }

  if (isApiEnvelope(body)) {
    if (body.code !== 0) {
      throw new ApiError(formatEnvelopeError(body as ApiEnvelope<unknown>), response.status, getEnvelopeData(body));
    }
    return body.data as T;
  }

  if (!response.ok) {
    throw new Error(parseApiError(text, response.statusText));
  }

  return body as T;
}

export async function fetchPublic<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
  init?: RequestInit,
): Promise<T> {
  const isServer = typeof window === "undefined";
  const response = await fetch(buildUrl(path, params), {
    ...init,
    ...(isServer ? { next: { revalidate: 3600, ...(init as { next?: { revalidate?: number } })?.next } } : {}),
  });
  return parseResponse<T>(response);
}

/** 构建阶段 API 不可用时返回 fallback，避免 `next build` 失败。 */
export async function fetchPublicSafe<T>(path: string, fallback: T, params?: Record<string, string | number | undefined>): Promise<T> {
  try {
    return await fetchPublic<T>(path, params);
  } catch {
    return fallback;
  }
}

export async function fetchAuth<T>(path: string, init?: RequestInit, retried = false): Promise<T> {
  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;
  const response = await fetch(buildUrl(path), {
    ...init,
    credentials: "include",
    headers: isFormData
      ? { ...init?.headers }
      : {
          "Content-Type": "application/json",
          ...init?.headers,
        },
  });

  const shouldRefresh =
    response.status === 401 &&
    !retried &&
    path !== "/auth/login" &&
    path !== "/auth/logout" &&
    path !== "/auth/refresh" &&
    path !== "/auth/forgot-password" &&
    path !== "/auth/reset-password" &&
    path !== "/auth/oauth/providers" &&
    path !== "/auth/login-methods" &&
    path !== "/auth/login-guard" &&
    path !== "/auth/sms/send-code" &&
    path !== "/auth/sms/login";

  if (shouldRefresh) {
    const refreshResponse = await fetch(buildUrl("/auth/refresh"), {
      method: "POST",
      credentials: "include",
    });
    if (refreshResponse.ok) {
      return fetchAuth<T>(path, init, true);
    }
  }

  return parseResponse<T>(response);
}

export function listPosts(page = 1, pageSize = 10) {
  return fetchPublicSafe<PostSummary[]>("/public/posts", [], { page, page_size: pageSize });
}

export function getPost(slug: string) {
  return fetchPublic<PostPublic>(`/public/posts/${slug}`);
}

export function listPostsByTag(slug: string, page = 1, pageSize = 10) {
  return fetchPublic<PostSummary[]>(`/public/tags/${slug}/posts`, { page, page_size: pageSize });
}

export function searchPosts(q: string, page = 1, pageSize = 10) {
  return fetchPublic<PostSummary[]>("/public/search", { q, page, page_size: pageSize });
}

export function getPage(slug: string) {
  return fetchPublic<PagePublic>(`/public/pages/${slug}`);
}

export function listLinks() {
  return fetchPublicSafe<FriendLinkPublic[]>("/public/links", []);
}

export function getAdminSiteTheme() {
  return fetchAuth<SitePublicTheme>("/admin/site-theme");
}

export function getPublicSiteThemeClient() {
  return fetchPublic<SitePublicTheme>("/public/site-theme");
}

export function updateAdminSiteTheme(payload: Partial<SitePublicTheme>) {
  return fetchAuth<SitePublicTheme>("/admin/site-theme", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function uploadSiteLogo(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return fetchAuth<SitePublicTheme>("/admin/site-theme/logo", {
    method: "POST",
    body: formData,
  });
}

export function deleteSiteLogo() {
  return fetchAuth<SitePublicTheme>("/admin/site-theme/logo", { method: "DELETE" });
}

export function recordPageView(path: string, referrer?: string) {
  return fetch(buildUrl("/public/pageviews"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, referrer }),
  });
}

export type LoginGuard = {
  captcha_required: boolean;
  captcha_enabled: boolean;
  site_key: string | null;
  locked: boolean;
  retry_after_seconds: number | null;
  failure_count: number;
};

export function getLoginGuard(username?: string) {
  const path = username
    ? `/auth/login-guard?username=${encodeURIComponent(username)}`
    : "/auth/login-guard";
  return fetchAuth<LoginGuard>(path);
}

export function login(username: string, password: string, turnstileToken?: string) {
  return fetchAuth<{ username: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      username,
      password,
      ...(turnstileToken ? { turnstile_token: turnstileToken } : {}),
    }),
  });
}

export function logout() {
  return fetchAuth<void>("/auth/logout", { method: "POST" });
}

export type LoginMethods = {
  sms: boolean;
  github: boolean;
  wechat: boolean;
};

export type AuthSettingsAdmin = {
  sms_enabled: boolean;
  sms_configured: boolean;
  github_enabled: boolean;
  github_configured: boolean;
  wechat_enabled: boolean;
  wechat_configured: boolean;
  turnstile_enabled: boolean;
  turnstile_configured: boolean;
};

export function getLoginMethods() {
  return fetchPublic<LoginMethods>("/auth/login-methods");
}

export function getAdminAuthSettings() {
  return fetchAuth<AuthSettingsAdmin>("/admin/auth-settings");
}

export function updateAdminAuthSettings(
  payload: Partial<
    Pick<AuthSettingsAdmin, "sms_enabled" | "github_enabled" | "wechat_enabled" | "turnstile_enabled">
  >,
) {
  return fetchAuth<AuthSettingsAdmin>("/admin/auth-settings", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function sendSmsLoginCode(phone: string) {
  return fetchAuth<{ message: string }>("/auth/sms/send-code", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
}

export function loginWithSms(phone: string, code: string) {
  return fetchAuth<{ username: string }>("/auth/sms/login", {
    method: "POST",
    body: JSON.stringify({ phone, code }),
  });
}

export type OAuthProviders = {
  github: boolean;
  wechat: boolean;
};

export function getOAuthProviders() {
  return fetchPublic<OAuthProviders>("/auth/oauth/providers");
}

export function getOAuthLinks() {
  return fetchAuth<OAuthProviders>("/auth/oauth/links");
}

export function forgotPassword(username: string, turnstileToken?: string) {
  return fetchAuth<{ message: string }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({
      username,
      ...(turnstileToken ? { turnstile_token: turnstileToken } : {}),
    }),
  });
}

export function resetPassword(token: string, newPassword: string) {
  return fetchAuth<void>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, new_password: newPassword }),
  });
}

export function oauthLoginUrl(provider: "github" | "wechat") {
  return buildUrl(`/auth/oauth/${provider}/start`);
}

export function oauthBindUrl(provider: "github" | "wechat") {
  return buildUrl(`/auth/oauth/${provider}/bind/start`);
}

export type AdminUser = {
  id: number;
  username: string;
  nickname: string | null;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  gender: ProfileGender | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string | null;
  last_login_at: string | null;
};

export type ProfileGender = "male" | "female" | "other";

export type AdminUserMe = {
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  phone: string | null;
  email: string | null;
  birth_date: string | null;
  gender: ProfileGender | null;
};

export type ProfileUpdatePayload = {
  nickname?: string | null;
  birth_date?: string | null;
  gender?: ProfileGender | null;
};

export function getMe() {
  return fetchAuth<AdminUserMe>("/auth/me");
}

export function bindPhone(phone: string) {
  return fetchAuth<AdminUserMe>("/auth/phone", {
    method: "PATCH",
    body: JSON.stringify({ phone }),
  });
}

export function bindEmail(email: string) {
  return fetchAuth<AdminUserMe>("/auth/email", {
    method: "PATCH",
    body: JSON.stringify({ email }),
  });
}

export function updateProfile(payload: ProfileUpdatePayload) {
  return fetchAuth<AdminUserMe>("/auth/profile", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function uploadAvatar(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return fetchAuth<{ avatar_url: string }>("/auth/avatar", {
    method: "POST",
    body: formData,
  });
}

export function deleteAvatar() {
  return fetchAuth<void>("/auth/avatar", { method: "DELETE" });
}

export function changePassword(currentPassword: string, newPassword: string) {
  return fetchAuth<void>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
}

export function listPageViewStats() {
  return fetchAuth<{ path: string; count: number }[]>("/admin/pageviews");
}

export function listAdminUsers() {
  return fetchAuth<AdminUser[]>("/admin/users");
}

export function updateAdminUserActive(id: number, is_active: boolean) {
  return fetchAuth<AdminUser>(`/admin/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ is_active }),
  });
}

export function deleteAdminUser(id: number) {
  return fetchAuth<void>(`/admin/users/${id}`, { method: "DELETE" });
}

export type LoginLogAdmin = {
  id: number;
  user_id: number | null;
  username: string;
  method: string;
  success: boolean;
  failure_reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string | null;
};

export type OperationLogAdmin = {
  id: number;
  user_id: number | null;
  username: string;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  detail: string | null;
  ip_address: string | null;
  created_at: string | null;
};

export function listLoginLogs() {
  return fetchAuth<LoginLogAdmin[]>("/admin/logs/login");
}

export function listOperationLogs() {
  return fetchAuth<OperationLogAdmin[]>("/admin/logs/operations");
}

export function listAdminPosts() {
  return fetchAuth<import("@/lib/types").PostAdmin[]>("/admin/posts");
}

export function getAdminPost(id: number) {
  return fetchAuth<import("@/lib/types").PostAdmin>(`/admin/posts/${id}`);
}

export function createPost(payload: Record<string, unknown>) {
  return fetchAuth<import("@/lib/types").PostAdmin>("/admin/posts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updatePost(id: number, payload: Record<string, unknown>) {
  return fetchAuth<import("@/lib/types").PostAdmin>(`/admin/posts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deletePost(id: number) {
  return fetchAuth<{ message: string }>(`/admin/posts/${id}`, { method: "DELETE" });
}

export function listAdminLinks() {
  return fetchAuth<FriendLinkPublic[]>("/admin/links");
}

export function createAdminLink(payload: {
  name: string;
  url: string;
  logo_url?: string | null;
  sort_order?: number;
}) {
  return fetchAuth<FriendLinkPublic>("/admin/links", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateAdminLink(
  id: number,
  payload: { name?: string; url?: string; logo_url?: string | null; sort_order?: number },
) {
  return fetchAuth<FriendLinkPublic>(`/admin/links/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteAdminLink(id: number) {
  return fetchAuth<{ message: string }>(`/admin/links/${id}`, { method: "DELETE" });
}

export function getAdminPage(slug: string) {
  return fetchAuth<{ slug: string; title: string; content_md: string; updated_at: string | null }>(
    `/admin/pages/${slug}`,
  );
}

export function updateAdminPage(slug: string, payload: { title?: string; content_md?: string }) {
  return fetchAuth<{ slug: string; title: string; content_md: string; updated_at: string | null }>(
    `/admin/pages/${slug}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}
