# Messenger message desk

A small Node.js app for Vercel. It reads distinct Messenger IDs from a MySQL chat history table and sends a typed message to each ID through the Meta Messenger Send API.

## Configure

1. Add the environment variables from `.env.example` to the Vercel project. Use a Meta Page access token with the required Messenger permissions; keep it server-side and never put it in browser code.
2. Set `CHAT_HISTORY_TABLE` and `CHAT_HISTORY_MESSENGER_ID_COLUMN` to match the table and column names in your database. The defaults are `chat_history` and `messenger_id`. The table must contain Page-scoped Messenger user IDs (PSIDs).
3. Set `META_GRAPH_VERSION` to a Graph API version currently supported by your Meta app. Set `DB_SSL=true` when your MySQL provider requires TLS.
4. Deploy the project to Vercel. Open the deployed site, enter `APP_PASSWORD`, and refresh the audience count before sending.

For local development, install dependencies with `npm install`, copy `.env.example` to `.env` and fill it in, then run `vercel dev` with the Vercel CLI installed.

## Sending and policy

The send endpoint targets each distinct, non-empty Messenger ID in the configured table. It sends a `RESPONSE` message and reports successful and failed sends. The first version processes the audience in one request, so it is intended for a modest recipient list; larger lists should use a durable queue and background worker.

Messenger's standard messaging window is generally 24 hours from the person's last interaction with the Page. A historical ID is not, by itself, permission to send a new message outside that window. Follow Meta's current Messenger Platform policies and only send to people eligible to receive the message. Meta may reject individual sends; check the reported failures.

The app password protects the API routes, but this is a lightweight internal tool rather than a full account system. Use a strong password and restrict access to the Vercel deployment as appropriate.
