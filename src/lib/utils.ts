export function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export function oneToHex(score: number) {
  const clamped = Math.max(0, Math.min(1, score)); // ensure 0 ≤ score ≤ 1
  const hex = Math.round(clamped * 255) // scale 0–1 → 0–255
    .toString(16) // convert to hex
    .padStart(2, "0"); // ensure 2 chars
  return hex.toUpperCase(); // optional
}
