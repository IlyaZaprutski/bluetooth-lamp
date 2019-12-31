export const getColorData = ({ r, g, b }) => new Uint8Array([0x56, r, g, b, 0x00, 0xf0, 0xaa]);

export const getColor = rgb => `rgb(${rgb.r},${rgb.g},${rgb.b})`;

export const getRandomRgb = () => {
  const o = Math.round;
  const r = Math.random;
  const s = 255;

  return {
    r: o(r() * s),
    g: o(r() * s),
    b: o(r() * s),
  };
};

const ColorByLvl = {
  10: { r: 0, g: 72, b: 186 },
  // 20: { r: 176, g: 191, b: 26 },
  // 30: { r: 201, g: 255, b: 229 },
  // 40: { r: 178, g: 132, b: 190 },
  // 50: { r: 255, g: 191, b: 0 },
  60: { r: 239, g: 222, b: 205 },
  // 70: { r: 241, g: 156, b: 187 },
  80: { r: 0, g: 0, b: 255 },
  90: { r: 47, g: 79, b: 79 },
  // 100: { r: 176, g: 196, b: 222 },
  110: { r: 139, g: 0, b: 139 },
  // 120: { r: 128, g: 0, b: 128 },
  130: { r: 25, g: 25, b: 112 },
  // 140: { r: 255, g: 102, b: 102 },
  150: { r: 255, g: 0, b: 0 },
  99999: { r: 255, g: 0, b: 0 },
};

export const getColorByLvl = lvl => {
  const key = Object.keys(ColorByLvl).find(x => lvl <= x);

  return ColorByLvl[key];
};
