/**
 * Fetches one fish-counting puzzle from the external Marc Conrad Fish API.
 * Docs: https://marcconrad.com/uob/fish/doc.php
 */
const FISH_API_URL =
  "https://marcconrad.com/uob/fish/api.php?out=json&base64=yes";

export async function fetchPuzzle() {
  const response = await fetch(FISH_API_URL, {
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    throw new Error("The Fish Game API is unavailable. Please retry.");
  }

  const data = await response.json();

  const validCounts =
    Number.isInteger(data.fish) &&
    Number.isInteger(data.chest) &&
    data.fish >= 0 &&
    data.fish <= 99 &&
    data.chest >= 0 &&
    data.chest <= 99;

  const validImage =
    typeof data.question === "string" &&
    data.question.length <= 3000000 &&
    data.question.startsWith("iVBORw0KGgo");

  if (!validCounts || !validImage) {
    throw new Error("Invalid puzzle response. Please retry.");
  }

  const base64Image = data.question.replace(/\s/g, "");

  return {
    imageUrl: `data:image/png;base64,${base64Image}`,
    fish: data.fish,
    chests: data.chest,
  };
}
