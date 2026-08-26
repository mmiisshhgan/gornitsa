// Прокси к Telegram Bot API. Держит токен бота в переменных окружения
// (TG_BOT_TOKEN, TG_CHAT_ID) — они не должны попадать в клиентский код.
// Настроить в Vercel: Project Settings → Environment Variables.
// CommonJS (module.exports), т.к. в репозитории нет package.json с "type":"module".
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method_not_allowed' });
    return;
  }

  const token = process.env.TG_BOT_TOKEN;
  const chatId = process.env.TG_CHAT_ID;
  if (!token || !chatId) {
    res.status(500).json({ ok: false, error: 'server_not_configured' });
    return;
  }

  const body = req.body || {};
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  const parseMode = body.parse_mode === 'Markdown' ? 'Markdown' : 'HTML';

  if (!text || text.length > 4000) {
    res.status(400).json({ ok: false, error: 'invalid_text' });
    return;
  }

  try {
    const tgRes = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: parseMode }),
    });
    const data = await tgRes.json();
    res.status(tgRes.ok ? 200 : 502).json(data);
  } catch (e) {
    res.status(502).json({ ok: false, error: 'upstream_error' });
  }
}
