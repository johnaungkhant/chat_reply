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
    console.error('Could not load Messenger recipients:', error.message);
    return response.status(500).json({ error: 'Could not load recipients. Check the database configuration.' });
  }
};