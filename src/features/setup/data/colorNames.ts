const NAMED: readonly (readonly [string, string])[] = [
  ['#000000', 'Black'],
  ['#1A1A1A', 'Jet'],
  ['#2B2B2B', 'Onyx'],
  ['#36454F', 'Charcoal'],
  ['#4B4B4B', 'Graphite'],
  ['#708090', 'Slate'],
  ['#808080', 'Grey'],
  ['#A9A9A9', 'Ash'],
  ['#C0C0C0', 'Silver'],
  ['#D3D3D3', 'Fog'],
  ['#E5E5E5', 'Pearl'],
  ['#F5F5DC', 'Beige'],
  ['#FFFDD0', 'Cream'],
  ['#FFFFF0', 'Ivory'],
  ['#FFFFFF', 'White'],

  ['#DC143C', 'Crimson'],
  ['#D2042D', 'Cherry'],
  ['#9B111E', 'Ruby'],
  ['#8B0000', 'Maroon'],
  ['#9C2B2B', 'Brick'],
  ['#E63946', 'Rose'],
  ['#FF6F61', 'Coral'],
  ['#FA8072', 'Salmon'],
  ['#E34234', 'Vermilion'],

  ['#FFC0CB', 'Pink'],
  ['#FF69B4', 'Hot Pink'],
  ['#DE5D83', 'Blush'],
  ['#FF77FF', 'Fuchsia'],
  ['#FF00FF', 'Magenta'],
  ['#DA70D6', 'Orchid'],

  ['#FFA500', 'Orange'],
  ['#F28500', 'Tangerine'],
  ['#EE9026', 'Clementine'],
  ['#FFBF00', 'Amber'],
  ['#D2691E', 'Cinnamon'],
  ['#B7410E', 'Rust'],
  ['#B87333', 'Copper'],

  ['#FFFF00', 'Yellow'],
  ['#FFF700', 'Lemon'],
  ['#FFDB58', 'Mustard'],
  ['#FFD700', 'Gold'],
  ['#DAA520', 'Goldenrod'],

  ['#C3B091', 'Khaki'],
  ['#D2B48C', 'Tan'],
  ['#964B00', 'Brown'],
  ['#6F4E37', 'Coffee'],
  ['#7B3F00', 'Chocolate'],

  ['#808000', 'Olive'],
  ['#8A9A5B', 'Moss'],
  ['#87AE73', 'Sage'],
  ['#228B22', 'Forest'],
  ['#50C878', 'Emerald'],
  ['#00FF00', 'Lime'],
  ['#3EB489', 'Mint'],
  ['#93E9BE', 'Seafoam'],

  ['#008080', 'Teal'],
  ['#40E0D0', 'Turquoise'],
  ['#00FFFF', 'Aqua'],
  ['#00B7EB', 'Cyan'],
  ['#87CEEB', 'Sky'],
  ['#007FFF', 'Azure'],

  ['#4169E1', 'Royal'],
  ['#0047AB', 'Cobalt'],
  ['#0F52BA', 'Sapphire'],
  ['#000080', 'Navy'],
  ['#191970', 'Midnight'],
  ['#4B0082', 'Indigo'],

  ['#5A4FCF', 'Iris'],
  ['#6F2DA8', 'Grape'],
  ['#B57EDC', 'Lavender'],
  ['#8F00FF', 'Violet'],
  ['#8E4585', 'Plum'],
  ['#614051', 'Eggplant'],
];

function toRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

const NAMED_RGB: readonly (readonly [[number, number, number], string])[] =
  NAMED.map(([hex, name]) => [toRgb(hex), name] as const);

function dist(a: [number, number, number], b: [number, number, number]): number {
  const rmean = (a[0] + b[0]) / 2;
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return (
    (((512 + rmean) * dr * dr) / 256) +
    4 * dg * dg +
    (((767 - rmean) * db * db) / 256)
  );
}

export function hexToName(hex: string): string {
  if (!hex) return 'Color';
  const rgb = toRgb(hex);
  let bestName = NAMED_RGB[0][1];
  let bestD = Infinity;
  for (const [nrgb, name] of NAMED_RGB) {
    const d = dist(rgb, nrgb);
    if (d < bestD) {
      bestD = d;
      bestName = name;
    }
  }
  return bestName;
}
