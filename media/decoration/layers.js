// Rendering layers are sorted before the usual Y-position sorting order.
// Ground tiles must remain beneath pets, plants, and ordinary decorations.
const DecorationLayer = Object.freeze({
    GROUND: -1,
    DEFAULT: 0,
});
