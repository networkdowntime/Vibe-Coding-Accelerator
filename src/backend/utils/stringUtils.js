/**
 * Convert a string to camelCase (lowercase first letter)
 */
function toCamelCase(str) {
  return str
    .trim()
    .replace(/\s+/g, ' ') // normalize whitespace
    .split(' ')
    .map((word, index) => {
      const cleaned = word.replace(/[^a-zA-Z0-9]/g, '');
      if (index === 0) {
        return cleaned.toLowerCase();
      }
      return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
    })
    .join('');
}

/**
 * Convert camelCase to readable name (Title Case with spaces)
 */
function toReadableName(camelCaseStr) {
  return camelCaseStr
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
    .trim();
}

module.exports = {
  toCamelCase,
  toReadableName
};
