import type { HeaderLinkSettings } from "@xblog/contracts";
import { adminText } from "@/lib/admin-messages";
import type { SitePublicTheme } from "@/lib/themes";
import type { FriendLinkPublic, PagePublic, PaginatedPostList, PostPublic, PostSummary } from "@/lib/types";

export type { SitePublicTheme };

const API_PREFIX = "/api/v1";

/** 管理端始终通过同源 /api/v1 请求，认证由 HttpOnly Cookie 管理。 */
function getRequestOrigin(): string {
  return window.location.origin;
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
    const body = JSON.parse(text) as {
      msg?: string;
      message?: string;
      detail?: string;
    };
    return (
      body.msg ?? body.message ?? (typeof body.detail === "string" ? body.detail : undefined) ?? statusText
    );
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
  return typeof value === "object" && value !== null && "code" in value && "msg" in value && "data" in value;
}
function formatEnvelopeError(body: ApiEnvelope<unknown>): string {
  const { msg, data } = body;
  if (typeof data === "object" && data !== null && !Array.isArray(data)) {
    const record = data as {
      message?: string;
    };
    if (typeof record.message === "string" && record.message !== msg) {
      return record.message;
    }
  }
  if (Array.isArray(data)) {
    const parts = data
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const record = item as {
            msg?: string;
            loc?: unknown[];
          };
          if (typeof record.msg === "string") {
            const loc = Array.isArray(record.loc)
              ? record.loc.filter((part) => part !== "body").join(".")
              : "";
            return loc ? `${loc}: ${record.msg}` : record.msg;
          }
        }
        return null;
      })
      .filter((part): part is string => Boolean(part));
    if (parts.length) return parts.join("；");
  }
  return msg || adminText("m0764");
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
      throw new Error(response.statusText || adminText("m0764"));
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
    throw new Error(adminText("m0765"));
  }
  if (isApiEnvelope(body)) {
    if (body.code !== 0) {
      throw new ApiError(
        formatEnvelopeError(body as ApiEnvelope<unknown>),
        response.status,
        getEnvelopeData(body),
      );
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
  const response = await fetch(buildUrl(path, params), {
    ...init,
  });
  return parseResponse<T>(response);
}

/** 公开数据读取失败时使用调用者提供的回退值。 */
export async function fetchPublicSafe<T>(
  path: string,
  fallback: T,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  try {
    return await fetchPublic<T>(path, params);
  } catch {
    return fallback;
  }
}
export async function fetchAuth<T>(
  path: string,
  init?: RequestInit,
  retried = false,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;
  const response = await fetch(buildUrl(path, params), {
    ...init,
    credentials: "include",
    headers: isFormData
      ? {
          ...init?.headers,
        }
      : {
          "Content-Type": "application/json",
          ...init?.headers,
        },
  });
  if (response.status === 403) {
    const body = await response
      .clone()
      .json()
      .catch(() => null);
    if (
      body?.msg === "PASSWORD_CHANGE_REQUIRED" &&
      window.location.pathname !== "/admin/require-password-change"
    ) {
      window.location.assign("/admin/require-password-change");
    }
  }
  const shouldRefresh =
    response.status === 401 &&
    !retried &&
    path !== "/auth/login" &&
    path !== "/auth/login/sms" &&
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
      return fetchAuth<T>(path, init, true, params);
    }
  }
  return parseResponse<T>(response);
}
function normalizePostList(
  data: PaginatedPostList | PostSummary[],
  page: number,
  pageSize?: number,
): PaginatedPostList {
  if (Array.isArray(data)) {
    const effectivePageSize = pageSize ?? 10;
    const hasMore = data.length === effectivePageSize;
    return {
      items: data,
      total: hasMore ? page * effectivePageSize + 1 : (page - 1) * effectivePageSize + data.length,
      page,
      page_size: effectivePageSize,
    };
  }
  return {
    items: data.items ?? [],
    total: data.total ?? 0,
    page: data.page ?? page,
    page_size: data.page_size ?? pageSize ?? 10,
  };
}
export async function listPosts(page = 1, pageSize?: number): Promise<PaginatedPostList> {
  const params: Record<string, string | number | undefined> = {
    page,
  };
  if (pageSize !== undefined) {
    params.page_size = pageSize;
  }
  const fallbackPageSize = pageSize ?? 10;
  const data = await fetchPublicSafe<PaginatedPostList | PostSummary[]>(
    "/public/posts",
    {
      items: [],
      total: 0,
      page,
      page_size: fallbackPageSize,
    },
    params,
  );
  return normalizePostList(data, page, fallbackPageSize);
}
export function getPost(slug: string) {
  return fetchPublic<PostPublic>(`/public/posts/${slug}`);
}
export function listPostsByTag(slug: string, page = 1, pageSize = 10) {
  return fetchPublic<PostSummary[]>(`/public/tags/${encodeURIComponent(slug)}/posts`, {
    page,
    page_size: pageSize,
  });
}
export function searchPosts(q: string, page = 1, pageSize = 20) {
  return fetchPublic<PostSummary[]>(
    "/public/search",
    {
      q,
      page,
      page_size: pageSize,
    },
    {
      cache: "no-store",
    },
  );
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
  return fetchAuth<SitePublicTheme>("/admin/site-theme/logo", {
    method: "DELETE",
  });
}
export function recordPageView(path: string, referrer?: string) {
  return fetch(buildUrl("/public/pageviews"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      path,
      referrer,
    }),
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
  const path = username ? `/auth/login-guard?username=${encodeURIComponent(username)}` : "/auth/login-guard";
  return fetchAuth<LoginGuard>(path);
}
export type PasswordSmsChallenge = {
  sms_required: true;
  challenge_token: string;
  masked_phone: string;
  expires_in: number;
  delivery: "dev";
};
export function login(username: string, password: string, turnstileToken?: string) {
  return fetchAuth<{ username: string } | PasswordSmsChallenge>("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      username,
      password,
      ...(turnstileToken
        ? {
            turnstile_token: turnstileToken,
          }
        : {}),
    }),
  });
}
export function logout() {
  return fetchAuth<void>("/auth/logout", {
    method: "POST",
  });
}

