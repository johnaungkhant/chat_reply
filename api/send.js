const { isAuthorized } = require('../lib/auth');
const { pool } = require('../lib/database');

const { META_PAGE_ACCESS_TOKEN } = process.env;
const GRAPH_API = 'https://graph.facebook.com/v21.0';
const MAX_MESSAGE_LENGTH = 2000;

// Token is sent as a Bearer header (not in the URL) so it never lands in logs.
async function graphPost(path, payload, label) {
  const res = await fetch(`${GRAPH_API}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${META_PAGE_ACCESS_TOKEN}` },
    body: payload ? JSON.stringify(payload) : undefined
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`${label} failed: HTTP ${res.status}${body.error?.message ? ` - ${body.error.message}` : ''}`);
  }
}

const sendMetaMessage = (senderId, message) => graphPost('me/messages', { recipient: { id: senderId }, message }, 'sendMetaMessage');

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ error: 'Method not allowed.' });
  }

  if (!isAuthorized(request)) {
    return response.status(401).json({ error: 'Enter the correct app password.' });
  }

  const messageText = typeof request.body?.message === 'string' ? request.body.message.trim() : '';
  if (!messageText || messageText.length > MAX_MESSAGE_LENGTH) {
    return response.status(400).json({ error: `Message must be between 1 and ${MAX_MESSAGE_LENGTH} characters.` });
  }

  try {
    const [rows] = await pool.execute(
      "SELECT DISTINCT sender_id FROM chat_history WHERE sender_id IS NOT NULL AND sender_id <> ''"
    );

    let sent = 0;
    let failed = 0;
    const failures = [];

    for (const row of rows) {
      const senderID = String(row.sender_id);
      try {
        await sendMetaMessage(senderID, { text: messageText });
        sent += 1;
      } catch (error) {
        failed += 1;
        console.warn(`Broadcast to ${senderID} failed:`, error.message);
        if (failures.length < 10) failures.push({ messengerId: senderID, error: error.message });
      }
    }

    return response.status(200).json({ total: rows.length, sent, failed, failures });
  } catch (error) {
    console.error('Broadcast failed:', error);
    return response.status(500).json({ error: error.message || 'Could not send messages.' });
  }
};