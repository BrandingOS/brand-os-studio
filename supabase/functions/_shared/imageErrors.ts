// Error taxonomy for image generation.
//
// Two audiences, two payloads:
//   • the browser gets {code, message} — a normalized category and a sentence a
//     human can act on. Never provider text: those bodies routinely carry org
//     ids, billing thresholds and quota internals.
//   • the diagnostics table gets the raw status + body, unreachable from any
//     client role, so debugging still works.

export type ImageErrorCode =
  | 'invalid_input'
  | 'authentication'
  | 'insufficient_quota'
  | 'rate_limited'
  | 'safety_rejection'
  | 'unsupported_setting'
  | 'provider_unavailable'
  | 'timeout'
  | 'storage_failure'
  | 'insufficient_credits'
  | 'cancelled'
  | 'unknown';

export interface NormalizedError {
  code: ImageErrorCode;
  /** Safe to show a user. */
  message: string;
  /** HTTP status for our own response. */
  status: number;
  /** True when the same request could plausibly succeed if retried. */
  retryable: boolean;
  /** Raw provider material — diagnostics table only, never the response body. */
  providerStatus?: number;
  providerError?: string;
}

export class ImageGenerationError extends Error {
  readonly normalized: NormalizedError;
  constructor(normalized: NormalizedError) {
    super(normalized.message);
    this.name = 'ImageGenerationError';
    this.normalized = normalized;
  }
}

const USER_MESSAGE: Record<ImageErrorCode, string> = {
  invalid_input: 'That request could not be used as written. Try rephrasing the prompt.',
  authentication: 'The image service is not configured correctly. This is on us — please try again shortly.',
  insufficient_quota: 'The image provider has no quota left on this account. Try another model or try again later.',
  rate_limited: 'Too many requests right now. Wait a moment and try again.',
  safety_rejection: 'The provider declined this request under its content policy. Try describing the scene differently.',
  unsupported_setting: 'This model cannot honour one of the chosen settings.',
  provider_unavailable: 'The image provider is unavailable right now. Try again, or switch model.',
  timeout: 'The image took too long and was stopped. Try again, or reduce the number of images.',
  storage_failure: 'The image was generated but could not be saved. No credits were charged.',
  insufficient_credits: 'Not enough credits for this generation.',
  cancelled: 'Generation cancelled.',
  unknown: 'Image generation failed. Try again, or switch model.',
};

const STATUS: Record<ImageErrorCode, number> = {
  invalid_input: 400,
  authentication: 503,
  insufficient_quota: 503,
  rate_limited: 429,
  safety_rejection: 422,
  unsupported_setting: 400,
  provider_unavailable: 502,
  timeout: 504,
  storage_failure: 500,
  insufficient_credits: 402,
  cancelled: 499,
  unknown: 502,
};

const RETRYABLE: ImageErrorCode[] = ['rate_limited', 'provider_unavailable', 'timeout', 'unknown'];

export function imageError(
  code: ImageErrorCode,
  extra: { message?: string; providerStatus?: number; providerError?: string } = {},
): ImageGenerationError {
  return new ImageGenerationError({
    code,
    message: extra.message ?? USER_MESSAGE[code],
    status: STATUS[code],
    retryable: RETRYABLE.includes(code),
    providerStatus: extra.providerStatus,
    providerError: extra.providerError,
  });
}

/**
 * Map a provider HTTP failure onto the taxonomy. The body is inspected only to
 * choose a category — not a single byte of it reaches the caller.
 */
export function normalizeProviderFailure(
  vendor: string,
  status: number,
  body: string,
): ImageGenerationError {
  const text = (body ?? '').toLowerCase();
  let code: ImageErrorCode;

  if (status === 401 || status === 403) {
    code = /quota|billing|credit|payment|exceeded/.test(text) ? 'insufficient_quota' : 'authentication';
  } else if (status === 429) {
    code = /quota|billing|insufficient|exceeded your current quota/.test(text)
      ? 'insufficient_quota'
      : 'rate_limited';
  } else if (status === 400 || status === 422) {
    if (/safety|content policy|blocked|moderation|prohibited|violat/.test(text)) code = 'safety_rejection';
    else if (/unsupported|not supported|invalid.*(size|aspect|quality|parameter)/.test(text)) code = 'unsupported_setting';
    else code = 'invalid_input';
  } else if (status === 402) {
    code = 'insufficient_quota';
  } else if (status === 408 || status === 504) {
    code = 'timeout';
  } else if (status >= 500) {
    code = 'provider_unavailable';
  } else {
    code = 'unknown';
  }

  return imageError(code, {
    providerStatus: status,
    providerError: `${vendor} ${status}: ${(body ?? '').slice(0, 2000)}`,
  });
}

/** Map a thrown JS error (abort, network, parse) onto the taxonomy. */
export function normalizeThrown(vendor: string, err: unknown): ImageGenerationError {
  if (err instanceof ImageGenerationError) return err;
  const name = (err as Error)?.name ?? '';
  const message = (err as Error)?.message ?? String(err);
  if (name === 'AbortError' || /abort/i.test(message)) {
    return imageError('timeout', { providerError: `${vendor}: ${message}` });
  }
  if (/fetch failed|network|econnreset|enotfound|dns/i.test(message)) {
    return imageError('provider_unavailable', { providerError: `${vendor}: ${message}` });
  }
  return imageError('unknown', { providerError: `${vendor}: ${message.slice(0, 2000)}` });
}
