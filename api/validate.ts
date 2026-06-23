/**
 * Vercel Edge Function — License Key Validation
 *
 * Deploy: vercel deploy --prod
 * Endpoint: POST https://your-domain.vercel.app/api/validate
 *
 * Environment variables (set in Vercel dashboard):
 *   VALID_KEYS: comma-separated list of valid license keys
 *     e.g. "FLS-AAAA-BBBB-CCCC,FLS-DDDD-EEEE-FFFF"
 *   PRO_KEYS: comma-separated list of pro-plan keys
 *   TRIAL_KEYS: comma-separated trial keys
 */

interface RequestBody {
  key: string;
  appId?: string;
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ valid: false, reason: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ valid: false, reason: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { key } = body;
  if (!key || typeof key !== 'string') {
    return new Response(JSON.stringify({ valid: false, reason: 'Missing license key' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Load valid keys from environment
  const validKeys = (process.env.VALID_KEYS || '').split(',').map((k: string) => k.trim());
  const proKeys = (process.env.PRO_KEYS || '').split(',').map((k: string) => k.trim());
  const trialKeys = (process.env.TRIAL_KEYS || '').split(',').map((k: string) => k.trim());

  // Check if key exists
  const allValid = [...validKeys, ...proKeys, ...trialKeys];
  if (!allValid.includes(key)) {
    return new Response(
      JSON.stringify({
        valid: false,
        reason: 'Invalid license key. Purchase at https://gumroad.com/l/feishu-pro',
      }),
      {
        status: 200, // 200 even for invalid — avoid network errors on client
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Determine plan
  let plan = 'pro';
  if (trialKeys.includes(key)) {
    plan = 'trial';
  } else if (proKeys.includes(key)) {
    plan = 'pro';
  }

  return new Response(
    JSON.stringify({
      valid: true,
      plan,
      expiry: plan === 'trial' ? '7 days from activation' : 'lifetime',
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

export const config = {
  runtime: 'edge',
};
