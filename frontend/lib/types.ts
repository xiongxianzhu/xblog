export type TagPublic = {
  id: number;
  name: string;
  slug: string;
};

export type PostSummary = {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_url: string | null;
  published_at: string | null;
  tags: TagPublic[];
};

export type PostPublic = PostSummary & {
  content_html: string;
};

export type PostAdmin = PostSummary & {
  content_md: string;
  status: "draft" | "published";
  created_at: string | null;
  updated_at: string | null;
};

export type PagePublic = {
  slug: string;
  title: string;
  content_html: string;
  updated_at: string | null;
};

export type FriendLinkPublic = {
  id: number;
  name: string;
  url: string;
  logo_url: string | null;
  sort_order: number;
};

export type UserPublic = {
  username: string;
};
