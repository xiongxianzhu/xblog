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
  is_pinned: boolean;
  tags: TagPublic[];
};

export type PostNeighbor = {
  title: string;
  slug: string;
  published_at: string | null;
};

export type PaginatedPostList = {
  items: PostSummary[];
  total: number;
  page: number;
  page_size: number;
};

export type PostPublic = PostSummary & {
  content_html: string;
  previous_post: PostNeighbor | null;
  next_post: PostNeighbor | null;
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
  description: string | null;
  sort_order: number;
};

export type UserPublic = {
  username: string;
};
