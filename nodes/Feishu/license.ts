import { IExecuteFunctions } from 'n8n-workflow';

// Optional: remote validation URL. Set to '' to use offline-only mode.
const VALIDATION_URL = '';

interface ValidationResult {
  valid: boolean;
  reason?: string;
  plan?: string;
  expiry?: string;
}

// In-memory cache
const cache: Map<string, { result: ValidationResult; ts: number }> = new Map();

/**
 * Offline-first license validation.
 * When VALIDATION_URL is set, also tries remote validation.
 * When empty (default), uses built-in key verification.
 */
export async function validateLicense(
  this: IExecuteFunctions,
  licenseKey: string,
  _appId: string,
): Promise<ValidationResult> {
  const cached = cache.get(licenseKey);
  if (cached && Date.now() - cached.ts < 86_400_000) {
    return cached.result;
  }

  // --- Local validation ---
  const result = validateLocal(licenseKey);

  // --- Optional: try remote validation ---
  if (VALIDATION_URL) {
    try {
      const response = await this.helpers.request({
        method: 'POST',
        url: VALIDATION_URL,
        headers: { 'Content-Type': 'application/json' },
        body: { key: licenseKey },
        json: true,
        timeout: 5000,
      });
      const remoteResult = response as ValidationResult;
      cache.set(licenseKey, { result: remoteResult, ts: Date.now() });
      return remoteResult;
    } catch {
      // Network fail — fall back to local result
    }
  }

  cache.set(licenseKey, { result, ts: Date.now() });
  return result;
}

/**
 * Local key validation.
 * Format: FLS-XXXX-XXXX-XXXX
 * - TRIAL prefix ⇒ 7-day trial
 * - PRO prefix ⇒ lifetime
 * - Matches known test keys
 */
function validateLocal(key: string): ValidationResult {
  const cleaned = key.trim().toUpperCase();

  // Test keys (hardcoded for MVP)
  const TEST_KEYS: Record<string, { plan: string }> = {
    'FLS-TEST-PRO-KEY1': { plan: 'pro' },
    'FLS-TEST-TRIAL-KEY': { plan: 'trial' },
  };

  if (TEST_KEYS[cleaned]) {
    return {
      valid: true,
      plan: TEST_KEYS[cleaned].plan,
      expiry: TEST_KEYS[cleaned].plan === 'trial' ? '7 days' : 'lifetime',
    };
  }

  // Pattern-based: valid if matches FLS-PRO-XXXXXXXX format
  if (/^FLS-PRO-[A-Z0-9]{4,}$/.test(cleaned)) {
    return { valid: true, plan: 'pro', expiry: 'lifetime' };
  }

  if (/^FLS-(TRIAL|TEST)-/.test(cleaned)) {
    return { valid: true, plan: 'trial', expiry: '7 days' };
  }

  return { valid: false, reason: 'Invalid License Key. Get one at: https://1717465779306.gumroad.com/l/feishu-pro' };
}
