/**
 * Fish API service — INTEROPERABILITY layer.
 *
 * The only module that knows about the external "Fish Game" API
 * (https://marcconrad.com/uob/fish/doc.php, © Marc Conrad).
 * It talks HTTP + JSON to a third-party server and converts the raw
 * response into our own `Puzzle` type, so the rest of the app never
 * depends on the external data format (low coupling).
 *
 * Code generated with AI assistance (Lovable), reviewed by the author.
 */

export const FISH_API_URL = "https://marcconrad.com/uob/fish/api.php";

/** Our internal, API-independent representation of one puzzle. */
export interface Puzzle {
  imageUrl: string;
  fish: number;
  chests: number;
}

/** Shape of the raw JSON returned by the external API. */
interface RawFishResponse {
  question: string;
  fish: number;
  chest: number;
}

function isRawFishResponse(v: unknown): v is RawFishResponse {
  const o = v as RawFishResponse;
  return !!o && typeof o.question === "string" && typeof o.fish === "number" && typeof o.chest === "number";
}

/** Adapter: maps the external format to our internal `Puzzle`. */
export function toPuzzle(raw: unknown): Puzzle {
  if (!isRawFishResponse(raw)) throw new Error("Unexpected response from Fish API");
  return { imageUrl: raw.question, fish: raw.fish, chests: raw.chest };
}

export async function fetchPuzzle(signal?: AbortSignal): Promise<Puzzle> {
  const res = await fetch(`${FISH_API_URL}?out=json`, { signal: signal ?? null });
  if (!res.ok) throw new Error(`Fish API error ${res.status}`);
  return toPuzzle(await res.json());
}
