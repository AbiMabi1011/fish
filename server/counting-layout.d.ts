export interface CountingObject {
  kind: "fish" | "chest";
  left: number;
  top: number;
  size: number;
  rotation: number;
  flipped: boolean;
}

export function countingLayout(
  fish: number,
  chests: number,
  seedText: string,
): CountingObject[];

