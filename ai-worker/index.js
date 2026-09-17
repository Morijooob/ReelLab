const ALLOWED_ORIGIN = 'https://morijooob.github.io';
const MAX_VIDEO_BYTES = 12 * 1024 * 1024;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';

const schema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    topic: { type: 'string' },
    topic_confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
    topic_evidence: { type: 'array', items: { type: 'string' }, maxItems: 5 },
    summary: { type: 'string' },
    hook: { type: ['string', 'null'] },
    hook_start_seconds: { type: ['number', 'null'], minimum: 0 },
    hook_end_seconds: { type: ['number', 'null'], minimum: 0 },
    hook_confidence: { type: 'string', enum: ['none', 'low', 'medium', 'high'] },
    speech: { type: 'string' },
    speech_valid: { type: 'boolean' },
    ocr: { type: 'string' },
    ocr_valid: { type: 'boolean' },
    visual_evidence: { type: 'array', items: { type: 'string' }, maxItems: 12 },
    key_moments: {
      type: 'array', maxItems: 8,
      items: {
        type: 'object', additionalProperties: false,
        properties: {
          start_seconds: { type: 'number', minimum: 0 },
          end_seconds: { type: 'number', minimum: 0 },
          description: { type: 'string' },
          importance: { type: 'string', enum: ['low', 'medium', 'high'] }
        },
        required: ['start_seconds', 'end_seconds', 'description', 'importance']
      }
    },
    caption: { type: ['string', 'null'] },
    hashtags: { type: 'array', items: { type: 'string' }, maxItems: 8 },
    cta: { type: ['string', 'null'] },
    readiness_score: { type: 'integer', minimum: 0, maximum: 100 },
    blocking_issues: { type: 'array', items: { type: 'string' }, maxItems: 8 },
    warnings: { type: 'array', items: { type: 'string' }, maxItems: 8 }
  },
  required: ['topic','topic_confidence','topic_evidence','summary','hook','hook_start_seconds','hook_end_seconds','hook_confidence','speech','speech_valid','ocr','ocr_valid','visual_evidence','key_moments','caption','hashtags','cta','readiness_score','blocking_issues','warnings']
};

const json = (data, status = 200, origin = ALLOWED_ORIGIN) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff'
  }
});

