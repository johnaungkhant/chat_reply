const META_GRAPH_VERSION = 'v25.0';

function getChatHistoryQuery() {
  return `SELECT DISTINCT CAST(sender_id AS CHAR) AS messengerId
    FROM gbv.chat_history
    WHERE sender_id IS NOT NULL
      AND CAST(sender_id AS CHAR) <> ''`;
}

module.exports = { getChatHistoryQuery, META_GRAPH_VERSION };