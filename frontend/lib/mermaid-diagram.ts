import type { SitePublicColorMode } from "@/lib/themes";

export type MermaidDiagramLabels = {
  zoomIn: string;
  zoomOut: string;
  reset: string;
  fullscreen: string;
  close: string;
  copy: string;
  copied: string;
  copySource: string;
  panUp: string;
  panDown: string;
  panLeft: string;
  panRight: string;
};

const MERMAID_LANG = "mermaid";
const VIEWPORT_HEIGHT = 420;
const MIN_SCALE = 0.35;
const MAX_SCALE = 3;
const SCALE_STEP = 0.15;
const PAN_STEP = 48;

type ViewState = {
  scale: number;
  panX: number;
  panY: number;
  baseScale: number;
};

function extractCodeLanguage(pre: Element, block: Element): string | null {
  const fromData = block.getAttribute("data-code-language")?.trim();
  if (fromData) return fromData;

  const code = pre.querySelector("code");
  if (!code) return null;

  for (const className of code.classList) {
    if (className.startsWith("language-")) {
      return className.slice("language-".length);
    }
  }

  return null;
}

function getCodeBlockSource(block: Element): string {
  const pre = block.matches("pre") ? block : block.querySelector("pre");
  if (!pre) return "";
  const code = pre.querySelector("code");
  return (code ?? pre).textContent?.trim() ?? "";
}

function getSvg(canvas: HTMLElement): SVGSVGElement | null {
  return canvas.querySelector("svg");
}

function readNaturalSize(svg: SVGSVGElement) {
  const viewBox = svg.viewBox.baseVal;
  const width = viewBox.width || Number.parseFloat(svg.getAttribute("width") ?? "") || svg.getBoundingClientRect().width || 1;
  const height = viewBox.height || Number.parseFloat(svg.getAttribute("height") ?? "") || svg.getBoundingClientRect().height || 1;
  return { width: Math.max(width, 1), height: Math.max(height, 1) };
}

function prepareSvg(canvas: HTMLElement, svg: SVGSVGElement) {
  const natural = readNaturalSize(svg);
  svg.style.width = `${natural.width}px`;
  svg.style.height = `${natural.height}px`;
  svg.style.maxWidth = "none";
  svg.style.display = "block";
  canvas.dataset.naturalWidth = String(natural.width);
  canvas.dataset.naturalHeight = String(natural.height);
}

function clampScale(scale: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

function fitView(viewport: HTMLElement, canvas: HTMLElement): ViewState {
  const svg = getSvg(canvas);
  if (!svg) {
    return { scale: 1, panX: 0, panY: 0, baseScale: 1 };
  }

  prepareSvg(canvas, svg);
  const naturalWidth = Number(canvas.dataset.naturalWidth ?? "1");
  const naturalHeight = Number(canvas.dataset.naturalHeight ?? "1");
  const vw = viewport.clientWidth;
  const vh = viewport.clientHeight;
  const baseScale = clampScale(Math.min(vw / naturalWidth, vh / naturalHeight) * 0.92);
  const scaledWidth = naturalWidth * baseScale;
  const scaledHeight = naturalHeight * baseScale;

  return {
    scale: baseScale,
    panX: (vw - scaledWidth) / 2,
    panY: (vh - scaledHeight) / 2,
    baseScale,
  };
}

function applyView(canvas: HTMLElement, state: ViewState) {
  canvas.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.scale})`;
  canvas.style.transformOrigin = "0 0";
}

function zoomView(state: ViewState, delta: number, viewport: HTMLElement) {
  const nextScale = clampScale(state.scale + delta);
  const cx = viewport.clientWidth / 2;
  const cy = viewport.clientHeight / 2;
  const ratio = nextScale / state.scale;
  state.panX = cx - (cx - state.panX) * ratio;
  state.panY = cy - (cy - state.panY) * ratio;
  state.scale = nextScale;
}

function findThemeShell(): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>("[data-site-shell]") ??
    document.querySelector<HTMLElement>("[data-admin-shell]")
  );
}

function inheritSiteTheme(shell: HTMLElement) {
  const themeRoot = findThemeShell();
  if (!themeRoot) return;

  if (themeRoot.hasAttribute("data-site-shell")) {
    shell.setAttribute("data-site-shell", "");
    const palette = themeRoot.getAttribute("data-site-palette");
    if (palette) {
      shell.setAttribute("data-site-palette", palette);
    }
  } else {
    shell.setAttribute("data-admin-shell", "");
    const palette = themeRoot.getAttribute("data-admin-palette");
    if (palette) {
      shell.setAttribute("data-admin-palette", palette);
    }
  }

  if (themeRoot.classList.contains("dark")) {
    shell.classList.add("dark");
  }
}

function clearSiteTheme(shell: HTMLElement) {
  shell.removeAttribute("data-site-shell");
  shell.removeAttribute("data-site-palette");
  shell.removeAttribute("data-admin-shell");
  shell.removeAttribute("data-admin-palette");
  shell.classList.remove("dark");
}

const MERMAID_COPY_ICON_SVG = `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"/><path fill="currentColor" d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"/></svg>`;

const MERMAID_CHECK_ICON_SVG = `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"/></svg>`;

