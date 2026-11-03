import type { SitePublicTheme } from "@/lib/themes";
import type { FriendLinkPublic, PagePublic, PaginatedPostList, PostPublic, PostSummary } from "@/lib/types";

export type { SitePublicTheme };

const API_PREFIX = "/api/v1";

/** 浏览器用当前页面 origin（:10241）；服务端组件直连 backend（:10242）。 */
function getRequestOrigin(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:10242";
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
    const body = JSON.parse(text) as { msg?: string; message?: string; detail?: string };
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
    const record = data as { message?: string };
    if (typeof record.message === "string" && record.message !== msg) {
      return record.message;
    }
  }
  if (Array.isArray(data)) {
    const parts = data
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const record = item as { msg?: string; loc?: unknown[] };
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
  const isServer = typeof window === "undefined";
  const response = await fetch(buildUrl(path, params), {
    ...init,
    signal: init?.signal ?? (isServer ? AbortSignal.timeout(10_000) : undefined),
    ...(isServer
      ? { next: { revalidate: 3600, ...(init as { next?: { revalidate?: number } })?.next } }
      : {}),
  });
  return parseResponse<T>(response);
}

/** 构建阶段 API 不可用时返回 fallback，避免 `next build` 失败。 */
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
  const params: Record<string, string | number | undefined> = { page };
  if (pageSize !== undefined) {
    params.page_size = pageSize;
  }
  const fallbackPageSize = pageSize ?? 10;
  const data = await fetchPublicSafe<PaginatedPostList | PostSummary[]>(
    "/public/posts",
    { items: [], total: 0, page, page_size: fallbackPageSize },
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
    { q, page, page_size: pageSize },
    { cache: "no-store" },
  );
}

export function getPage(slug: string) {
  return fetchPublic<PagePublic>(`/public/pages/${slug}`);
}

export function listLinks() {
  return fetchPublicSafe<FriendLinkPublic[]>("/public/links", []);
}

export function recordPageView(path: string, referrer?: string) {
  return fetch(buildUrl("/public/pageviews"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, referrer }),
  });
}

/** Feed endpoints request multiple valid pages instead of exceeding the API's 50-item limit. */
export async function listPostsForFeed(limit: number): Promise<PostSummary[]> {
  const pageSize = Math.min(50, limit);
  if (pageSize <= 0) return [];
  const first = await listPosts(1, pageSize);
  const pageCount = Math.ceil(Math.min(first.total, limit) / pageSize);
  const remaining = await Promise.all(
    Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) => listPosts(index + 2, pageSize)),
  );
  return [first, ...remaining].flatMap((page) => page.items).slice(0, limit);
}
