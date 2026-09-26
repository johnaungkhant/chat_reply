const identifierPath = /^[A-Za-z0-9_$]+(?:\.[A-Za-z0-9_$]+)*$/;

function quoteIdentifierPath(value, settingName) {
  if (!identifierPath.test(value)) {
    throw new Error(`${settingName} contains an invalid SQL identifier.`);
  }

  return value.split('.').map((part) => `\`${part}\``).join('.');
}

function getChatHistoryQuery() {
  const table = quoteIdentifierPath(
    process.env.CHAT_HISTORY_TABLE || 'chat_history',
    'CHAT_HISTORY_TABLE'
  );
  const messengerIdColumn = quoteIdentifierPath(
    process.env.CHAT_HISTORY_MESSENGER_ID_COLUMN || 'messenger_id',
    'CHAT_HISTORY_MESSENGER_ID_COLUMN'
  );

  return `SELECT DISTINCT CAST(${messengerIdColumn} AS CHAR) AS messengerId
    FROM ${table}
    WHERE ${messengerIdColumn} IS NOT NULL
      AND CAST(${messengerIdColumn} AS CHAR) <> ''`;
}

function getGraphVersion() {
  const version = process.env.META_GRAPH_VERSION;
  if (!version || !/^v\d+\.\d+$/.test(version)) {
    throw new Error('Set META_GRAPH_VERSION to a supported version, for example vXX.X.');
  }
  return version;
}

module.exports = { getChatHistoryQuery, getGraphVersion };