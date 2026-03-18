import { isDevMode } from '@angular/core';

export function reportUiError(error: unknown): void {
  if (isDevMode()) {
    console.error(error);
  }
}