function setIconSvg(icon: HTMLElement, svg: string) {
  icon.innerHTML = svg;
}

function createIconButton(label: string, content: string, onClick: () => void, extraClass = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = extraClass ? `mermaid-icon-btn ${extraClass}` : "mermaid-icon-btn";
  button.textContent = content;
  button.setAttribute("aria-label", label);
  button.title = label;
  button.addEventListener("click", onClick);
  return button;
}

function createCopyButton(source: string, labels: MermaidDiagramLabels) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "mermaid-icon-btn mermaid-icon-btn--copy";
  button.setAttribute("aria-label", labels.copySource);
  button.title = labels.copySource;

  const icon = document.createElement("span");
  icon.className = "mermaid-icon-btn__icon";
  icon.setAttribute("aria-hidden", "true");
  setIconSvg(icon, MERMAID_COPY_ICON_SVG);

  const tooltip = document.createElement("span");
  tooltip.className = "mermaid-icon-btn__tooltip";
  tooltip.textContent = labels.copied;
  tooltip.hidden = true;

  button.append(icon, tooltip);

  let resetTimer: number | undefined;

  button.addEventListener("click", () => {
    void navigator.clipboard.writeText(source).then(() => {
      if (resetTimer) window.clearTimeout(resetTimer);
      button.classList.add("mermaid-icon-btn--copied");
      setIconSvg(icon, MERMAID_CHECK_ICON_SVG);
      button.setAttribute("aria-label", labels.copied);
      tooltip.hidden = false;
      resetTimer = window.setTimeout(() => {
        button.classList.remove("mermaid-icon-btn--copied");
        setIconSvg(icon, MERMAID_COPY_ICON_SVG);
        button.setAttribute("aria-label", labels.copySource);
        tooltip.hidden = true;
        resetTimer = undefined;
      }, 2000);
    });
  });

  return button;
}

function mountDiagramControls(
  shell: HTMLDivElement,
  canvas: HTMLElement,
  viewport: HTMLElement,
  source: string,
  labels: MermaidDiagramLabels,
) {
  const state = fitView(viewport, canvas);
  applyView(canvas, state);

  const topControls = document.createElement("div");
  topControls.className = "mermaid-controls-top";

  const bottomControls = document.createElement("div");
  bottomControls.className = "mermaid-controls-bottom";

  const pad = document.createElement("div");
  pad.className = "mermaid-pad";

  let placeholder: Comment | null = null;
  let parent: Node | null = null;

  const resetView = () => {
    Object.assign(state, fitView(viewport, canvas));
    applyView(canvas, state);
  };

  const pan = (dx: number, dy: number) => {
    state.panX += dx;
    state.panY += dy;
    applyView(canvas, state);
  };

  let exitFullscreenImpl: (() => void) | null = null;
  let fullscreenBtn: HTMLButtonElement;

  const updateFullscreenBtn = (isFullscreen: boolean) => {
    fullscreenBtn.textContent = isFullscreen ? "✕" : "⤢";
    fullscreenBtn.setAttribute("aria-label", isFullscreen ? labels.close : labels.fullscreen);
    fullscreenBtn.title = isFullscreen ? labels.close : labels.fullscreen;
  };

  const exitFullscreen = () => {
    if (!shell.classList.contains("mermaid-diagram--fullscreen")) return;

    shell.classList.remove("mermaid-diagram--fullscreen");
    document.body.classList.remove("mermaid-fullscreen-open");
    clearSiteTheme(shell);
    viewport.style.height = `${VIEWPORT_HEIGHT}px`;

    if (placeholder && parent) {
      parent.insertBefore(shell, placeholder);
      placeholder.remove();
      placeholder = null;
      parent = null;
    }

    updateFullscreenBtn(false);
    requestAnimationFrame(resetView);
  };

  exitFullscreenImpl = exitFullscreen;

  const enterFullscreen = () => {
    if (shell.classList.contains("mermaid-diagram--fullscreen")) return;

    parent = shell.parentNode;
    placeholder = document.createComment("mermaid-fullscreen-anchor");
    parent?.insertBefore(placeholder, shell);

    inheritSiteTheme(shell);
    document.body.appendChild(shell);
    shell.classList.add("mermaid-diagram--fullscreen");
    document.body.classList.add("mermaid-fullscreen-open");
    viewport.style.height = "100%";
    updateFullscreenBtn(true);

    requestAnimationFrame(resetView);
  };

  const toggleFullscreen = () => {
    if (shell.classList.contains("mermaid-diagram--fullscreen")) {
      exitFullscreen();
    } else {
      enterFullscreen();
    }
  };

  const copyBtn = createCopyButton(source, labels);

  fullscreenBtn = createIconButton(labels.fullscreen, "⤢", toggleFullscreen);

  topControls.append(fullscreenBtn, copyBtn);
  shell.append(topControls, bottomControls);
  bottomControls.appendChild(pad);

  const padButtons: Array<{ label: string; symbol: string; action: () => void }> = [
    { label: labels.panUp, symbol: "↑", action: () => pan(0, PAN_STEP) },
    { label: labels.panLeft, symbol: "←", action: () => pan(PAN_STEP, 0) },
    { label: labels.reset, symbol: "⟲", action: resetView },
    { label: labels.panRight, symbol: "→", action: () => pan(-PAN_STEP, 0) },
    { label: labels.zoomOut, symbol: "−", action: () => { zoomView(state, -SCALE_STEP, viewport); applyView(canvas, state); } },
    { label: labels.panDown, symbol: "↓", action: () => pan(0, -PAN_STEP) },
    { label: labels.zoomIn, symbol: "+", action: () => { zoomView(state, SCALE_STEP, viewport); applyView(canvas, state); } },
  ];

  padButtons.forEach(({ label, symbol, action }) => {
    pad.appendChild(createIconButton(label, symbol, action));
  });

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      exitFullscreenImpl?.();
    }
  };

  document.addEventListener("keydown", onKeyDown);

  const resizeObserver = new ResizeObserver(() => {
    if (shell.classList.contains("mermaid-diagram--fullscreen")) return;
    resetView();
  });
  resizeObserver.observe(viewport);

  return () => {
    document.removeEventListener("keydown", onKeyDown);
    resizeObserver.disconnect();
    exitFullscreenImpl?.();
  };
}

