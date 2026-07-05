import { resolvePublicAssetUrl } from "@/lib/public-asset-url";

type ArticleCoverProps = {
  src: string;
  alt: string;
  priority?: boolean;
};

export function ArticleCover({ src, alt, priority = false }: ArticleCoverProps) {
  const resolvedSrc = resolvePublicAssetUrl(src);
  if (!resolvedSrc) return null;

  return (
    <div className="article-cover mb-8 overflow-hidden border border-border/60">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolvedSrc}
        alt={alt}
        className="block aspect-[21/9] min-h-[12rem] w-full object-cover sm:min-h-[14rem]"
        loading={priority ? "eager" : "lazy"}
        decoding="async"
      />
    </div>
  );
}
