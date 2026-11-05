import goldfish from '@/assets/mascot.png';
import bluefish from '@/assets/duel-blue-fish.png';
import clownfish from '@/assets/avatar-clownfish-portrait.jpg.asset.json';
import shark from '@/assets/avatar-pirate-shark-portrait.jpg.asset.json';
import pufferfish from '@/assets/avatar-pufferfish-portrait.jpg.asset.json';
import angelfish from '@/assets/avatar-angelfish-portrait.jpg.asset.json';
import seahorse from '@/assets/avatar-seahorse-portrait.jpg.asset.json';
import starfish from '@/assets/avatar-starfish-portrait.jpg.asset.json';
import whale from '@/assets/avatar-baby-whale-portrait.jpg.asset.json';
import lanternfish from '@/assets/avatar-lanternfish-portrait.jpg.asset.json';

export const AVATARS = [
  { id: 'goldfish', name: 'Goldie', image: goldfish },
  { id: 'bluefish', name: 'Blue Fish', image: bluefish },
  { id: 'clownfish', name: 'Clownfish', image: clownfish.url },
  { id: 'pirate-shark', name: 'Pirate Shark', image: shark.url },
  { id: 'pufferfish', name: 'Pufferfish', image: pufferfish.url },
  { id: 'angelfish', name: 'Angelfish', image: angelfish.url },
  { id: 'seahorse', name: 'Seahorse', image: seahorse.url },
  { id: 'starfish', name: 'Starfish', image: starfish.url },
  { id: 'baby-whale', name: 'Baby Whale', image: whale.url },
  { id: 'lanternfish', name: 'Lanternfish', image: lanternfish.url },
] as const;
export type AvatarId = typeof AVATARS[number]['id'];
export function getAvatar(id: string | null | undefined) {
  return AVATARS.find((avatar) => avatar.id === id) ?? AVATARS[0];
}