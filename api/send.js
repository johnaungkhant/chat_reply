const { isAuthorized } = require('../lib/auth');
const { getChatHistoryQuery, META_GRAPH_VERSION } = require('../lib/config');
const { getPool } = require('../lib/database');

const MAX_MESSAGE_LENGTH = 2000;
const CONCURRENCY = 5;

async function sendToRecipient(version, pageId, accessToken, recipientId, message) {
  const endpoint = new URL(`https://graph.facebook.com/${version}/${encodeURIComponent(pageId)}/messages`);
  endpoint.searchParams.set('access_token', accessToken);

  const result = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientId },
      messaging_type: 'RESPONSE',
      message: { text: message }
    }),
    signal: AbortSignal.timeout(15000)
  });

  const body = await result.json().catch(() => ({}));
  if (!result.ok || body.error) {
    throw new Error(body.error?.message || `Messenger returned HTTP ${result.status}.`);
  }
}

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed.' });
  }

  if (!isAuthorized(request)) {
    return response.status(401).json({ error: 'Enter the correct app password.' });
  }

  const message = typeof request.body?.message === 'string' ? request.body.message.trim() : '';
  if (!message || message.length > MAX_MESSAGE_LENGTH) {
    return response.status(400).json({ error: `Message must be between 1 and ${MAX_MESSAGE_LENGTH} characters.` });
  }

  const pageId = process.env.META_PAGE_ID;
  const accessToken = process.env.META_PAGE_ACCESS_TOKEN;
  if (!pageId || !accessToken) {
    return response.status(500).json({ error: 'Messenger credentials are not configured.' });
  }

  try {
    const [recipients] = await getPool().query(getChatHistoryQuery());
    if (!recipients.length) {
      return response.status(200).json({ total: 0, sent: 0, failed: 0, failures: [] });
    }

    let cursor = 0;
    let sent = 0;
    let failed = 0;
    const failures = [];

    async function worker() {
      while (cursor < recipients.length) {
        const recipient = recipients[cursor++];
        try {
          await sendToRecipient(META_GRAPH_VERSION, pageId, accessToken, recipient.messengerId, message);
          sent += 1;
        } catch (error) {
          failed += 1;
          if (failures.length < 10) {
            failures.push({ messengerId: recipient.messengerId, error: error.message });
          }
        }
      }
    }

    await Promise.all(Array.from(
      { length: Math.min(CONCURRENCY, recipients.length) },
      () => worker()
    ));

    return response.status(200).json({ total: recipients.length, sent, failed, failures });
  } catch (error) {
    console.error('Could not send Messenger messages:', error.message);
    return response.status(500).json({ error: error.message || 'Could not send messages.' });
  }
};