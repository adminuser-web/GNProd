// Global console guard.
//
// In PRODUCTION builds, wraps every console method so its arguments pass through
// the PII/secret scrubber (logRedaction.ts) before reaching the real console.
// This masks names, emails, phones, addresses, API keys, JWTs and bearer tokens
// in the browser devtools — including logs from third-party libraries and any
// future `console.*` call, without touching individual call sites.
//
// In DEVELOPMENT it's a no-op, so local debugging shows full, unredacted output.

import { scrubArg } from './logRedaction';

let installed = false;

export function installConsoleGuard(): void {
  if (installed) return;
  installed = true;

  // Only mask in production — keep dev logs fully readable.
  if (!import.meta.env.PROD) return;

  const c = console as unknown as Record<string, (...a: unknown[]) => void>;
  const methods = ['log', 'info', 'debug', 'warn', 'error', 'trace'] as const;

  for (const m of methods) {
    const original = typeof c[m] === 'function' ? c[m].bind(console) : undefined;
    if (!original) continue;
    c[m] = (...args: unknown[]) => {
      try {
        original(...args.map(scrubArg));
      } catch {
        original('[log suppressed]');
      }
    };
  }
}
