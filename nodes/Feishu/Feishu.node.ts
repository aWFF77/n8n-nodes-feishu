import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeOperationError,
} from 'n8n-workflow';
import { validateLicense } from './license';
import { explainError } from './errors';

// ─── Operation groups ───────────────────────────────────────────────
const FREE_OPS = ['sendTextMessage'];
const PRO_OPS = [
  'sendCardMessage', 'sendImage', 'sendFile', 'batchSend',
  'readBitable', 'createBitable', 'updateBitable', 'deleteBitable',
  'searchBitable', 'listBitableTables',
  'listApprovals', 'getApprovalDetail', 'approveInstance', 'rejectInstance',
  'listCalendarEvents', 'createCalendarEvent',
  'getUserInfo', 'searchUsers',
];

// ─── API base helper ─────────────────────────────────────────────────
type Platform = 'feishu' | 'lark';
const API_HOST: Record<Platform, string> = {
  feishu: 'https://open.feishu.cn',
  lark: 'https://open.larksuite.com',
};

// ─── Token cache ─────────────────────────────────────────────────────
let cachedToken = '';
let cachedHost: string | null = null;
let tokenExpiry = 0;

async function getToken(
  ctx: IExecuteFunctions,
  appId: string,
  appSecret: string,
  baseUrl: string,
): Promise<string> {
  if (cachedToken && cachedHost === baseUrl && Date.now() < tokenExpiry) return cachedToken;
  const res: any = await ctx.helpers.request({
    method: 'POST',
    url: `${baseUrl}/open-apis/auth/v3/tenant_access_token/internal`,
    headers: { 'Content-Type': 'application/json' },
    body: { app_id: appId, app_secret: appSecret },
    json: true,
  });
  if (res.code !== 0) throw new NodeOperationError(ctx.getNode(), explainError(res.code, res.msg));
  cachedToken = res.tenant_access_token;
  cachedHost = baseUrl;
  tokenExpiry = Date.now() + (res.expire - 300) * 1000;
  return cachedToken;
}