function sanitizeModelResult(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const topic = String(r.topic || '').trim();
  const confidence = ['low','medium','high'].includes(r.topic_confidence) ? r.topic_confidence : 'low';
  const evidence = Array.isArray(r.topic_evidence) ? r.topic_evidence.map(String).filter(Boolean).slice(0,5) : [];
  const speech = String(r.speech || '').trim();
  const ocr = String(r.ocr || '').trim();
  const hook = typeof r.hook === 'string' && r.hook.trim() ? r.hook.trim() : null;
  const hookConfidence = ['none','low','medium','high'].includes(r.hook_confidence) ? r.hook_confidence : 'none';
  const blocking = Array.isArray(r.blocking_issues) ? r.blocking_issues.map(String).filter(Boolean).slice(0,8) : [];
  const warnings = Array.isArray(r.warnings) ? r.warnings.map(String).filter(Boolean).slice(0,8) : [];

  if (confidence !== 'high' || evidence.length < 2) blocking.push('موضوع با شواهد کافی تأیید نشد.');
  if (hook && (hookConfidence === 'none' || hookConfidence === 'low')) blocking.push('قلاب شواهد زمانی/محتوایی کافی ندارد.');
  if (!speech.trim()) warnings.push('گفتار معتبر برای تحلیل پیدا نشد.');
  if (!ocr.trim()) warnings.push('متن معتبر روی تصویر پیدا نشد.');

  const safeHook = blocking.some(x => x.includes('قلاب')) ? null : hook;
  const safeTopic = confidence === 'high' && evidence.length >= 2 ? topic : 'موضوع قابل اعتماد تشخیص داده نشد';
  const safeCaption = safeTopic === 'موضوع قابل اعتماد تشخیص داده نشد' ? null : (typeof r.caption === 'string' && r.caption.trim() ? r.caption.trim() : null);
  const safeTags = safeTopic === 'موضوع قابل اعتماد تشخیص داده نشد' ? [] : (Array.isArray(r.hashtags) ? r.hashtags.map(String).filter(x => /^#[^\s#]+/.test(x)).slice(0,8) : []);

  return {
    topic: safeTopic,
    topic_confidence: safeTopic.startsWith('موضوع') ? 'low' : confidence,
    topic_evidence: evidence,
    summary: String(r.summary || '').trim(),
    hook: safeHook,
    hook_start_seconds: Number.isFinite(Number(r.hook_start_seconds)) ? Number(r.hook_start_seconds) : null,
    hook_end_seconds: Number.isFinite(Number(r.hook_end_seconds)) ? Number(r.hook_end_seconds) : null,
    hook_confidence: safeHook ? hookConfidence : 'none',
    speech,
    speech_valid: Boolean(r.speech_valid) && speech.length >= 8,
    ocr,
    ocr_valid: Boolean(r.ocr_valid) && ocr.length >= 4,
    visual_evidence: Array.isArray(r.visual_evidence) ? r.visual_evidence.map(String).filter(Boolean).slice(0,12) : [],
    key_moments: Array.isArray(r.key_moments) ? r.key_moments.slice(0,8) : [],
    caption: safeCaption,
    hashtags: safeTags,
    cta: typeof r.cta === 'string' && r.cta.trim() ? r.cta.trim() : null,
    readiness_score: Math.max(0, Math.min(100, Number.parseInt(r.readiness_score, 10) || 0)),
    blocking_issues: [...new Set(blocking)].slice(0,8),
    warnings: [...new Set(warnings)].slice(0,8)
  };
}

async function analyzeWithGemini(file, fields, env) {
  if (!env.GEMINI_API_KEY) throw new Error('AI_BACKEND_NOT_CONFIGURED');
  if (file.size > MAX_VIDEO_BYTES) throw new Error('VIDEO_TOO_LARGE_FOR_MVP');

  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
  const data = btoa(binary);

  const prompt = `You are ReelLab's multimodal video analyst. Analyze the ENTIRE uploaded Reel using both audio and visual evidence, with special attention to the first 3 seconds and meaningful scene changes.
Rules:
1) Inspect the whole timeline; do not decide the topic from one frame.
2) Never infer a topic from a single detected object such as person, bag, phone, etc.
3) Never treat OCR garbage, random symbols, duplicated fragments, music markers, lyrics fragments, or low-confidence transcription as valid evidence.
4) A hook is valid only when you identify a concrete spoken/visible event or sentence in the first 3 seconds and give its time range.
5) Topic confidence high requires at least TWO independent concrete evidence items from audio, readable on-screen text, or meaningful visual events.
6) If evidence is insufficient, return null/low confidence. Do NOT guess.
7) Caption and hashtags must be grounded only in a trusted topic. Otherwise return null/empty.
8) readiness_score measures pre-publish evidence/quality, NOT predicted views.
9) Use timestamps for key moments and distinguish music/noise from meaningful speech.
10) Return concise Persian where appropriate.
User goal: ${fields.goal || 'reach'}
User-provided topic (may be empty): ${fields.topic || ''}
User hook (may be empty): ${fields.hook || ''}
User caption (may be empty): ${fields.caption || ''}
User CTA (may be empty): ${fields.cta || ''}`;

  const body = {
    model: 'gemini-3.8-flash',
    input: [
      { type: 'video', data, mime_type: file.type || 'video/mp4', processing: 'agentic' },
      { type: 'text', text: prompt }
    ],
    response_format: { type: 'text', mime_type: 'application/json', schema }
  };

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`GEMINI_${response.status}:${detail.slice(0,300)}`);
  }
  const payload = await response.json();
  const text = payload?.steps?.flatMap(s => s?.content || []).find(x => x?.type === 'text')?.text || payload?.output_text;
  if (!text) throw new Error('AI_EMPTY_RESULT');
  return sanitizeModelResult(JSON.parse(text));
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = origin === ALLOWED_ORIGIN || origin === 'http://localhost:3000' || origin === 'http://localhost:5173';
    if (request.method === 'OPTIONS') return json({ ok: true }, 204, allowed ? origin : ALLOWED_ORIGIN);
    if (!allowed) return json({ error: 'ORIGIN_NOT_ALLOWED' }, 403);
    if (request.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405, origin);
    try {
      const form = await request.formData();
      const file = form.get('video');
      if (!(file instanceof File)) return json({ error: 'VIDEO_REQUIRED' }, 400, origin);
      if (!file.type.startsWith('video/')) return json({ error: 'INVALID_VIDEO_TYPE' }, 415, origin);
      const result = await analyzeWithGemini(file, {
        goal: form.get('goal'), topic: form.get('topic'), hook: form.get('hook'), caption: form.get('caption'), cta: form.get('cta')
      }, env);
      return json({ ok: true, engine: 'multimodal-v2-agentic', result }, 200, origin);
    } catch (error) {
      const code = String(error?.message || 'AI_ERROR').split(':')[0];
      const status = code === 'VIDEO_TOO_LARGE_FOR_MVP' ? 413 : code === 'AI_BACKEND_NOT_CONFIGURED' ? 503 : 502;
      return json({ ok: false, error: code }, status, origin);
    }
  }
};
