import Svg, { Path, Rect } from "react-native-svg";

type BrandMarkProps = {
  size?: number;
};

export function BrandMark({ size = 36 }: BrandMarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <Rect width="36" height="36" rx="10" fill="#2563EB" />
      <Path
        d="M18 6C13.5 6 10 9 10 13c0 2 .8 3.8 2 5 .6.7 1 1.6 1 2.5V26a2 2 0 004 0v-3h2v3a2 2 0 004 0v-5.5c0-.9.4-1.8 1-2.5 1.2-1.2 2-3 2-5 0-4-3.5-7-8-7z"
        fill="white"
      />
    </Svg>
  );
}