// ─── Node Description ────────────────────────────────────────────────
export class Feishu implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Feishu / Lark',
    name: 'feishu',
    icon: 'file:feishu.svg',
    group: ['transform'],
    version: 2,
    subtitle: '={{ $parameter["resource"] }} - {{ $parameter["operation"] }}',
    description: 'Feishu/Lark integration — messaging, Bitable CRUD, approvals, calendar, contacts',
    defaults: { name: 'Feishu / Lark' },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [{ name: 'feishuApi', required: true }],
    properties: [
      // ── Resource ──
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          { name: '📨 Messaging', value: 'messaging' },
          { name: '📊 Bitable', value: 'bitable' },
          { name: '✅ Approvals', value: 'approvals' },
          { name: '📅 Calendar', value: 'calendar' },
          { name: '👤 Contacts', value: 'contacts' },
        ],
        default: 'messaging',
      },

      // ═══════════ MESSAGING ═══════════
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['messaging'] } },
        options: [
          { name: '🆓 Send Text Message', value: 'sendTextMessage' },
          { name: '⭐ Send Card Message', value: 'sendCardMessage' },
          { name: '⭐ Send Image', value: 'sendImage' },
          { name: '⭐ Send File', value: 'sendFile' },
          { name: '⭐ Batch Send to Multiple Users', value: 'batchSend' },
        ],
        default: 'sendTextMessage',
      },
      // -- messaging shared --
      {
        displayName: 'Recipient ID Type',
        name: 'receiveIdType',
        type: 'options',
        options: [
          { name: 'Open ID', value: 'open_id' },
          { name: 'User ID', value: 'user_id' },
          { name: 'Email', value: 'email' },
          { name: 'Chat ID (Group)', value: 'chat_id' },
        ],
        default: 'open_id',
        displayOptions: { show: { resource: ['messaging'] } },
      },
      {
        displayName: 'Recipient',
        name: 'receiveId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { resource: ['messaging'], operation: ['sendTextMessage', 'sendCardMessage', 'sendImage', 'sendFile'] } },
        placeholder: 'ou_xxx or chat_xxx or user@example.com',
        description: 'Recipient ID matching the type above. Use Contacts → Get User Info to find IDs.',
      },
      // -- text --
      {
        displayName: 'Message Content',
        name: 'textContent',
        type: 'string',
        typeOptions: { rows: 4 },
        default: '',
        required: true,
        displayOptions: { show: { resource: ['messaging'], operation: ['sendTextMessage'] } },
        placeholder: 'Type your message...',
      },
      // -- card --
      {
        displayName: 'Card Title',
        name: 'cardTitle',
        type: 'string',
        default: '📢 Notification',
        displayOptions: { show: { resource: ['messaging'], operation: ['sendCardMessage'] } },
      },
      {
        displayName: 'Card Body (Markdown)',
        name: 'cardContent',
        type: 'string',
        typeOptions: { rows: 6 },
        default: '',
        required: true,
        displayOptions: { show: { resource: ['messaging'], operation: ['sendCardMessage'] } },
        placeholder: '**Heading**\nBody text with _formatting_\n[Link](https://example.com)',
      },
      {
        displayName: 'Card Color',
        name: 'cardColor',
        type: 'options',
        options: [
          { name: 'Blue', value: 'blue' },
          { name: 'Green', value: 'green' },
          { name: 'Red', value: 'red' },
          { name: 'Yellow', value: 'yellow' },
          { name: 'Purple', value: 'purple' },
          { name: 'Default', value: 'default' },
        ],
        default: 'default',
        displayOptions: { show: { resource: ['messaging'], operation: ['sendCardMessage'] } },
      },
      // -- image --
      {
        displayName: 'Image Source',
        name: 'imageSource',
        type: 'options',
        options: [
          { name: 'URL (auto-upload)', value: 'url' },
          { name: 'Image Key (pre-uploaded)', value: 'key' },
        ],
        default: 'url',
        displayOptions: { show: { resource: ['messaging'], operation: ['sendImage'] } },
      },
      {
        displayName: 'Image URL',
        name: 'imageUrl',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { resource: ['messaging'], operation: ['sendImage'], imageSource: ['url'] } },
        placeholder: 'https://example.com/photo.png',
      },
      {
        displayName: 'Image Key',
        name: 'imageKey',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { resource: ['messaging'], operation: ['sendImage'], imageSource: ['key'] } },
        placeholder: 'img_v3_xxxxx',
        description: 'Upload via Feishu Upload Image API first, then paste the key',
      },
      // -- file --
      {
        displayName: 'File Source',
        name: 'fileSource',
        type: 'options',
        options: [
          { name: 'URL (auto-upload)', value: 'url' },
          { name: 'File Key (pre-uploaded)', value: 'key' },
        ],
        default: 'url',
        displayOptions: { show: { resource: ['messaging'], operation: ['sendFile'] } },
      },
      {
        displayName: 'File URL',
        name: 'fileUrl',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { resource: ['messaging'], operation: ['sendFile'], fileSource: ['url'] } },
        placeholder: 'https://example.com/document.pdf',
      },
      {
        displayName: 'File Key',
        name: 'fileKey',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { resource: ['messaging'], operation: ['sendFile'], fileSource: ['key'] } },
        placeholder: 'file_v3_xxxxx',
        description: 'Upload via Feishu Upload File API first, then paste the key',
      },
      {
        displayName: 'File Name',
        name: 'fileName',
        type: 'string',
        default: 'file',
        required: true,
        displayOptions: { show: { resource: ['messaging'], operation: ['sendFile'] } },
        description: 'Display name with extension (e.g. report.pdf)',
      },
      // -- batch send --
      {
        displayName: 'Recipients (one per line)',
        name: 'batchRecipients',
        type: 'string',
        typeOptions: { rows: 5 },
        default: '',
        required: true,
        displayOptions: { show: { resource: ['messaging'], operation: ['batchSend'] } },
        placeholder: 'open_id\nou_xxx\nuser@example.com',
        description: 'List of recipient IDs, one per line. Each ID type is auto-detected.',
      },
      {
        displayName: 'Batch Message',
        name: 'batchMessage',
        type: 'string',
        typeOptions: { rows: 3 },
        default: '',
        required: true,
        displayOptions: { show: { resource: ['messaging'], operation: ['batchSend'] } },
      },

      // ═══════════ BITABLE ═══════════
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['bitable'] } },
        options: [
          { name: '⭐ Read Records', value: 'readBitable' },
          { name: '⭐ Create Record', value: 'createBitable' },
          { name: '⭐ Update Record', value: 'updateBitable' },
          { name: '⭐ Delete Record', value: 'deleteBitable' },
          { name: '⭐ Search Records', value: 'searchBitable' },
          { name: '⭐ List Tables', value: 'listBitableTables' },
        ],
        default: 'readBitable',
      },
      {
        displayName: 'Bitable App Token',
        name: 'appToken',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { resource: ['bitable'], operation: ['readBitable', 'createBitable', 'updateBitable', 'deleteBitable', 'searchBitable', 'listBitableTables'] } },
        description: 'From the Bitable URL: https://xxx.feishu.cn/base/{AppToken}?...',
      },
      {
        displayName: 'Table ID',
        name: 'tableId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { resource: ['bitable'], operation: ['readBitable', 'createBitable', 'updateBitable', 'deleteBitable', 'searchBitable'] } },
        placeholder: 'tblXXXXXXXXXXXXX',
        description: 'Use "List Tables" to find table IDs',
      },
      {
        displayName: 'Page Size',
        name: 'pageSize',
        type: 'number',
        default: 50,
        displayOptions: { show: { resource: ['bitable'], operation: ['readBitable', 'searchBitable'] } },
        description: 'Max records per page (1-500)',
      },
      {
        displayName: 'Search Filter',
        name: 'searchFilter',
        type: 'string',
        default: '',
        displayOptions: { show: { resource: ['bitable'], operation: ['searchBitable'] } },
        placeholder: 'Field Name = "value"',
        description: 'Field name and value to search for (exact match)',
      },
      {
        displayName: 'Record ID',
        name: 'recordId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { resource: ['bitable'], operation: ['updateBitable', 'deleteBitable'] } },
        placeholder: 'recXXXXXXXXXXXXX',
        description: 'Record ID from a previous Read operation',
      },
      {
        displayName: 'Fields (JSON)',
        name: 'fields',
        type: 'json',
        default: '{\n  "Name": "value",\n  "Status": "done"\n}',
        required: true,
        displayOptions: { show: { resource: ['bitable'], operation: ['createBitable', 'updateBitable'] } },
      },

      // ═══════════ APPROVALS ═══════════
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['approvals'] } },
        options: [
          { name: '⭐ List Pending Approvals', value: 'listApprovals' },
          { name: '⭐ Get Approval Detail', value: 'getApprovalDetail' },
          { name: '⭐ Approve Instance', value: 'approveInstance' },
          { name: '⭐ Reject Instance', value: 'rejectInstance' },
        ],
        default: 'listApprovals',
      },
      {
        displayName: 'Approval Code',
        name: 'approvalCode',
        type: 'string',
        default: '',
        displayOptions: { show: { resource: ['approvals'], operation: ['listApprovals', 'getApprovalDetail', 'approveInstance', 'rejectInstance'] } },
        placeholder: 'Optional — filter by approval type',
        description: 'Leave empty to list all pending. Available from Feishu Admin → Approvals.',
      },
      {
        displayName: 'Instance Code',
        name: 'instanceCode',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { resource: ['approvals'], operation: ['getApprovalDetail', 'approveInstance', 'rejectInstance'] } },
        description: 'The specific approval instance. Get from "List Pending Approvals".',
      },
      {
        displayName: 'Comment (optional)',
        name: 'approvalComment',
        type: 'string',
        default: '',
        displayOptions: { show: { resource: ['approvals'], operation: ['approveInstance', 'rejectInstance'] } },
      },

      // ═══════════ CALENDAR ═══════════
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['calendar'] } },
        options: [
          { name: '⭐ List Events', value: 'listCalendarEvents' },
          { name: '⭐ Create Event', value: 'createCalendarEvent' },
        ],
        default: 'listCalendarEvents',
      },
      {
        displayName: 'Calendar ID',
        name: 'calendarId',
        type: 'string',
        default: 'primary',
        displayOptions: { show: { resource: ['calendar'], operation: ['listCalendarEvents', 'createCalendarEvent'] } },
        description: 'Calendar ID. Use "primary" for the default calendar.',
      },
      {
        displayName: 'Start Time',
        name: 'startTime',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { resource: ['calendar'], operation: ['listCalendarEvents'] } },
        placeholder: '2024-01-01T00:00:00+08:00',
      },
      {
        displayName: 'End Time',
        name: 'endTime',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { resource: ['calendar'], operation: ['listCalendarEvents'] } },
        placeholder: '2024-01-31T23:59:59+08:00',
      },
      {
        displayName: 'Event Title',
        name: 'eventTitle',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { resource: ['calendar'], operation: ['createCalendarEvent'] } },
      },
      {
        displayName: 'Event Start',
        name: 'eventStart',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { resource: ['calendar'], operation: ['createCalendarEvent'] } },
        placeholder: '2024-06-21T14:00:00',
        description: 'ISO 8601 datetime string',
      },
      {
        displayName: 'Event End',
        name: 'eventEnd',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { resource: ['calendar'], operation: ['createCalendarEvent'] } },
        placeholder: '2024-06-21T15:00:00',
      },
      {
        displayName: 'Description (optional)',
        name: 'eventDesc',
        type: 'string',
        typeOptions: { rows: 3 },
        default: '',
        displayOptions: { show: { resource: ['calendar'], operation: ['createCalendarEvent'] } },
      },

      // ═══════════ CONTACTS ═══════════
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['contacts'] } },
        options: [
          { name: '⭐ Get User Info', value: 'getUserInfo' },
          { name: '⭐ Search Users', value: 'searchUsers' },
        ],
        default: 'getUserInfo',
      },
      {
        displayName: 'Lookup By',
        name: 'lookupBy',
        type: 'options',
        options: [
          { name: 'Open ID', value: 'open_id' },
          { name: 'Email', value: 'email' },
          { name: 'Mobile', value: 'mobile' },
        ],
        default: 'open_id',
        displayOptions: { show: { resource: ['contacts'], operation: ['getUserInfo'] } },
      },
      {
        displayName: 'User ID / Email / Mobile',
        name: 'userLookup',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { resource: ['contacts'], operation: ['getUserInfo'] } },
        placeholder: 'ou_xxx or user@example.com',
      },
      {
        displayName: 'Search Query',
        name: 'userSearch',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { resource: ['contacts'], operation: ['searchUsers'] } },
        placeholder: 'john',
        description: 'Search by name or email prefix. Returns up to 50 matches.',
      },
    ],
  };

  // ═══════════════ EXECUTE ═══════════════
  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    const cred = await this.getCredentials('feishuApi') as {
      platform: Platform; appId: string; appSecret: string; licenseKey?: string;
    };
    const platform = cred.platform || 'feishu';
    const appId = cred.appId;
    const appSecret = cred.appSecret;
    const licenseKey = cred.licenseKey || '';
    const baseUrl = API_HOST[platform];

    // Check license for all resources except messaging-free
    // (License check is per-operation, not per-resource)

    for (let i = 0; i < items.length; i++) {
      try {
        const operation = this.getNodeParameter('operation', i) as string;

        // ── License gate ──
        if (PRO_OPS.includes(operation)) {
          if (!licenseKey) {
            throw new NodeOperationError(this.getNode(),
              '⭐ Pro feature. Add your License Key in credentials.\n👉 https://1717465779306.gumroad.com/l/feishu-pro');
          }
          const v = await validateLicense.call(this, licenseKey, appId);
          if (!v.valid) throw new NodeOperationError(this.getNode(), `License Key invalid: ${v.reason}`);
        }

        const token = await getToken(this, appId, appSecret, baseUrl);

        // ── Route ──
        const result = await executeOperation.call(this, operation, token, baseUrl, i);
        returnData.push({ json: result });
      } catch (err: any) {
        if (err instanceof NodeOperationError) {
          returnData.push({ json: { error: err.message }, error: err });
        } else {
          returnData.push({ json: { error: err.message || 'Unknown error' } });
        }
      }
    }
    return [returnData];
  }
}

