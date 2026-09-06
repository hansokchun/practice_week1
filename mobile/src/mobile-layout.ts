import { useWindowDimensions } from "react-native";

export function getMobileScreenGutter(width: number): number {
  if (width <= 360) return 12;
  if (width <= 390) return 20;
  return 24;
}

export function usesCompactHeaderLayout(width: number): boolean {
  return width <= 340;
}

export function useMobileScreenGutter(): number {
  const { width } = useWindowDimensions();
  return getMobileScreenGutter(width);
}
