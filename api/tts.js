const MAX_TEXT_LENGTH = 200;
const GOOGLE_TTS_URL = 'https://translate.google.com/translate_tts';

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

function getQueryText(req) {
  if (req.query && Object.prototype.hasOwnProperty.call(req.query, 'text')) {
    const value = req.query.text;
    return Array.isArray(value) ? value[0] : value;
  }
  const url = new URL(req.url || '/', 'https://deutschdaily.local');
  return url.searchParams.get('text');
}

module.exports = async function handler(req, res) {
  const method = String(req.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    sendJson(res, 405, { error: 'Only GET requests are supported.' });
    return;
  }

  const text = String(getQueryText(req) || '').trim();
  if (!text) {
    sendJson(res, 400, { error: 'Missing text query parameter.' });
    return;
  }
  if (text.length > MAX_TEXT_LENGTH) {
    sendJson(res, 400, { error: `Text must be ${MAX_TEXT_LENGTH} characters or fewer.` });
    return;
  }

  const upstreamUrl = new URL(GOOGLE_TTS_URL);
  upstreamUrl.searchParams.set('ie', 'UTF-8');
  upstreamUrl.searchParams.set('q', text);
  upstreamUrl.searchParams.set('tl', 'de');
  upstreamUrl.searchParams.set('client', 'tw-ob');

  try {
    const response = await fetch(upstreamUrl, {
      headers: {
        Accept: 'audio/mpeg,audio/*;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      },
    });
    const contentType = response.headers.get('content-type') || '';
    if (!response.ok || !contentType.toLowerCase().includes('audio')) {
      sendJson(res, 502, { error: 'Free TTS upstream did not return audio.' });
      return;
    }

    const audio = Buffer.from(await response.arrayBuffer());
    if (!audio.length) {
      sendJson(res, 502, { error: 'Free TTS upstream returned empty audio.' });
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800');
    res.setHeader('Content-Length', String(audio.length));
    if (method === 'HEAD') {
      res.end();
      return;
    }
    res.end(audio);
  } catch (error) {
    sendJson(res, 502, { error: 'Free TTS upstream request failed.' });
  }
};
