/**
 * Generate a stable id for newly-inserted nodes (sections, editable
 * fields, field instances). Uses `crypto.randomUUID` when available
 * and falls back to a base36 timestamp + random suffix elsewhere.
 *
 * Node ids are author-generated once at insert time and preserved
 * verbatim through copy/paste, version snapshots, and template →
 * document instantiation.
 */
export function generateNodeId(prefix: string = "n"): string {
  const cryptoObj =
    typeof globalThis !== "undefined"
      ? (globalThis.crypto as Crypto | undefined)
      : undefined;
  if (cryptoObj && typeof cryptoObj.randomUUID === "function") {
    return `${prefix}_${cryptoObj.randomUUID()}`;
  }
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${time}${rand}`;
}
