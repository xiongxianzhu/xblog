/** Convert CSS HSL channels to a concrete color supported by Ant's palette generator. */
export function hslChannelsToHex(channels: string): string {
  const [hue, saturation, lightness] = channels.trim().split(/\s+/).map(Number.parseFloat);
  if (![hue, saturation, lightness].every(Number.isFinite)) {
    throw new Error(`Invalid theme color: ${channels}`);
  }
  const h = ((hue % 360) + 360) % 360;
  const s = saturation / 100;
  const l = lightness / 100;
  const a = s * Math.min(l, 1 - l);
  const channel = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))))
      .toString(16)
      .padStart(2, "0");
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}
