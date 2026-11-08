const PROMPT = "你是專業的日語辭典。使用者輸入的詞或句子可能是任何語言（中文、英文、韓文、西班牙文等），也可能已是日文。請只回傳純 JSON，不要任何其他文字或 Markdown，格式：{\"input_lang\":\"輸入語言（繁體中文）\",\"entries\":[{\"word\":\"日文詞（常用寫法）\",\"reading\":\"平假名讀音\",\"romaji\":\"羅馬拼音\",\"pos\":\"詞性（繁體中文）\",\"jlpt\":\"N5/N4/N3/N2/N1 或 —\",\"meaning\":\"簡短繁體中文釋義\",\"explanation\":\"詞義、語感、使用場合與易混淆點，2到3句繁體中文\",\"examples\":[{\"ja\":\"日文例句\",\"reading\":\"例句平假名\",\"zh\":\"繁體中文翻譯\"}],\"related\":[\"相關或近義日文詞\"]}]}。最多 3 個最貼切的詞條，每個 2 個例句；若輸入是句子，給 1 個詞條，word 為完整日文翻譯，並在 explanation 解說文法與用詞。使用者輸入：";

const j = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json' } });

export async function onRequestPost({ request, env }) {
  let q;
  try { ({ q } = await request.json()); } catch { return j({ error: 'bad_request' }, 400); }
  q = String(q || '').trim().slice(0, 200);
  if (!q) return j({ error: 'empty' }, 400);
  if (!env.ANTHROPIC_API_KEY) return j({ error: 'no_key' }, 500);
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: env.MODEL || 'claude-haiku-5-5', max_tokens: 1500, messages: [{ role: 'user', content: PROMPT + q }] })
  });
  if (r.status === 429) return j({ error: 'rate_limited' }, 429);
  if (!r.ok) return j({ error: 'upstream' }, 502);
  const d = await r.json();
  const t = (d.content || []).map(c => c.text || '').join('').replace(/```json|```/g, '').trim();
  try { return j(JSON.parse(t)); } catch { return j({ error: 'parse' }, 502); }
}
