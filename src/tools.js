export const getColorData = ({ r, g, b }) => new Uint8Array([0x56, r, g, b, 0x00, 0xf0, 0xaa]);

export const getColor = rgb => `rgb(${rgb.r},${rgb.g},${rgb.b})`;

export const getRandomRgb = () => {
    let o = Math.round,
        r = Math.random,
        s = 255;

    return {
        r: o(r() * s),
        g: o(r() * s),
        b: o(r() * s),
    };
};
