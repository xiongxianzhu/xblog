import { NextResponse } from "next/server";

import { resolvePublicAssetUrl } from "@/lib/public-asset-url";
import { getPublicSiteTheme } from "@/lib/site-theme";

export const dynamic = "force-dynamic";

function getBackendOrigin(): string {
  return process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
}

async function fetchLogo(sourceUrl: string) {
  const fetchUrl = sourceUrl.startsWith("/") ? `${getBackendOrigin()}${sourceUrl}` : sourceUrl;
  return fetch(fetchUrl, { cache: "no-store" });
}

export async function GET() {
  const theme = await getPublicSiteTheme();
  const logoUrl = resolvePublicAssetUrl(theme.site_logo_url);

  if (!logoUrl) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const upstream = await fetchLogo(logoUrl);
    if (!upstream.ok) {
      return new NextResponse(null, { status: upstream.status });
    }

    const contentType = upstream.headers.get("content-type") ?? "image/png";
    const buffer = await upstream.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=0, must-revalidate",
        ETag: `"${logoUrl}"`,
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
