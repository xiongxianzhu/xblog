import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8000";

/** 将 AI complete SSE 原样透传，避免 rewrite 缓冲导致无法流式显示。 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const cookie = request.headers.get("cookie") ?? "";

  const backendResponse = await fetch(`${backendUrl}/api/v1/admin/ai/complete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      Cookie: cookie,
    },
    body,
  });

  if (!backendResponse.ok) {
    const text = await backendResponse.text();
    return new Response(text, {
      status: backendResponse.status,
      headers: { "Content-Type": backendResponse.headers.get("content-type") ?? "text/plain" },
    });
  }

  if (!backendResponse.body) {
    return new Response("无法读取流式响应", { status: 502 });
  }

  return new Response(backendResponse.body, {
    status: backendResponse.status,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