export function highlightMarkdownCode(code: string, language: string, signal?: AbortSignal) {
  return fetchAuth<{ html: string }>("/admin/markdown/highlight", {
    method: "POST",
    body: JSON.stringify({ code, language }),
    signal,
  });
}
export function verifyPasswordSms(challengeToken: string, code: string) {
  return fetchAuth<{ username: string }>("/auth/login/sms", {
    method: "POST",
    body: JSON.stringify({ challenge_token: challengeToken, code }),
  });
}
export type LoginMethods = {
  sms: boolean;
  github: boolean;
  wechat: boolean;
};
export type AuthSettingsAdmin = {
  password_sms_enabled: boolean;
  password_sms_configured: boolean;
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
    Pick<
      AuthSettingsAdmin,
      "password_sms_enabled" | "sms_enabled" | "github_enabled" | "wechat_enabled" | "turnstile_enabled"
    >
  >,
) {
  return fetchAuth<AuthSettingsAdmin>("/admin/auth-settings", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
export function sendSmsLoginCode(phone: string) {
  return fetchAuth<{
    message: string;
  }>("/auth/sms/send-code", {
    method: "POST",
    body: JSON.stringify({
      phone,
    }),
  });
}
export function loginWithSms(phone: string, code: string) {
  return fetchAuth<{
    username: string;
  }>("/auth/sms/login", {
    method: "POST",
    body: JSON.stringify({
      phone,
      code,
    }),
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
  return fetchAuth<{
    message: string;
  }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({
      username,
      ...(turnstileToken
        ? {
            turnstile_token: turnstileToken,
          }
        : {}),
    }),
  });
}
export function resetPassword(token: string, newPassword: string) {
  return fetchAuth<void>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({
      token,
      new_password: newPassword,
    }),
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
  must_change_password: boolean;
  created_at: string | null;
  last_login_at: string | null;
};
export type ProfileGender = "male" | "female" | "other";
export type AdminUserMe = {
  username: string;
  must_change_password: boolean;
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
    body: JSON.stringify({
      phone,
    }),
  });
}
export function bindEmail(email: string) {
  return fetchAuth<AdminUserMe>("/auth/email", {
    method: "PATCH",
    body: JSON.stringify({
      email,
    }),
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
  return fetchAuth<{
    avatar_url: string;
  }>("/auth/avatar", {
    method: "POST",
    body: formData,
  });
}
export function deleteAvatar() {
  return fetchAuth<void>("/auth/avatar", {
    method: "DELETE",
  });
}
export function changePassword(currentPassword: string | undefined, newPassword: string) {
  return fetchAuth<void>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
}
export function listPageViewStats() {
  return fetchAuth<
    {
      path: string;
      count: number;
    }[]
  >("/admin/pageviews");
}
export type PaginatedUsers = PaginatedResponse<AdminUser> & {
  active_count: number;
};
export function listAdminUsers(
  page = 1,
  pageSize = 20,
  q?: string,
  filters: {
    is_active?: string;
    gender?: string;
    must_change_password?: string;
  } = {},
) {
  return fetchAuth<PaginatedUsers>("/admin/users", undefined, false, {
    page,
    page_size: pageSize,
    is_active: filters.is_active || undefined,
    gender: filters.gender || undefined,
    must_change_password: filters.must_change_password || undefined,
    q: q?.trim() || undefined,
  });
}
export type AdminUserPayload = {
  nickname: string | null;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  gender: ProfileGender | null;
};
export function getAdminUser(id: number) {
  return fetchAuth<AdminUser>(`/admin/users/${id}`);
}
export function createAdminUser(
  payload: AdminUserPayload & {
    username: string;
  },
) {
  return fetchAuth<AdminUser>("/admin/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
export function updateAdminUser(id: number, payload: AdminUserPayload) {
  return fetchAuth<AdminUser>(`/admin/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
export function resetAdminUserPassword(id: number) {
  return fetchAuth<{
    username: string;
    password: string;
  }>(`/admin/users/${id}/reset-password`, {
    method: "POST",
  });
}
export function updateAdminUserActive(id: number, is_active: boolean) {
  return fetchAuth<AdminUser>(`/admin/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      is_active,
    }),
  });
}
export function deleteAdminUser(id: number) {
  return fetchAuth<void>(`/admin/users/${id}`, {
    method: "DELETE",
  });
}
export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  page_size: number;
};
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
export function getLoginLog(id: number) {
  return fetchAuth<LoginLogAdmin>(`/admin/logs/login/${id}`);
}
export function getOperationLog(id: number) {
  return fetchAuth<OperationLogAdmin>(`/admin/logs/operations/${id}`);
}
export function listLoginLogs(
  page = 1,
  pageSize = 20,
  filters: {
    success?: string;
    method?: string;
    failure_reason?: string;
    q?: string;
    start_at?: string;
    end_at?: string;
  } = {},
) {
  return fetchAuth<PaginatedResponse<LoginLogAdmin>>("/admin/logs/login", undefined, false, {
    page,
    page_size: pageSize,
    q: filters.q?.trim() || undefined,
    start_at: filters.start_at || undefined,
    end_at: filters.end_at || undefined,
    success: filters.success || undefined,
    method: filters.method || undefined,
    failure_reason: filters.failure_reason || undefined,
  });
}
export function listOperationLogs(
  page = 1,
  pageSize = 20,
  filters: {
    action?: string;
    resource_type?: string;
    q?: string;
    start_at?: string;
    end_at?: string;
  } = {},
) {
  return fetchAuth<PaginatedResponse<OperationLogAdmin>>("/admin/logs/operations", undefined, false, {
    page,
    page_size: pageSize,
    q: filters.q?.trim() || undefined,
    start_at: filters.start_at || undefined,
    end_at: filters.end_at || undefined,
    action: filters.action || undefined,
    resource_type: filters.resource_type || undefined,
  });
}
export type PostStats = {
  total: number;
  published: number;
  draft: number;
};
export function getAdminPostStats() {
  return fetchAuth<PostStats>("/admin/posts/stats");
}
export function listAdminPosts(
  page = 1,
  pageSize = 20,
  q?: string,
  filters: {
    status?: string;
    is_pinned?: string;
  } = {},
) {
  return fetchAuth<PaginatedResponse<import("@/lib/types").PostAdmin>>("/admin/posts", undefined, false, {
    page,
    page_size: pageSize,
    status: filters.status || undefined,
    is_pinned: filters.is_pinned || undefined,
    q: q?.trim() || undefined,
  });
}
export function getAdminPost(id: number) {
  return fetchAuth<import("@/lib/types").PostAdmin>(`/admin/posts/${id}`);
}
export function uploadPostCover(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return fetchAuth<{
    cover_url: string;
  }>("/admin/posts/cover", {
    method: "POST",
    body: formData,
  });
}
export function deletePostCover(coverUrl: string) {
  return fetchAuth<{
    message: string;
  }>(`/admin/posts/cover?cover_url=${encodeURIComponent(coverUrl)}`, {
    method: "DELETE",
  });
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
  return fetchAuth<{
    message: string;
  }>(`/admin/posts/${id}`, {
    method: "DELETE",
  });
}
export function listAdminLinks() {
  return fetchAuth<FriendLinkPublic[]>("/admin/links");
}
export function getAdminLink(id: number) {
  return fetchAuth<FriendLinkPublic>(`/admin/links/${id}`);
}
export function createAdminLink(payload: {
  name: string;
  url: string;
  logo_url: string;
  description?: string | null;
  sort_order?: number;
}) {
  return fetchAuth<FriendLinkPublic>("/admin/links", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
export function updateAdminLink(
  id: number,
  payload: {
    name?: string;
    url?: string;
    logo_url?: string;
    description?: string | null;
    sort_order?: number;
  },
) {
  return fetchAuth<FriendLinkPublic>(`/admin/links/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
export function uploadFriendLinkLogo(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return fetchAuth<{
    logo_url: string;
  }>("/admin/links/logo", {
    method: "POST",
    body: formData,
  });
}
export function deleteFriendLinkLogo(logoUrl: string) {
  return fetchAuth<{
    message: string;
  }>(`/admin/links/logo?logo_url=${encodeURIComponent(logoUrl)}`, {
    method: "DELETE",
    keepalive: true,
  });
}
export function deleteAdminLink(id: number) {
  return fetchAuth<{
    message: string;
  }>(`/admin/links/${id}`, {
    method: "DELETE",
  });
}
export function getAdminPage(slug: string) {
  return fetchAuth<{
    slug: string;
    title: string;
    content_md: string;
    updated_at: string | null;
  }>(`/admin/pages/${slug}`);
}
export function updateAdminPage(
  slug: string,
  payload: {
    title?: string;
    content_md?: string;
  },
) {
  return fetchAuth<{
    slug: string;
    title: string;
    content_md: string;
    updated_at: string | null;
  }>(`/admin/pages/${slug}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
export function getHeaderLink() {
  return fetchAuth<HeaderLinkSettings>("/admin/header-link");
}
export function saveHeaderLink(payload: HeaderLinkSettings) {
  return fetchAuth<HeaderLinkSettings>("/admin/header-link", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
export function importMarkdownPosts(files: File[]) {
  const body = new FormData();
  for (const file of files) body.append("files", file);
  return fetchAuth<import("@xblog/contracts").PostImportReport>("/admin/posts/import-markdown", {
    method: "POST",
    body,
  });
}
export async function exportMarkdownPosts(postId?: number): Promise<Blob> {
  const path =
    postId === undefined ? "/admin/posts/export-markdown" : `/admin/posts/${postId}/export-markdown`;
  const response = await fetch(buildUrl(path), {
    credentials: "include",
  });
  if (!response.ok) await parseResponse<never>(response);
  return response.blob();
}
