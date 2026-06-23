# @lixiongwei/n8n-nodes-feishu

> **Feishu / Lark** integration nodes for n8n — messaging, Bitable CRUD, approvals, calendar & contacts.
> Free tier + Pro License. Includes workflow templates.

---

## 📦 Install

```bash
npm install @lixiongwei/n8n-nodes-feishu
```

Requires: n8n self-hosted. (n8n Cloud does not support community nodes.)

---

## 🎮 Capabilities

### 🆓 Free

| Category | Operation | Description |
|----------|-----------|-------------|
| **Messaging** | Send Text Message | Send plain text to users or groups |
| **Trigger** | Message Received | Webhook — fires when the bot receives a message |

### ⭐ Pro — $49 one-time ([get a key](https://1717465779306.gumroad.com/l/feishu-pro))

| Category | Operations |
|----------|------------|
| **Messaging** | Send Card Message (with Markdown & color), Send Image, Send File, Batch Send to multiple recipients |
| **Bitable** | Read Records, Create Record, Update Record, Delete Record, Search Records, List Tables |
| **Approvals** | List Pending, Get Detail, Approve, Reject |
| **Calendar** | List Events, Create Event |
| **Contacts** | Get User Info (by Open ID / Email / Mobile), Search Users |

---

## 🚀 Quick Start (3 steps)

### 1. Create a Feishu/Lark app

1. Go to [Feishu Dev Console](https://open.feishu.cn/) (or [Lark Dev Console](https://open.larksuite.com/))
2. Create an **Enterprise Internal App**
3. Enable **Bot** capability (App Capabilities → Bot → Enable)
4. Go to **Permissions** → add at minimum:
   - `im:message:send_as_bot` (send messages)
   - `contact:contact.base:readonly` (for Contacts operations)
5. Go to **Version Management** → Create version → **Publish**
6. Copy your **App ID** and **App Secret** from Credentials & Basic Info

### 2. Configure n8n

1. n8n → **Credentials** → New → search `Feishu` → select **Feishu / Lark API**
2. Choose your platform (Feishu for China, Lark for International)
3. Enter App ID + App Secret
4. (Optional) Enter License Key for Pro features

### 3. Start building

Drag the **Feishu / Lark** node onto your canvas → select a Resource → select an Operation → configure → test.

---

## 📋 Included Workflow Templates

Import from `node_modules/@lixiongwei/n8n-nodes-feishu/workflows/` (n8n → Import from File):

| # | File | What it does | Key Feishu nodes used |
|---|------|-------------|----------------------|
| 01 | `wf-01-webhook-to-feishu.json` | Any external event → Feishu card | Send Card, severity colors |
| 02 | `wf-02-scheduled-report.json` | Daily data pull → format → Feishu card | Send Card, Cron |
| 03 | `wf-03-alert-escalation.json` | Site monitor → alert card + batch notify | Send Card, Batch Send |
| 04 | `wf-04-form-to-bitable.json` | Form submit → lookup user → Bitable write → card notify | Contacts, Bitable Create, Send Card |
| 05 | `wf-05-approval-auto-remind.json` | Check pending approvals → auto-remind approvers | Approvals List, Send Card |
| 06 | `wf-06-calendar-weekly-digest.json` | Monday morning → push this week's events | Calendar List, Send Card |
| 07 | `wf-07-rss-digest.json` | Pull data feed → archive to Bitable → push card | Bitable Create, Send Card |
| 08 | `wf-08-github-to-feishu.json` | GitHub webhook → card for Push/PR/Issue | Send Card, Webhook |

---

## 🔧 Common Patterns

| I want to... | Use this |
|-------------|----------|
| CI/CD or form → Feishu notification | wf-01 — Webhook → Card |
| Daily data report in Feishu | wf-02 — Cron → Fetch → Card |
| Downtime alert + notify on-call team | wf-03 — Check → If → Card + Batch |
| Form → CRM with user lookup | wf-04 — Webhook → Contacts → Bitable → Card |
| Auto-remind pending approvals | wf-05 — Cron → List Approvals → Card |
| Weekly meeting digest | wf-06 — Cron → List Events → Card |
| RSS/data feed → archive + push | wf-07 — Cron → Fetch → Bitable → Card |
| GitHub events → team channel | wf-08 — Webhook → Card |

---

## ⚠️ Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `Bot ability not activated (230006)` | Bot not enabled in app | App Capabilities → Enable Bot → Republish |
| `Permission denied (99991672)` | Missing API scope | Permissions → Add required scope → Republish |
| `Recipient ID not found (99992351)` | Wrong ID type or not in app scope | Use Contacts → Get User Info to find the correct ID |
| `Invalid tenant access token` | Wrong App ID or Secret | Double-check from Developer Console → Credentials |
| `This is a Pro feature` | No license key | Get one at the Gumroad link, or use a Free operation |
| Workflow stuck spinning | Method is GET instead of POST | Check the node configuration — content-sending operations need POST |
| Webhook URL not receiving events | App not configured for events | Add Request URL in Feishu Dev Console → Event Subscriptions |

---

## 🌍 Feishu vs Lark

Feishu (飞书) and Lark share the same API but use **different domains**:

| Platform | API Base | Used in |
|----------|----------|---------|
| Feishu | `open.feishu.cn` | China |
| Lark | `open.larksuite.com` | International (Singapore, US, etc.) |

Choose the correct platform in your n8n credentials. If you get `99991663` errors, you likely have the wrong platform selected.

---

## 💰 License

```
npm install → FREE features work immediately
         ↓
  Try Pro operation → prompted for License Key
         ↓
  Get Key: https://1717465779306.gumroad.com/l/feishu-pro
         ↓
  Enter Key in credentials → ALL features unlocked forever
```

One-time payment. No subscription. Lifetime access.

---

- **n8n version**: 1.x+ (v2 recommended)
- **Feishu API**: v3
- **License**: MIT
- **Support**: Reply on [n8n Community Forum](https://community.n8n.io/c/community-nodes/11)
