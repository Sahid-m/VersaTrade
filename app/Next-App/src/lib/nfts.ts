// A list of sample image URLs for NFT avatars.
// In a real application, these would come from a dynamic source.

import { PlaceHolderImages } from "./placeholder-images";


export const NFT_AVATARS: string[] = PlaceHolderImages.filter(p => p.imageHint === 'nft avatar').map(p => p.imageUrl);

export function getRandomNftAvatar(): string {
  if (NFT_AVATARS.length === 0) {
    // fallback to a default picsum image if the json is empty for some reason
    return `https://picsum.photos/seed/${Math.random()}/100/100`;
  }
  return NFT_AVATARS[Math.floor(Math.random() * NFT_AVATARS.length)];
}
