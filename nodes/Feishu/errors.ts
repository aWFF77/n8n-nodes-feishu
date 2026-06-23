/**
 * Feishu / Lark API error codes → English explanations
 */
const ERROR_MAP: Record<number, string> = {
  // Auth & Token
  99991672: 'Permission denied. Add the required scope in Feishu Developer Console → Permissions.',
  99991668: 'App not published. Publish your app in Developer Console → Version Management.',
  99991663: 'Invalid tenant access token. App ID or App Secret may be wrong.',

  // Bot & Messaging
  230006: 'Bot ability not activated. Enable Bot in Developer Console → App Capabilities.',
  230001: 'Invalid recipient. The user/chat ID does not exist or app is not in the chat.',
  99992351: 'Recipient ID not found. Check the ID type (open_id vs email vs chat_id). Use "Get User Info" operation to find the correct ID.',
  230002: 'Message content is empty or malformed.',

  // Bitable
  1740010: 'Bitable App Token not found. Copy it from the Bitable URL: /base/{AppToken}/...',
  1740011: 'Table ID not found. Use "List Tables" operation to find valid table IDs.',
  1740012: 'Field not found in the table. Check that field names match exactly (case-sensitive).',
  1740013: 'Invalid field value type. Check the expected field type (text/number/date/etc).',

  // Approval
  1820000: 'No pending approvals found.',
  1820001: 'Approval instance not found or already processed.',

  // Rate Limit
  99991400: 'Rate limited. Too many requests — wait and retry.',

  // General
  10003: 'Missing required parameter. Check all fields are filled.',
  10013: 'Invalid token. Try re-entering your App credentials.',

  // Lark-specific
  99991600: 'API domain mismatch. If using Lark, ensure Platform is set to "Lark" in credentials.',
};

/**
 * Get a human-readable error message for a Feishu error code.
 */
export function explainError(code: number, msg?: string): string {
  const explanation = ERROR_MAP[code];
  if (explanation) {
    return `${explanation} [Feishu code: ${code}]`;
  }
  return `${msg || 'Unknown error'} [Feishu code: ${code}]`;
}
