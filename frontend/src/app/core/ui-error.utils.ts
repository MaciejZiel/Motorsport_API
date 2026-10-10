import { HttpErrorResponse } from '@angular/common/http';
import { isDevMode } from '@angular/core';

export function reportUiError(error: unknown): void {
  if (isDevMode()) {
    console.error(error);
  }
}

function collectMessages(value: unknown, into: string[]): void {
  if (typeof value === 'string') {
    if (value.trim()) {
      into.push(value.trim());
    }
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectMessages(item, into));
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => collectMessages(item, into));
  }
}

/**
 * Validation messages from the API's error envelope
 * (`{ error, detail, errors: { field: [messages] } }`), falling back to `detail`.
 */
export function apiErrorMessages(error: unknown): string[] {
  if (!(error instanceof HttpErrorResponse) || !error.error || typeof error.error !== 'object') {
    return [];
  }
  const payload = error.error as Record<string, unknown>;
  const messages: string[] = [];
  collectMessages(payload['errors'], messages);
  if (!messages.length) {
    collectMessages(payload['detail'], messages);
  }
  return messages;
}
