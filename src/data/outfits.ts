/** Wearable outfits & hats for the modular player renderer. */

export type OutfitStyle = 'jacket' | 'flannel' | 'slicker' | 'cloak' | 'mantle' | 'suit';
export type HatStyle = 'none' | 'cap' | 'bucket' | 'antlers' | 'goggles' | 'crown';

export interface OutfitDef {
  id: string;
  name: string;
  style: OutfitStyle;
  main: number;
  shade: number;
  trim: number;
  accent: number;
  starter: boolean;
  source: string;
}

export interface HatDef {
  id: string;
  name: string;
  style: HatStyle;
  main: number;
  shade: number;
  accent: number;
  starter: boolean;
  source: string;
}

export const OUTFITS: readonly OutfitDef[] = [
  { id: 'ranger_jacket', name: 'Ranger Jacket', style: 'jacket', main: 3, shade: 2, trim: 8, accent: 6, starter: true, source: 'Standard issue.' },
  { id: 'red_flannel', name: 'Red Flannel', style: 'flannel', main: 11, shade: 10, trim: 0, accent: 7, starter: true, source: 'Comfy and warm.' },
  { id: 'frog_slicker', name: 'Loveland Frog Slicker', style: 'slicker', main: 4, shade: 3, trim: 8, accent: 7, starter: false, source: 'Historical Society: 10 donations.' },
  { id: 'yow_cloak', name: 'Snarly Yow Shadow Cloak', style: 'cloak', main: 0, shade: 1, trim: 12, accent: 11, starter: false, source: 'Historical Society: 15 donations.' },
  { id: 'wendigo_mantle', name: 'Wendigo Antler Mantle', style: 'mantle', main: 1, shade: 2, trim: 6, accent: 7, starter: false, source: 'Historical Society: 28 donations.' },
  { id: 'shimmer_suit', name: "Indrid Cold's Shimmer Suit", style: 'suit', main: 3, shade: 2, trim: 5, accent: 5, starter: false, source: 'Historical Society: 36 donations.' },
];

export const HATS: readonly HatDef[] = [
  { id: 'none', name: 'No Hat', style: 'none', main: 0, shade: 0, accent: 0, starter: true, source: '' },
  { id: 'ranger_cap', name: 'Ranger Cap', style: 'cap', main: 3, shade: 2, accent: 8, starter: true, source: 'Standard issue.' },
  { id: 'bucket_hat', name: 'Bucket Hat', style: 'bucket', main: 8, shade: 9, accent: 10, starter: true, source: 'Keeps the sun off.' },
  { id: 'jackalope_cap', name: 'Jackalope Antler Cap', style: 'antlers', main: 9, shade: 10, accent: 7, starter: false, source: 'Historical Society: 5 donations.' },
  { id: 'mothman_goggles', name: 'Mothman Goggles', style: 'goggles', main: 0, shade: 1, accent: 11, starter: false, source: 'Historical Society: 20 donations.' },
  { id: 'antler_crown', name: 'Wendigo Antler Crown', style: 'crown', main: 1, shade: 6, accent: 7, starter: false, source: 'Historical Society: 28 donations.' },
];

export function outfitById(id: string): OutfitDef {
  return OUTFITS.find((o) => o.id === id) ?? OUTFITS[0];
}

export function hatById(id: string): HatDef {
  return HATS.find((h) => h.id === id) ?? HATS[0];
}