// ─── Operation router ─────────────────────────────────────────────────
async function executeOperation(
  this: IExecuteFunctions,
  operation: string,
  token: string,
  baseUrl: string,
  i: number,
): Promise<any> {
  const hdr = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  switch (operation) {

    // ── MESSAGING ──────────────────────────────────────────
    case 'sendTextMessage': {
      const idType = this.getNodeParameter('receiveIdType', i) as string;
      const rid = this.getNodeParameter('receiveId', i) as string;
      const text = this.getNodeParameter('textContent', i) as string;
      return await this.helpers.request({
        method: 'POST', url: `${baseUrl}/open-apis/im/v1/messages?receive_id_type=${idType}`,
        headers: hdr,
        body: { receive_id: rid, msg_type: 'text', content: JSON.stringify({ text }) },
        json: true,
      });
    }

    case 'sendCardMessage': {
      const idType = this.getNodeParameter('receiveIdType', i) as string;
      const rid = this.getNodeParameter('receiveId', i) as string;
      const title = this.getNodeParameter('cardTitle', i) as string;
      const body = this.getNodeParameter('cardContent', i) as string;
      const color = this.getNodeParameter('cardColor', i) as string;
      const colorMap: Record<string, string> = { blue: 'blue', green: 'green', red: 'red', yellow: 'yellow', purple: 'purple', default: 'default' };
      return await this.helpers.request({
        method: 'POST', url: `${baseUrl}/open-apis/im/v1/messages?receive_id_type=${idType}`,
        headers: hdr,
        body: {
          receive_id: rid, msg_type: 'interactive',
          content: JSON.stringify({
            config: { wide_screen_mode: true },
            header: {
              title: { tag: 'plain_text', content: title },
              ...(color !== 'default' ? { template: colorMap[color] } : {}),
            },
            elements: [{ tag: 'div', text: { tag: 'lark_md', content: body } }],
          }),
        },
        json: true,
      });
    }

    case 'sendImage': {
      const idType = this.getNodeParameter('receiveIdType', i) as string;
      const rid = this.getNodeParameter('receiveId', i) as string;
      const imgSource = this.getNodeParameter('imageSource', i) as string;
      let imageKey: string;
      if (imgSource === 'key') {
        imageKey = this.getNodeParameter('imageKey', i) as string;
      } else {
        const imgUrl = this.getNodeParameter('imageUrl', i) as string;
        imageKey = await downloadAndUploadImage(imgUrl, token, baseUrl);
      }
      return await this.helpers.request({
        method: 'POST', url: `${baseUrl}/open-apis/im/v1/messages?receive_id_type=${idType}`,
        headers: hdr,
        body: { receive_id: rid, msg_type: 'image', content: JSON.stringify({ image_key: imageKey }) },
        json: true,
      });
    }

    case 'sendFile': {
      const idType = this.getNodeParameter('receiveIdType', i) as string;
      const rid = this.getNodeParameter('receiveId', i) as string;
      const fileSource = this.getNodeParameter('fileSource', i) as string;
      const fName = this.getNodeParameter('fileName', i) as string;
      let fileKey: string;
      if (fileSource === 'key') {
        fileKey = this.getNodeParameter('fileKey', i) as string;
      } else {
        const fileUrl = this.getNodeParameter('fileUrl', i) as string;
        fileKey = await downloadAndUploadFile(fileUrl, fName, token, baseUrl);
      }
      return await this.helpers.request({
        method: 'POST', url: `${baseUrl}/open-apis/im/v1/messages?receive_id_type=${idType}`,
        headers: hdr,
        body: { receive_id: rid, msg_type: 'file', content: JSON.stringify({ file_key: fileKey, file_name: fName }) },
        json: true,
      });
    }

    case 'batchSend': {
      const raw = this.getNodeParameter('batchRecipients', i) as string;
      const msg = this.getNodeParameter('batchMessage', i) as string;
      const ids = raw.split('\n').map(s => s.trim()).filter(Boolean);
      const results: any[] = [];
      for (const rid of ids) {
        const idType = rid.includes('@') ? 'email' : (rid.startsWith('ou_') ? 'open_id' : 'open_id');
        try {
          const r = await this.helpers.request({
            method: 'POST', url: `${baseUrl}/open-apis/im/v1/messages?receive_id_type=${idType}`,
            headers: hdr,
            body: { receive_id: rid, msg_type: 'text', content: JSON.stringify({ text: msg }) },
            json: true,
          });
          results.push({ recipient: rid, status: 'sent', messageId: (r as any).data?.message_id });
        } catch (e: any) {
          results.push({ recipient: rid, status: 'failed', error: e.message });
        }
      }
      return { results, sent: results.filter(r => r.status === 'sent').length, failed: results.filter(r => r.status === 'failed').length };
    }

    // ── BITABLE ────────────────────────────────────────────
    case 'readBitable': {
      const appToken = this.getNodeParameter('appToken', i) as string;
      const tableId = this.getNodeParameter('tableId', i) as string;
      const ps = this.getNodeParameter('pageSize', i) as number;
      const res: any = await this.helpers.request({
        method: 'GET', url: `${baseUrl}/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records?page_size=${ps}`,
        headers: { Authorization: `Bearer ${token}` }, json: true,
      });
      return { total: res.data?.total || 0, pageSize: ps, records: (res.data?.items || []).map((it: any) => ({ recordId: it.record_id, ...it.fields })) };
    }

    case 'createBitable': {
      const appToken = this.getNodeParameter('appToken', i) as string;
      const tableId = this.getNodeParameter('tableId', i) as string;
      const fields = this.getNodeParameter('fields', i) as any;
      return await this.helpers.request({
        method: 'POST', url: `${baseUrl}/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records`,
        headers: hdr,
        body: { fields: typeof fields === 'string' ? JSON.parse(fields) : fields },
        json: true,
      });
    }

    case 'updateBitable': {
      const appToken = this.getNodeParameter('appToken', i) as string;
      const tableId = this.getNodeParameter('tableId', i) as string;
      const recId = this.getNodeParameter('recordId', i) as string;
      const fields = this.getNodeParameter('fields', i) as any;
      return await this.helpers.request({
        method: 'PUT', url: `${baseUrl}/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/${recId}`,
        headers: hdr,
        body: { fields: typeof fields === 'string' ? JSON.parse(fields) : fields },
        json: true,
      });
    }

    case 'deleteBitable': {
      const appToken = this.getNodeParameter('appToken', i) as string;
      const tableId = this.getNodeParameter('tableId', i) as string;
      const recId = this.getNodeParameter('recordId', i) as string;
      return await this.helpers.request({
        method: 'DELETE', url: `${baseUrl}/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records/${recId}`,
        headers: { Authorization: `Bearer ${token}` }, json: true,
      });
    }

    case 'searchBitable': {
      const appToken = this.getNodeParameter('appToken', i) as string;
      const tableId = this.getNodeParameter('tableId', i) as string;
      const filter = this.getNodeParameter('searchFilter', i) as string;
      const ps = this.getNodeParameter('pageSize', i) as number;
      // Use search filter with the bitable filter parameter
      let url = `${baseUrl}/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records?page_size=${ps}`;
      if (filter) url += `&filter=${encodeURIComponent(filter)}`;
      const res: any = await this.helpers.request({
        method: 'GET', url, headers: { Authorization: `Bearer ${token}` }, json: true,
      });
      return { total: res.data?.total || 0, matched: (res.data?.items || []).map((it: any) => ({ recordId: it.record_id, ...it.fields })) };
    }

    case 'listBitableTables': {
      const appToken = this.getNodeParameter('appToken', i) as string;
      const res: any = await this.helpers.request({
        method: 'GET', url: `${baseUrl}/open-apis/bitable/v1/apps/${appToken}/tables`,
        headers: { Authorization: `Bearer ${token}` }, json: true,
      });
      return { tables: (res.data?.items || []).map((t: any) => ({ tableId: t.table_id, name: t.name, revision: t.revision })) };
    }

    // ── APPROVALS ──────────────────────────────────────────
    case 'listApprovals': {
      const ac = this.getNodeParameter('approvalCode', i) as string;
      let url = `${baseUrl}/open-apis/approval/v4/instances?page_size=20&status=PENDING`;
      if (ac) url += `&approval_code=${ac}`;
      const res: any = await this.helpers.request({ method: 'GET', url, headers: { Authorization: `Bearer ${token}` }, json: true });
      return { pending: (res.data?.instance_list || []).map((inst: any) => ({ instanceCode: inst.instance_code, approvalName: inst.approval_name, startTime: inst.start_time, status: inst.status })) };
    }

    case 'getApprovalDetail': {
      const instCode = this.getNodeParameter('instanceCode', i) as string;
      const res: any = await this.helpers.request({
        method: 'GET', url: `${baseUrl}/open-apis/approval/v4/instances/${instCode}`,
        headers: { Authorization: `Bearer ${token}` }, json: true,
      });
      return { instanceCode: res.data?.instance_code, approvalName: res.data?.approval_name, status: res.data?.status, form: res.data?.form, timeline: res.data?.timeline };
    }

    case 'approveInstance': {
      const instCode = this.getNodeParameter('instanceCode', i) as string;
      const comment = this.getNodeParameter('approvalComment', i) as string;
      return await this.helpers.request({
        method: 'POST', url: `${baseUrl}/open-apis/approval/v4/instances/${instCode}/approve`,
        headers: hdr, body: { comment }, json: true,
      });
    }

    case 'rejectInstance': {
      const instCode = this.getNodeParameter('instanceCode', i) as string;
      const comment = this.getNodeParameter('approvalComment', i) as string;
      return await this.helpers.request({
        method: 'POST', url: `${baseUrl}/open-apis/approval/v4/instances/${instCode}/reject`,
        headers: hdr, body: { comment }, json: true,
      });
    }

    // ── CALENDAR ───────────────────────────────────────────
    case 'listCalendarEvents': {
      const calId = this.getNodeParameter('calendarId', i) as string;
      const st = this.getNodeParameter('startTime', i) as string;
      const et = this.getNodeParameter('endTime', i) as string;
      const res: any = await this.helpers.request({
        method: 'GET', url: `${baseUrl}/open-apis/calendar/v4/calendars/${calId}/events?start_time=${encodeURIComponent(st)}&end_time=${encodeURIComponent(et)}`,
        headers: { Authorization: `Bearer ${token}` }, json: true,
      });
      return { events: (res.data?.items || []).map((ev: any) => ({ eventId: ev.event_id, summary: ev.summary, start: ev.start?.date_time, end: ev.end?.date_time, status: ev.status })) };
    }

    case 'createCalendarEvent': {
      const calId = this.getNodeParameter('calendarId', i) as string;
      const title = this.getNodeParameter('eventTitle', i) as string;
      const st = this.getNodeParameter('eventStart', i) as string;
      const et = this.getNodeParameter('eventEnd', i) as string;
      const desc = this.getNodeParameter('eventDesc', i) as string;
      return await this.helpers.request({
        method: 'POST', url: `${baseUrl}/open-apis/calendar/v4/calendars/${calId}/events`,
        headers: hdr,
        body: { summary: title, start: { date_time: st }, end: { date_time: et }, ...(desc ? { description: desc } : {}) },
        json: true,
      });
    }

    // ── CONTACTS ───────────────────────────────────────────
    case 'getUserInfo': {
      const by = this.getNodeParameter('lookupBy', i) as string;
      const val = this.getNodeParameter('userLookup', i) as string;
      let url = `${baseUrl}/open-apis/contact/v3/users`;
      if (by === 'open_id') url += `/${val}`;
      else if (by === 'email') url += `?email=${encodeURIComponent(val)}`;
      else url += `?mobile=${encodeURIComponent(val)}`;
      const res: any = await this.helpers.request({ method: 'GET', url, headers: { Authorization: `Bearer ${token}` }, json: true });
      const user = (res.data?.user || res.data?.items?.[0] || {});
      return { openId: user.open_id, name: user.name, email: user.email, mobile: user.mobile, departmentIds: user.department_ids, avatar: user.avatar_url };
    }

    case 'searchUsers': {
      const q = this.getNodeParameter('userSearch', i) as string;
      const res: any = await this.helpers.request({
        method: 'GET', url: `${baseUrl}/open-apis/contact/v3/users?page_size=50`,
        headers: { Authorization: `Bearer ${token}` }, json: true,
      });
      const all = (res.data?.items || []).map((u: any) => ({ openId: u.open_id, name: u.name, email: u.email, mobile: u.mobile, departmentIds: u.department_ids }));
      const lower = q.toLowerCase();
      return { query: q, results: all.filter((u: any) => (u.name || '').toLowerCase().includes(lower) || (u.email || '').toLowerCase().includes(lower)) };
    }

    default:
      throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`);
  }
}

// ─── Auto-download + upload helpers ────────────────────────────────────

async function downloadFile(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? require('https') : require('http');
    mod.get(url, (resp: any) => {
      if (resp.statusCode >= 400) { reject(new Error(`Download failed: HTTP ${resp.statusCode}`)); return; }
      // Follow redirects (up to 3)
      if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
        downloadFile(resp.headers.location).then(resolve, reject);
        return;
      }
      const chunks: Buffer[] = [];
      resp.on('data', (c: Buffer) => chunks.push(c));
      resp.on('end', () => resolve(Buffer.concat(chunks)));
      resp.on('error', reject);
    }).on('error', reject);
  });
}

async function uploadFormData(baseUrl: string, token: string, path: string, formFields: Record<string, {value: any; filename?: string; contentType?: string}>): Promise<any> {
  return new Promise((resolve, reject) => {
    const FormData = require('form-data');
    const form = new FormData();
    for (const [key, field] of Object.entries(formFields)) {
      if (field.filename) {
        form.append(key, field.value, { filename: field.filename, contentType: field.contentType });
      } else {
        form.append(key, field.value);
      }
    }
    const https = require('https');
    const url = new URL(`${baseUrl}${path}`);
    const req = https.request({
      hostname: url.hostname, path: url.pathname, method: 'POST',
      headers: { ...form.getHeaders(), Authorization: `Bearer ${token}` },
    }, (resp: any) => {
      let d = ''; resp.on('data', (c: any) => d += c); resp.on('end', () => {
        try { resolve(JSON.parse(d)); } catch { reject(new Error(`Upload failed: ${d.slice(0,200)}`)); }
      });
    });
    req.on('error', reject);
    form.pipe(req);
  });
}

async function downloadAndUploadImage(imgUrl: string, token: string, baseUrl: string): Promise<string> {
  const buffer = await downloadFile(imgUrl);
  const res: any = await uploadFormData(baseUrl, token, '/open-apis/im/v1/images', {
    image_type: { value: 'message' },
    image: { value: buffer, filename: 'image.png', contentType: 'image/png' },
  });
  if (res.code !== 0) throw new Error(`Image upload failed: ${res.msg} (code ${res.code})`);
  return res.data.image_key;
}

async function downloadAndUploadFile(fileUrl: string, fileName: string, token: string, baseUrl: string): Promise<string> {
  const buffer = await downloadFile(fileUrl);
  const res: any = await uploadFormData(baseUrl, token, '/open-apis/im/v1/files', {
    file_type: { value: 'stream' },
    file_name: { value: fileName },
    file: { value: buffer, filename: fileName },
  });
  if (res.code !== 0) throw new Error(`File upload failed: ${res.msg} (code ${res.code})`);
  return res.data.file_key;
}
