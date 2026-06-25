function toRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function channelLuminance(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = toRgb(hex);
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

/** Composite a translucent fg over an opaque bg → resulting opaque hex. */
export function blendOver(fg: string, bg: string, alpha: number): string {
  const [fr, fg_, fb] = toRgb(fg);
  const [br, bg_, bb] = toRgb(bg);
  const mix = (f: number, b: number) => Math.round(f * alpha + b * (1 - alpha));
  const toHex = (v: number) => v.toString(16).padStart(2, "0");
  return `#${toHex(mix(fr, br))}${toHex(mix(fg_, bg_))}${toHex(mix(fb, bb))}`;
}

export function contrastRatio(hexA: string, hexB: string): number {
  const l1 = relativeLuminance(hexA);
  const l2 = relativeLuminance(hexB);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}
