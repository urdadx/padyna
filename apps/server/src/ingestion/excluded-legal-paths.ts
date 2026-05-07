export const excludedLegalPathPatterns = ["^/?(privacy|terms-of-service)/?$"];

const excludedLegalPathRegex = /^\/(privacy|terms-of-service)\/?$/i;

export function isExcludedLegalPath(url: string) {
  try {
    return excludedLegalPathRegex.test(new URL(url).pathname);
  } catch {
    return false;
  }
}
