/**
 * Convert a string to snake_case (lowercase with underscores)
 */
function toCamelCase(str) {
  return str
    .trim()
    .replace(/\s+/g, ' ') // normalize whitespace
    .split(' ')
    .map(word => {
      const cleaned = word.replace(/[^a-zA-Z0-9]/g, '');
      return cleaned.toLowerCase();
    })
    .filter(word => word.length > 0) // Remove empty words
    .join('_');
}

/**
 * Convert snake_case to readable name (Title Case with spaces)
 */
function toReadableName(snakeCaseStr) {
  return snakeCaseStr
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

module.exports = {
  toCamelCase,
  toReadableName
};
