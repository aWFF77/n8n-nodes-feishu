import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class FeishuApi implements ICredentialType {
  name = 'feishuApi';
  displayName = 'Feishu / Lark API';
  documentationUrl = 'https://open.feishu.cn/document/home/getting-started';

  properties: INodeProperties[] = [
    {
      displayName: 'Platform',
      name: 'platform',
      type: 'options',
      options: [
        {
          name: 'Feishu (飞书) — China',
          value: 'feishu',
          description: 'API domain: open.feishu.cn',
        },
        {
          name: 'Lark — International',
          value: 'lark',
          description: 'API domain: open.larksuite.com',
        },
      ],
      default: 'feishu',
      description: 'Choose Feishu for China, Lark for international users',
    },
    {
      displayName: 'App ID',
      name: 'appId',
      type: 'string',
      default: '',
      description: 'From Developer Console → Credentials & Basic Info',
      required: true,
    },
    {
      displayName: 'App Secret',
      name: 'appSecret',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      required: true,
    },
    {
      displayName: 'License Key (optional)',
      name: 'licenseKey',
      type: 'string',
      default: '',
      description:
        'Pro License Key → Unlock all features. Leave empty for free features. Get one: https://1717465779306.gumroad.com/l/feishu-pro',
      required: false,
    },
  ];
}
