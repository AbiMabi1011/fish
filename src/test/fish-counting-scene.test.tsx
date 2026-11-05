import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { FishCountingScene } from "@/components/FishCountingScene";
import goldfish from '@/assets/mascot.png';
import { countingLayout } from '@/components/countingLayout';

describe("illustrated Fish API pictures", () => {
  it("renders exactly the API fish count, not the chest count", () => {
    const { container } = render(<FishCountingScene puzzle={{ imageUrl: "puzzle.png", fish: 2, chests: 11 }} round={1} />);
    expect(container.querySelectorAll(".counting-fish")).toHaveLength(2);
  });
  it("renders nine distinct fish for a nine-fish puzzle", () => {
    const { container } = render(<FishCountingScene puzzle={{ imageUrl: "puzzle.png", fish: 9, chests: 3 }} round={2} />);
    expect(container.querySelectorAll(".counting-fish")).toHaveLength(9);
  });
  it("always uses gold fish in the puzzle", () => {
    const { container } = render(<FishCountingScene puzzle={{ imageUrl: "original.png", fish: 5, chests: 0 }} round={3} />);
    const fish = container.querySelectorAll('.counting-fish');
    expect(fish).toHaveLength(5);
    for (const image of fish) expect(image.getAttribute('src')).toBe(goldfish);
    expect(container.querySelector('img[src="original.png"]')).toBeNull();
  });
  it('scatters fish and chests together with stable distinct positions', () => {
    const layout = countingLayout(8, 4, 'puzzle:1');
    expect(layout).toEqual(countingLayout(8, 4, 'puzzle:1'));
    expect(new Set(layout.map((o) => `${o.left}:${o.top}`)).size).toBe(12);
    const fishRows = layout.filter((o) => o.kind === 'fish').map((o) => o.top);
    const chestRows = layout.filter((o) => o.kind === 'chest').map((o) => o.top);
    expect(Math.min(...chestRows)).toBeLessThan(Math.max(...fishRows));
    expect(countingLayout(8, 4, 'puzzle:2')).not.toEqual(layout);
  });
  it("shows exactly eleven API chests independently of the two fish", () => {
    const { container } = render(<FishCountingScene puzzle={{ imageUrl: "original.png", fish: 2, chests: 11 }} round={4} />);
    expect(container.querySelectorAll('.counting-chest')).toHaveLength(11);
  });
  it("keeps zero counts empty without inserting decorative fish or chests", () => {
    const { container } = render(<FishCountingScene puzzle={{ imageUrl: "original.png", fish: 0, chests: 0 }} round={6} />);
    expect(container.querySelectorAll('.counting-fish')).toHaveLength(0);
    expect(container.querySelectorAll('.counting-chest')).toHaveLength(0);
  });
});