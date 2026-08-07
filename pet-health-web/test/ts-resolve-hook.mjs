/**
 * Node ESM loader: resolve extensionless relative imports to .ts / index.ts
 * so unit tests can import Next/bundler-style modules.
 */
export async function resolve(specifier, context, nextResolve) {
  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    !/\.[cm]?[jt]sx?$/.test(specifier)
  ) {
    try {
      return await nextResolve(`${specifier}.ts`, context);
    } catch {
      try {
        return await nextResolve(`${specifier}.tsx`, context);
      } catch {
        try {
          return await nextResolve(`${specifier}/index.ts`, context);
        } catch {
          // fall through
        }
      }
    }
  }
  return nextResolve(specifier, context);
}
