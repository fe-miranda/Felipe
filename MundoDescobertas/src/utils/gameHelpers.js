/**
 * Returns a random integer between min (inclusive) and max (inclusive).
 */
export function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Returns a random item from an array.
 */
export function randomFrom(array) {
  if (!array || array.length === 0) return undefined;
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Checks if two axis-aligned rectangles overlap.
 * Each rect: { x, y, width, height }
 */
export function rectsOverlap(rect1, rect2) {
  return !(
    rect1.x + rect1.width < rect2.x ||
    rect2.x + rect2.width < rect1.x ||
    rect1.y + rect1.height < rect2.y ||
    rect2.y + rect2.height < rect1.y
  );
}

/**
 * Checks if a point { x, y } lies inside a rectangle { x, y, width, height }.
 */
export function pointInRect(point, rect) {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

/**
 * Calculates Euclidean distance between two points { x, y }.
 */
export function distanceBetween(p1, p2) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Shuffles an array using Fisher-Yates algorithm (non-mutating).
 */
export function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Clamps a value between min and max.
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Formats a numeric score with zero-padding to at least 2 digits.
 */
export function formatScore(score) {
  return score.toString().padStart(2, '0');
}

/**
 * Generates initial bubble data for BubblePopScreen.
 * @param {number} count - Number of bubbles to generate.
 * @param {number} screenWidth - Device screen width in pixels.
 * @returns {Array<{ id: string, x: number, delay: number, duration: number, size: number }>}
 */
export function generateBubblePositions(count, screenWidth) {
  return Array.from({ length: count }, (_, i) => ({
    id: `bubble-init-${i}-${Date.now()}`,
    x: randomBetween(30, screenWidth - 80),
    delay: i * 400,
    duration: randomBetween(3500, 6500),
    size: randomBetween(52, 88),
  }));
}

/**
 * Lightens a hex colour by adding `amount` to each RGB channel.
 * @param {string} hex - e.g. '#FF6B6B'
 * @param {number} amount - Value to add (default 60).
 */
export function lightenHex(hex, amount = 60) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0xff) + amount);
  const b = Math.min(255, (num & 0xff) + amount);
  return `rgb(${r},${g},${b})`;
}
