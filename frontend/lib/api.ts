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

function parseApiError(text: string, statusText: string): string {
  try {
    const body = JSON.parse(text) as { message?: string; detail?: string };
    return body.message ?? body.detail ?? statusText;
  } catch {
    return text || statusText;
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(parseApiError(text, response.statusText));
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
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
    path !== "/auth/refresh";

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

export function updateAdminSiteTheme(payload: Partial<SitePublicTheme> & Pick<SitePublicTheme, "mode" | "palette">) {
  return fetchAuth<SitePublicTheme>("/admin/site-theme", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function recordPageView(path: string, referrer?: string) {
  return fetch(buildUrl("/public/pageviews"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, referrer }),
  });
}

export function login(username: string, password: string) {
  return fetchAuth<{ username: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function logout() {
  return fetchAuth<void>("/auth/logout", { method: "POST" });
}

export type AdminUser = {
  id: number;
  username: string;
  avatar_url: string | null;
  created_at: string | null;
  last_login_at: string | null;
};

export type AdminUserMe = {
  username: string;
  avatar_url: string | null;
};

export function getMe() {
  return fetchAuth<AdminUserMe>("/auth/me");
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
