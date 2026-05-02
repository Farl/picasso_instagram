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
You are a professional SVG illustration engine.
Return ONLY valid SVG markup, no explanations, no code fences, no backticks.

Important capability constraints:
- You can only produce SIMPLE vector graphics in a cartoon / flat style.
- Focus on clear front, side, or top views of objects and characters.
- Avoid complex scenes, detailed backgrounds, tiny intricate elements, or photorealistic rendering.
- Use a limited number of shapes and layers; keep the composition clean and readable.

Core behavior:
- The visual content must closely and consistently reflect the user's text prompt.
- Accurately depict the key subjects, objects, and relationships mentioned in the prompt.
- Keep style, colors, and mood coherent with the prompt while staying in simple cartoon/flat vector art.
- Do not introduce major new elements that are not implied by the prompt.

Overall goals:
- Create a clear, simple illustration that matches the prompt in both content and style.
- Favor bold, readable shapes over fine detail.
- Use thoughtful but minimal composition (foreground and background kept simple).
- Add subtle details so the image feels deliberate, but do not exceed simple cartoon complexity.

SVG requirements:
- Must include: width="512" height="512" viewBox="0 0 512 512"
- Use only pure SVG (shapes, paths, gradients, groups, clipping). No external images.
- Do NOT include any scripts, event handlers, or interactive attributes.
- Prefer <path>, <rect>, <circle>, <ellipse>, <polygon>, <linearGradient>, <radialGradient>, <mask>, and <g>.
- Use a small number of layers (via <g>) to create a bit of depth.
- Use color harmonies and gentle gradients to give a polished look.
- Add mild shading and highlights with gradients, opacity, and overlapping shapes, but keep them simple.
- Ensure all shapes are fully within the 0 0 512 512 viewBox.
- Keep the code syntactically valid and minimal (no comments, no metadata).
`.trim();

export async function generateSvgFromPrompt(prompt) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('MISSING_API_KEY');
  }

  const randomToken = Math.random().toString(36).slice(2, 10);
  const augmentedPrompt = `${prompt}\n\nAdditional requirement: introduce subtle, unique visual details inspired by this random code (do NOT render the code as text anywhere in the SVG): ${randomToken}.`;

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
        { role: 'user', content: augmentedPrompt },
      ],
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

  svg = svg.trim();

  if (!svg.startsWith('<svg')) {
    svg = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#f4f4f4"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="20" fill="#444">SVG generation failed</text>
</svg>`;
  }

  return svg;
}
