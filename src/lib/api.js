/**
 * GitHub Models API wrapper for SVG generation.
 * Endpoint: https://models.inference.ai.azure.com
 * Auth: GitHub Personal Access Token (free, no credit card needed).
 * The token is stored in localStorage and sent only to models.inference.ai.azure.com.
 */

const GITHUB_MODELS_ENDPOINT = 'https://models.inference.ai.azure.com/chat/completions';
const GITHUB_MODEL = 'gpt-4o-mini';

const TOKEN_KEY = 'picasso_github_token';

export function getApiKey() {
  // 1. User-entered token (localStorage) takes priority
  const stored = localStorage.getItem(TOKEN_KEY);
  if (stored) return stored;
  // 2. Build-time injected token (base64, replaced by sed in CI)
  try {
    const cfg = window.__appCfg;
    if (cfg && cfg.r && !cfg.r.includes('PLACEHOLDER')) {
      return atob(cfg.r);
    }
  } catch (_) {}
  return '';
}

export function saveApiKey(key) {
  localStorage.setItem(TOKEN_KEY, key.trim());
}

const SYSTEM_PROMPT = `
Return ONLY one valid SVG element.
No markdown, no explanation, no backticks.

Goal: generate a SIMPLE, clean, flat/cartoon SVG that is easy to render reliably.

Hard rules:
- Start with <svg and end with </svg>.
- Include: width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg".
- Keep composition minimal: 1 clear subject, optional simple background.
- Keep element budget low: <= 24 drawable elements.
- Prefer simple primitives: rect, circle, ellipse, polygon, path.
- Use <g> for logical groups: background, subject, accent.
- Use at most one linearGradient; no radial gradients.
- Do not use filter, mask, pattern, clipPath, symbol, use, image, foreignObject.
- Avoid tiny details and all text labels.
- Keep everything inside the 512x512 canvas with safe margins.
- Do not use scripts, event handlers, foreignObject, external images, or CSS imports.
- Use readable colors with moderate contrast.
- Keep coordinates and path data concise; avoid noisy long paths.

Preferred output layout:
1) <svg ...>
2) optional <defs> (only if one linearGradient is needed)
3) optional <g id="bg">...</g>
4) required <g id="subject">...</g>
5) optional <g id="accent">...</g>
6) </svg>

Style priorities (in order):
1) clear silhouette
2) balanced composition around canvas center
3) 3-6 color palette
4) simple shadows via darker fills only (no effects)
5) clean geometry over ornament detail

Self-check before final output:
- Is it exactly one <svg> root?
- Are forbidden tags/attrs absent?
- Is the subject immediately recognizable at small size?
- Is drawable element count <= 24?
- Is there no text element?

Output template (follow exactly):
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  ...
</svg>
`.trim();

export async function generateSvgFromPrompt(prompt) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('MISSING_API_KEY');
  }
  const concisePrompt = String(prompt || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 220);
  const userPrompt = [
    `Subject: ${concisePrompt}.`,
    'Style: flat vector, bold readable silhouette, minimal details, no text labels.',
    'Output: a single self-contained SVG only.',
  ].join(' ');

  const res = await fetch(GITHUB_MODELS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GITHUB_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.35,
      max_tokens: 900,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${res.status}`);
  }

  const json = await res.json();
  let svg = json.choices?.[0]?.message?.content || '';

  return normalizeSvg(svg);
}

export function normalizeSvg(raw) {
  if (!raw) return '';
  let svg = String(raw);

  if (svg.includes('```')) {
    svg = svg.replace(/```[a-zA-Z]*/g, '').replace(/```/g, '');
  }

  const startIdx = svg.indexOf('<svg');
  if (startIdx > 0) svg = svg.slice(startIdx);

  const endIdx = svg.lastIndexOf('</svg>');
  if (endIdx !== -1) svg = svg.slice(0, endIdx + '</svg>'.length);

  // Basic SVG hygiene inspired by common SVGO cleanups + safety constraints.
  svg = svg
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<!doctype[\s\S]*?>/gi, '')
    .replace(/<!--([\s\S]*?)-->/g, '')
    .replace(/<metadata[\s\S]*?<\/metadata>/gi, '')
    .replace(/<desc[\s\S]*?<\/desc>/gi, '')
    .replace(/<title[\s\S]*?<\/title>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/<image[\s\S]*?>/gi, '')
    .replace(/<filter[\s\S]*?<\/filter>/gi, '')
    .replace(/<mask[\s\S]*?<\/mask>/gi, '')
    .replace(/<pattern[\s\S]*?<\/pattern>/gi, '')
    .replace(/<clipPath[\s\S]*?<\/clipPath>/gi, '')
    .replace(/\son[a-zA-Z]+="[^"]*"/g, '')
    .replace(/\son[a-zA-Z]+='[^']*'/g, '');

  svg = svg.trim();

  if (!svg.startsWith('<svg')) {
    svg = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#f4f4f4"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="20" fill="#444">SVG generation failed</text>
</svg>`;
  }

  return svg;
}
