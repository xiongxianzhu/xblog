import { fetchAuth, buildUrlForAi } from "@/lib/api";

export type AiProviderType =
  | "openai"
  | "deepseek"
  | "zhipu"
  | "glm_coding"
  | "minimax"
  | "anthropic"
  | "openai_compatible";

export type AiProvider = {
  id: string;
  name: string;
  provider_type: AiProviderType;
  base_url: string;
  model: string;
  has_api_key: boolean;
  enabled: boolean;
  is_default: boolean;
  extra_headers: Record<string, string> | null;
  created_at: string | null;
  updated_at: string | null;
};

export type AiSkill = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  is_builtin: boolean;
  created_at: string | null;
  updated_at: string | null;
};

export type AiSkillDefaults = {
  polish: string | null;
  chat: string | null;
  generate: string | null;
};

export type AiCompleteAction = "polish" | "expand" | "shorten" | "title" | "chat" | "generate";

export type AiChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AiStatus = {
  enabled_providers: number;
  enabled_skills: number;
};

export const PROVIDER_TEMPLATES: Record<
  AiProviderType,
  { label: string; base_url: string; model: string }
> = {
  openai: {
    label: "OpenAI",
    base_url: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
  },
  deepseek: {
    label: "DeepSeek",
    base_url: "https://api.deepseek.com",
    model: "deepseek-chat",
  },
  zhipu: {
    label: "智谱 GLM",
    base_url: "https://open.bigmodel.cn/api/paas/v4",
    model: "glm-4-flash",
  },
  glm_coding: {
    label: "GLM Coding",
    base_url: "https://open.bigmodel.cn/api/coding/paas/v4",
    model: "glm-4.7",
  },
  anthropic: {
    label: "Anthropic",
    base_url: "https://api.anthropic.com",
    model: "claude-sonnet-4-20250514",
  },
  minimax: {
    label: "MiniMax",
    base_url: "https://api.minimax.chat/v1",
    model: "MiniMax-Text-01",
  },
  openai_compatible: {
    label: "OpenAI 兼容",
    base_url: "https://api.example.com/v1",
    model: "your-model",
  },
};

/** 提供商类型 → 界面显示名称（与 PROVIDER_TEMPLATES.label 同源） */
export function getProviderTypeLabel(type: AiProviderType | string): string {
  const template = PROVIDER_TEMPLATES[type as AiProviderType];
  return template?.label ?? type;
}

export function listAiProviders() {
  return fetchAuth<AiProvider[]>("/admin/ai/providers");
}

export function getAiStatus() {
  return fetchAuth<AiStatus>("/admin/ai/status");
}

export function createAiProvider(payload: Record<string, unknown>) {
  return fetchAuth<AiProvider>("/admin/ai/providers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateAiProvider(id: string, payload: Record<string, unknown>) {
  return fetchAuth<AiProvider>(`/admin/ai/providers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteAiProvider(id: string) {
  return fetchAuth<{ message: string }>(`/admin/ai/providers/${id}`, { method: "DELETE" });
}

export function testAiProvider(id: string) {
  return fetchAuth<{ ok: boolean; latency_ms: number; message: string }>(`/admin/ai/providers/${id}/test`, {
    method: "POST",
  });
}

export function listAiSkills() {
  return fetchAuth<AiSkill[]>("/admin/ai/skills");
}

export function createAiSkill(payload: { name: string; description: string; enabled?: boolean }) {
  return fetchAuth<AiSkill>("/admin/ai/skills", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateAiSkill(id: string, payload: Record<string, unknown>) {
  return fetchAuth<AiSkill>(`/admin/ai/skills/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteAiSkill(id: string) {
  return fetchAuth<{ message: string }>(`/admin/ai/skills/${id}`, { method: "DELETE" });
}

export function uploadAiSkill(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return fetchAuth<AiSkill>("/admin/ai/skills/upload", {
    method: "POST",
    body: formData,
  });
}

export function getAiSkillContent(id: string) {
  return fetchAuth<{ content: string }>(`/admin/ai/skills/${id}/content`);
}

export function updateAiSkillContent(id: string, content: string) {
  return fetchAuth<{ content: string }>(`/admin/ai/skills/${id}/content`, {
    method: "PATCH",
    body: JSON.stringify({ content }),
  });
}

export function getAiSkillDefaults() {
  return fetchAuth<AiSkillDefaults>("/admin/ai/skill-defaults");
}

export function updateAiSkillDefaults(payload: Partial<AiSkillDefaults>) {
  return fetchAuth<AiSkillDefaults>("/admin/ai/skill-defaults", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function getAiSkillRecommend(action: "chat" | "polish" | "generate" = "chat", text = "") {
  const params = new URLSearchParams({ action, text });
  return fetchAuth<{ skill_id: string | null; skill_name: string | null }>(
    `/admin/ai/recommend?${params.toString()}`,
  );
}

type StreamHandlers = {
  onDelta: (content: string) => void;
  onThinkingDelta?: (content: string) => void;
  onDone?: (meta: { skill_id?: string | null; skill_name?: string | null }) => void;
  onError?: (message: string) => void;
};

type StreamPayload = {
  action: AiCompleteAction;
  provider_id?: string | null;
  skill_id?: string | null;
  selection?: { text: string };
  messages?: AiChatMessage[];
  document?: { title: string; content_md: string };
  generate?: { topic: string; outline?: string };
};

export async function streamAiComplete(payload: StreamPayload, handlers: StreamHandlers): Promise<void> {
  const response = await fetch(buildUrlForAi("/admin/ai/complete"), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      "Cache-Control": "no-cache",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("无法读取流式响应");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    buffer = consumeSseBuffer(buffer, handlers);
  }

  buffer += decoder.decode();
  if (buffer.trim()) {
    consumeSseBuffer(`${buffer}\n\n`, handlers);
  }
}

function consumeSseBuffer(buffer: string, handlers: StreamHandlers): string {
  let boundary = buffer.indexOf("\n\n");
  while (boundary !== -1) {
    const rawEvent = buffer.slice(0, boundary);
    buffer = buffer.slice(boundary + 2);
    parseSseEvent(rawEvent, handlers);
    boundary = buffer.indexOf("\n\n");
  }
  return buffer;
}

function parseSseEvent(raw: string, handlers: StreamHandlers) {
  let event = "message";
  const dataLines: string[] = [];
  for (const line of raw.split("\n")) {
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
  }
  const data = dataLines.join("\n");
  if (!data) return;
  try {
    const parsed = JSON.parse(data) as {
      content?: string;
      message?: string;
      skill_id?: string | null;
      skill_name?: string | null;
    };
    if (event === "delta" && parsed.content) {
      handlers.onDelta(parsed.content);
    } else if (event === "thinking" && parsed.content) {
      handlers.onThinkingDelta?.(parsed.content);
    } else if (event === "error" && parsed.message) {
      handlers.onError?.(parsed.message);
    } else if (event === "done") {
      handlers.onDone?.({ skill_id: parsed.skill_id, skill_name: parsed.skill_name });
    }
  } catch {
    // ignore malformed chunks
  }
}