export async function renderMermaidDiagrams(
  root: HTMLElement,
  colorMode: SitePublicColorMode,
  labels: MermaidDiagramLabels,
): Promise<() => void> {
  const blocks: Element[] = [];
  root.querySelectorAll("pre").forEach((pre) => {
    const block = pre.closest(".highlight") ?? pre;
    if (extractCodeLanguage(pre, block) !== MERMAID_LANG) return;
    if (!blocks.includes(block)) blocks.push(block);
  });

  if (blocks.length === 0) return () => {};

  const mermaid = (await import("mermaid")).default;
  mermaid.initialize({
    startOnLoad: false,
    theme: colorMode === "dark" ? "dark" : "default",
    securityLevel: "strict",
    fontFamily: "inherit",
    flowchart: { useMaxWidth: false },
  });

  const nodes: HTMLElement[] = [];
  const sources = new Map<HTMLElement, string>();
  const cleanups: Array<() => void> = [];
  const restorations: Array<{ shell: HTMLElement; block: Element }> = [];

  blocks.forEach((block) => {
    const source = getCodeBlockSource(block);
    if (!source) return;

    const shell = document.createElement("div");
    shell.className = "mermaid-diagram";

    const viewport = document.createElement("div");
    viewport.className = "mermaid-viewport";
    viewport.style.height = `${VIEWPORT_HEIGHT}px`;

    const canvas = document.createElement("div");
    canvas.className = "mermaid-canvas";

    const diagram = document.createElement("pre");
    diagram.className = "mermaid";
    diagram.textContent = source;

    canvas.appendChild(diagram);
    viewport.appendChild(canvas);
    shell.appendChild(viewport);
    restorations.push({ shell, block });
    block.replaceWith(shell);
    nodes.push(diagram);
    sources.set(shell, source);
  });

  if (nodes.length > 0) {
    await mermaid.run({ nodes });
  }

  root.querySelectorAll(".mermaid-diagram").forEach((element) => {
    const shell = element as HTMLDivElement;
    const canvas = shell.querySelector(".mermaid-canvas") as HTMLElement | null;
    const viewport = shell.querySelector(".mermaid-viewport") as HTMLElement | null;
    const source = sources.get(shell) ?? "";
    if (!canvas || !viewport) return;
    cleanups.push(mountDiagramControls(shell, canvas, viewport, source, labels));
  });

  return () => {
    cleanups.forEach((cleanup) => cleanup());
    document.body.classList.remove("mermaid-fullscreen-open");
    for (const { shell, block } of restorations) {
      if (!shell.isConnected) continue;
      try {
        shell.replaceWith(block);
      } catch {
        // React 可能已替换该子树，忽略即可。
      }
    }
  };
}

export { MERMAID_LANG, extractCodeLanguage };
