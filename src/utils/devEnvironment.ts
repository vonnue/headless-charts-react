// Module-local declaration so this compiles without @types/node.
declare const process: { env?: { NODE_ENV?: string } } | undefined;

/**
 * Dev-only gate. `process.env.NODE_ENV` is used rather than
 * `import.meta.env.DEV` because Vite's library mode statically replaces
 * `import.meta.env.*` when this package is built, which would strip the
 * warnings from the published bundle for everyone. `process.env.NODE_ENV` is
 * left as-is in library builds and is replaced by the *consumer's* bundler
 * (Vite, webpack, Next, ...), so warnings show in their dev builds and are
 * dead-code-eliminated in their production builds. The try/catch keeps
 * environments with no `process` at all (unbundled ESM in a browser) from
 * throwing; they get no warnings.
 */
export const isDevEnvironment = (): boolean => {
  try {
    return process!.env!.NODE_ENV !== 'production';
  } catch {
    return false;
  }
};

const warnedKeys = new Set<string>();

/**
 * `console.warn(message)` in development only, and at most once per `key` for
 * the lifetime of the page, so a warning computed during a redraw (resize,
 * re-render, StrictMode double effects) is not repeated. Callers put whatever
 * makes the problem distinct (chart, id, offending value) into `key`.
 */
export const warnOnceInDev = (key: string, message: string): void => {
  if (!isDevEnvironment() || warnedKeys.has(key)) return;
  warnedKeys.add(key);
  console.warn(message);
};
