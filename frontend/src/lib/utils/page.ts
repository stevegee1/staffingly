/**
 * Generates a kebab-case URL for a given page name.
 * Converts PascalCase or camelCase to kebab-case
 * (e.g., "PriorAuthCase" -> "/prior-auth-case").
 *
 * @param {string} pageName - The name of the page to generate a URL for.
 * @returns {string} The formatted kebab-case URL path.
 */
export function createPageUrl(pageName: string) {
  if (!pageName) return "/";
  return (
    "/" +
    pageName
      .replace(/([a-z])([A-Z])/g, "$1-$2")
      .replace(/[\s_]+/g, "-")
      .toLowerCase()
  );
}
