import {
  IWebhookFunctions,
  INodeType,
  INodeTypeDescription,
  IWebhookResponseData,
} from 'n8n-workflow';

export class FeishuTrigger implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Feishu / Lark Trigger',
    name: 'feishuTrigger',
    icon: 'file:feishu.svg',
    group: ['trigger'],
    version: 2,
    subtitle: '={{ $parameter["event"] }}',
    description: 'Listen for Feishu/Lark events: incoming messages, approval changes, Bitable updates',
    defaults: { name: 'Feishu / Lark Trigger' },
    inputs: [],
    outputs: ['main'],
    credentials: [{ name: 'feishuApi', required: true }],
    webhooks: [{ name: 'default', httpMethod: 'POST', responseMode: 'onReceived', path: 'feishu' }],
    properties: [
      {
        displayName: 'Event Type',
        name: 'event',
        type: 'options',
        options: [
          { name: '🆓 Message Received (Free)', value: 'message_receive', description: 'When the bot receives a message' },
          { name: '⭐ Approval Status Changed (Pro)', value: 'approval_change', description: 'When an approval is submitted/approved/rejected' },
          { name: '⭐ Bitable Record Changed (Pro)', value: 'bitable_change', description: 'When a record is created/updated in a Bitable' },
        ],
        default: 'message_receive',
      },
      {
        displayName: 'Verification Token (optional)',
        name: 'verificationToken',
        type: 'string',
        default: '',
        description: 'From Feishu Developer Console → Event Subscriptions. For verifying callback source.',
      },
      {
        displayName: 'Webhook URL',
        name: 'webhookUrl',
        type: 'notice',
        default: 'Copy the production URL above and paste it into Feishu Developer Console → Event Subscriptions → Request URL.',
        displayOptions: { show: { event: ['message_receive', 'approval_change', 'bitable_change'] } },
      },
    ],
  };

  async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
    const req = this.getRequestObject();
    const body = req.body as any;

    // URL verification challenge
    if (body?.type === 'url_verification') {
      return { webhookResponse: { challenge: body.challenge }, workflowData: [] };
    }

    // Extract event data
    const event = body?.event || {};
    const header = body?.header || {};

    const output: Record<string, any> = {
      eventType: header.event_type || body.event_type || 'unknown',
      eventId: header.event_id || '',
      appId: header.app_id || '',
      tenantKey: header.tenant_key || '',
      timestamp: header.create_time || new Date().toISOString(),
    };

    // Message event
    if (event.sender?.sender_id) {
      output.senderOpenId = event.sender.sender_id.open_id || '';
      output.senderUserId = event.sender.sender_id.user_id || '';
      output.chatId = event.message?.chat_id || '';
      output.chatType = event.message?.chat_type || '';
      output.messageId = event.message?.message_id || '';
      output.messageType = event.message?.msg_type || '';

      // Parse message content if text
      if (event.message?.content) {
        try {
          const content = JSON.parse(event.message.content);
          output.messageText = content.text || '';
          output.rawContent = content;
        } catch {
          output.messageText = event.message.content;
        }
      }
    }

    // Approval event
    if (event.approval_code) {
      output.approvalCode = event.approval_code;
      output.instanceCode = event.instance_code;
      output.approvalStatus = event.status;
    }

    // Bitable event
    if (event.table_id) {
      output.tableId = event.table_id;
      output.recordId = event.record_id;
      output.action = event.action; // 'insert' or 'update'
    }

    // Include raw event for advanced use
    output.rawEvent = event;

    return {
      webhookResponse: { code: 0, msg: 'success' },
      workflowData: [[{ json: output }]],
    };
  }
}
