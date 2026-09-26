const { isAuthorized } = require('../lib/auth');
const { getChatHistoryQuery } = require('../lib/config');
const { getPool } = require('../lib/database');

module.exports = async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed.' });
  }

  if (!isAuthorized(request)) {
    return response.status(401).json({ error: 'Enter the correct app password.' });
  }

  try {
    const [rows] = await getPool().query(getChatHistoryQuery());
    return response.status(200).json({ recipientCount: rows.length });
  } catch (error) {
    console.error('Could not load Messenger recipients:', error);

    let detail = `Database error (${error.code || 'unknown'}). Check the Vercel function logs.`;
    if (error.message?.startsWith('Missing database environment variables:')) {
      detail = error.message;
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      detail = 'MySQL rejected DB_USER or DB_PASSWORD.';
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      detail = 'DB_NAME was not found. It should be gbv.';
    } else if (error.code === 'ER_NO_SUCH_TABLE') {
      detail = 'The table gbv.chat_history was not found.';
    } else if (error.code === 'ER_BAD_FIELD_ERROR') {
      detail = 'The sender_id column was not found in gbv.chat_history.';
    } else if (error.code === 'ENOTFOUND') {
      detail = 'DB_HOST could not be resolved. Check its value.';
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      detail = 'Could not connect to MySQL. Check DB_HOST, DB_PORT, and your provider network or IP allowlist.';
    } else if (error.code?.includes('CERT') || error.code?.includes('TLS')) {
      detail = 'MySQL TLS verification failed. Check DB_SSL and your provider TLS settings.';
    }

    return response.status(500).json({
      error: 'Could not load recipients.',
      detail
    });
  }
};