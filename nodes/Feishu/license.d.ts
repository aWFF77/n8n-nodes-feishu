import { IExecuteFunctions } from 'n8n-workflow';
interface ValidationResult {
    valid: boolean;
    reason?: string;
    plan?: string;
    expiry?: string;
}
/**
 * Offline-first license validation.
 * When VALIDATION_URL is set, also tries remote validation.
 * When empty (default), uses built-in key verification.
 */
export declare function validateLicense(this: IExecuteFunctions, licenseKey: string, _appId: string): Promise<ValidationResult>;
export {};
