const GROUND_TILE_POSITIONS = [
    'Top Left', 'Top', 'Top Right',
    'Left', 'Center', 'Right',
    'Bottom Left', 'Bottom', 'Bottom Right',
];

const GROUND_TILE_INNER_CORNERS = [
    'Inner Corner - Top Left', 'Inner Corner - Top Right',
    'Inner Corner - Bottom Left', 'Inner Corner - Bottom Right',
];

function createGroundTileSet(keyPrefix, displayName, originX, originY) {
    const outerTiles = GROUND_TILE_POSITIONS.map((position, index) => {
        const column = index % 3;
        const row = Math.floor(index / 3);
        return [
            `${keyPrefix}_${String(index + 1).padStart(2, '0')}`,
            {
                name: `${displayName} - ${position}`,
                size: new Vec2(16),
                spriteOffset: new Vec2(originX + column * 16, originY + row * 16),
                price: 0,
                sortingLayer: DecorationLayer.GROUND,
            },
        ];
    });

    // Four concave/inner corners stored as a 2x2 block below the 3x3 set.
    const innerCorners = GROUND_TILE_INNER_CORNERS.map((position, index) => {
        const column = index % 2;
        const row = Math.floor(index / 2);
        return [
            `${keyPrefix}_${String(index + 10).padStart(2, '0')}`,
            {
                name: `${displayName} - ${position}`,
                size: new Vec2(16),
                spriteOffset: new Vec2(originX + column * 16, originY + 48 + row * 16),
                price: 0,
                sortingLayer: DecorationLayer.GROUND,
            },
        ];
    });

    return Object.fromEntries([...outerTiles, ...innerCorners]);
}

class DecorationPreset {

    // Three autotile-style sets: a 3x3 outer block plus four inner corners below.
    // Add future sets by spreading another call with the new block's top-left.
    static GROUND_TILES = {
        ...createGroundTileSet('POND', 'Pond', 0, 720),
        ...createGroundTileSet('PATH_STYLE_1', 'Sand Path', 48, 720),
        ...createGroundTileSet('PATH_STYLE_2', 'Dirt Path', 96, 720),
    };

    static QUICK_ACCESS = {
    OBJECT_01: { name: 'PC', size: new Vec2(16, 32), spriteOffset: new Vec2(0, 656), price: 0, quickAction: 'pokedex' },
    OBJECT_02: { name: 'Pokeball', size: new Vec2(16, 16), spriteOffset: new Vec2(16, 672), price: 0, quickAction: 'throw_ball' },
    OBJECT_03: { name: 'Store I', size: new Vec2(16, 32), spriteOffset: new Vec2(32, 656), price: 0, quickAction: 'item_shop' },
    OBJECT_04: { name: 'Store II', size: new Vec2(16, 16), spriteOffset: new Vec2(48, 672), price: 0, quickAction: 'item_shop' },
    OBJECT_05: { name: 'Backpack I', size: new Vec2(16, 16), spriteOffset: new Vec2(64, 672), price: 0, quickAction: 'backpack' },
    OBJECT_06: { name: 'Backpack II', size: new Vec2(16, 16), spriteOffset: new Vec2(80, 672), price: 0, quickAction: 'backpack' },
    OBJECT_07: { name: 'Build Mode I', size: new Vec2(16, 16), spriteOffset: new Vec2(96, 672), price: 0, quickAction: 'build_mode' },
    OBJECT_08: { name: 'Build Mode II', size: new Vec2(16, 16), spriteOffset: new Vec2(112, 672), price: 0, quickAction: 'build_mode' },
    };
    static DECOR_PLANTS = {
        OBJECT_01: { name: 'Object 01', size: new Vec2(16, 32), spriteOffset: new Vec2(0, 64), price: 50 },
        OBJECT_02: { name: 'Object 02', size: new Vec2(16, 32), spriteOffset: new Vec2(32, 64), price: 100 },
        OBJECT_03: { name: 'Object 03', size: new Vec2(16, 32), spriteOffset: new Vec2(48, 64), price: 100 },
        OBJECT_04: { name: 'Object 04', size: new Vec2(16, 32), spriteOffset: new Vec2(64, 64), price: 100 },
        OBJECT_05: { name: 'Object 05', size: new Vec2(16, 32), spriteOffset: new Vec2(80, 64), price: 100 },
        OBJECT_06: { name: 'Object 06', size: new Vec2(16, 32), spriteOffset: new Vec2(96, 64), price: 200 },
        OBJECT_07: { name: 'Object 07', size: new Vec2(16, 32), spriteOffset: new Vec2(112, 64), price: 200 },
        OBJECT_08: { name: 'Object 08', size: new Vec2(16, 32), spriteOffset: new Vec2(128, 64), price: 200 },
        OBJECT_09: { name: 'Object 09', size: new Vec2(32, 32), spriteOffset: new Vec2(144, 64), price: 300 },
        OBJECT_10: { name: 'Object 10', size: new Vec2(32, 32), spriteOffset: new Vec2(176, 64), price: 300 },
        OBJECT__11: { name: 'Object 11', size: new Vec2(16, 16), spriteOffset: new Vec2(208, 80), price: 100 },
        OBJECCT_12: { name: 'Object 12', size: new Vec2(16, 16), spriteOffset: new Vec2(224, 80), price: 100 },
        OBJECCT_13: { name: 'Object 13', size: new Vec2(16, 16), spriteOffset: new Vec2(240, 80), price: 100 },
        OBJECCT_14: { name: 'Object 14', size: new Vec2(16, 16), spriteOffset: new Vec2(256, 80), price: 100 },
        OBJECCT_15: { name: 'Object 15', size: new Vec2(16, 32), spriteOffset: new Vec2(272, 64), price: 100 },
        OBJECCT_16: { name: 'Object 16', size: new Vec2(16, 32), spriteOffset: new Vec2(288, 64), price: 100 },
        OBJECCT_17: { name: 'Object 17', size: new Vec2(16, 32), spriteOffset: new Vec2(304, 64), price: 100 },
        OBJECCT_18: { name: 'Object 18', size: new Vec2(16, 32), spriteOffset: new Vec2(320, 64), price: 100 },
        OBJECCT_19: { name: 'Object 19', size: new Vec2(16, 32), spriteOffset: new Vec2(336, 64), price: 100 },
        OBJECCT_20: { name: 'Object 20', size: new Vec2(16, 32), spriteOffset: new Vec2(352, 64), price: 100 },
        OBJECCT_21: { name: 'Object 21', size: new Vec2(16, 32), spriteOffset: new Vec2(368, 64), price: 100 },
        OBJECCT_22: { name: 'Object 22', size: new Vec2(16, 32), spriteOffset: new Vec2(384, 64), price: 100 },
        OBJECCT_23: { name: 'Object 23', size: new Vec2(16, 32), spriteOffset: new Vec2(400, 64), price: 100 },
        OBJECCT_24: { name: 'Object 24', size: new Vec2(16, 32), spriteOffset: new Vec2(416, 64), price: 100 },
        OBJECCT_25: { name: 'Object 25', size: new Vec2(16, 32), spriteOffset: new Vec2(432, 64), price: 100 },
        OBJECT_26: { name: 'Object 26', size: new Vec2(16, 32), spriteOffset: new Vec2(448, 64), price: 100 },
        OBJECT_27: { name: 'Object 27', size: new Vec2(32, 16), spriteOffset: new Vec2(464, 80), price: 200 },
        OBJECT_28: { name: 'Object 28', size: new Vec2(32, 16), spriteOffset: new Vec2(496, 80), price: 200 },
        OBJECT_29: { name: 'Object 29', size: new Vec2(32, 16), spriteOffset: new Vec2(528, 80), price: 200 },
        OBJECT_30: { name: 'Object 30', size: new Vec2(32, 16), spriteOffset: new Vec2(560, 80), price: 200 },
        OBJECT_31: { name: 'Object 31', size: new Vec2(32, 16), spriteOffset: new Vec2(592, 80), price: 200 },
        OBJECT_32: { name: 'Object 32', size: new Vec2(32, 32), spriteOffset: new Vec2(624, 64), price: 200 },
        OBJECT_33: { name: 'Object 33', size: new Vec2(32, 32), spriteOffset: new Vec2(656, 64), price: 200 },
        OBJECT_34: { name: 'Object 34', size: new Vec2(32, 32), spriteOffset: new Vec2(688, 64), price: 200 },
        OBJECT_35: { name: 'Object 35', size: new Vec2(32, 32), spriteOffset: new Vec2(720, 64), price: 200 },
        OBJECT_36: { name: 'Object 36', size: new Vec2(32, 32), spriteOffset: new Vec2(752, 64), price: 200 },
        OBJECT_37: { name: 'Object 37', size: new Vec2(32, 32), spriteOffset: new Vec2(784, 64), price: 200 },
        OBJECT_38: { name: 'Object 38', size: new Vec2(32, 32), spriteOffset: new Vec2(816, 64), price: 200 },
        OBJECT_39: { name: 'Object 39', size: new Vec2(32, 32), spriteOffset: new Vec2(848, 64), price: 200 },
        OBJECT_40: { name: 'Object 40', size: new Vec2(32, 32), spriteOffset: new Vec2(880, 64), price: 200 },
        OBJECT_41: { name: 'Object 41', size: new Vec2(32, 32), spriteOffset: new Vec2(912, 64), price: 200 },
        OBJECT_42: { name: 'Object 42', size: new Vec2(32, 32), spriteOffset: new Vec2(944, 64), price: 200 }
    };

    static LAMPS = {
        OBJECT_01: { name: 'Object 01', size: new Vec2(16, 32), spriteOffset: new Vec2(0, 192), nightSpriteOffsetY: 256, price: 150, isLamp: true, lightRadius: 60 },
        OBJECT_02: { name: 'Object 02', size: new Vec2(16, 32), spriteOffset: new Vec2(16, 192), nightSpriteOffsetY: 256, price: 150, isLamp: true, lightRadius: 60 },
        OBJECT_03: { name: 'Object 03', size: new Vec2(16, 32), spriteOffset: new Vec2(32, 192), nightSpriteOffsetY: 256, price: 150, isLamp: true, lightRadius: 60 },
        OBJECT_04: { name: 'Object 04', size: new Vec2(16, 32), spriteOffset: new Vec2(64, 192), nightSpriteOffsetY: 256, price: 250, isLamp: true, lightRadius: 80 },
        OBJECT_05: { name: 'Object 05', size: new Vec2(16, 32), spriteOffset: new Vec2(80, 192), nightSpriteOffsetY: 256, price: 250, isLamp: true, lightRadius: 80 },
        OBJECT_06: { name: 'Object 06', size: new Vec2(16, 48), spriteOffset: new Vec2(96, 192), nightSpriteOffsetY: 240, price: 350, isLamp: true, lightRadius: 80 },
        OBJECT_07: { name: 'Object 07', size: new Vec2(16, 48), spriteOffset: new Vec2(112, 192), nightSpriteOffsetY: 240, price: 450, isLamp: true, lightRadius: 100 },
        OBJECT_08: { name: 'Object 08', size: new Vec2(32, 48), spriteOffset: new Vec2(128, 192), nightSpriteOffsetY: 240, price: 500, isLamp: true, lightRadius: 100 },
        OBJECT_09: { name: 'Object 09', size: new Vec2(32, 48), spriteOffset: new Vec2(160, 192), nightSpriteOffsetY: 240, price: 500, isLamp: true, lightRadius: 100 },
        OBJECT_10: { name: 'Object 10', size: new Vec2(32, 48), spriteOffset: new Vec2(192, 192), nightSpriteOffsetY: 240, price: 500, isLamp: true, lightRadius: 100 },
        OBJECT_11: { name: 'Object 11', size: new Vec2(32, 48), spriteOffset: new Vec2(224, 192), nightSpriteOffsetY: 240, price: 600, isLamp: true, lightRadius: 100 },
        OBJECT_12: { name: 'Object 12', size: new Vec2(32, 48), spriteOffset: new Vec2(256, 192), nightSpriteOffsetY: 240, price: 600, isLamp: true, lightRadius: 100 },
    };

    static MID_MISC = {
        OBJECT_01: { name: 'Object 01', size: new Vec2(16, 32), spriteOffset: new Vec2(0, 0), price: 300 },
        OBJECT_02: { name: 'Object 02', size: new Vec2(16, 32), spriteOffset: new Vec2(16, 0), price: 200 },
        OBJECT_03: { name: 'Object 03', size: new Vec2(16, 32), spriteOffset: new Vec2(32, 0), price: 200 },
        OBJECT_04: { name: 'Object 04', size: new Vec2(16, 32), spriteOffset: new Vec2(48, 0), price: 200 },
        OBJECT_05: { name: 'Object 05', size: new Vec2(16, 32), spriteOffset: new Vec2(64, 0), price: 200 },
        OBJECT_06: { name: 'Object 06', size: new Vec2(16, 32), spriteOffset: new Vec2(80, 0), price: 200 },
        OBJECT_07: { name: 'Object 07', size: new Vec2(16, 32), spriteOffset: new Vec2(96, 0), price: 200 },
        OBJECT_08: { name: 'Object 08', size: new Vec2(16, 32), spriteOffset: new Vec2(112, 0), price: 200 },
        OBJECT_09: { name: 'Object 09', size: new Vec2(16, 32), spriteOffset: new Vec2(128, 0), price: 200 },
        OBJECT_10: { name: 'Object 10', size: new Vec2(16, 32), spriteOffset: new Vec2(144, 0), price: 200 },
        OBJECT_11: { name: 'Object 11', size: new Vec2(16, 32), spriteOffset: new Vec2(160, 0), price: 200 },
        OBJECT_12: { name: 'Object 12', size: new Vec2(16, 32), spriteOffset: new Vec2(176, 0), price: 50 },
        OBJECT_13: { name: 'Object 13', size: new Vec2(16, 32), spriteOffset: new Vec2(192, 0), price: 50 },
        OBJECT_14: { name: 'Object 14', size: new Vec2(16, 32), spriteOffset: new Vec2(208, 0), price: 50 },
        OBJECT_15: { name: 'Object 15', size: new Vec2(16, 32), spriteOffset: new Vec2(224, 0), price: 200 },
        OBJECT_16: { name: 'Object 16', size: new Vec2(32, 32), spriteOffset: new Vec2(240, 0), price: 1000 },
        OBJECT_17: { name: 'Object 17', size: new Vec2(32, 32), spriteOffset: new Vec2(272, 0), price: 1000 },
        OBJECT_18: { name: 'Object 18', size: new Vec2(32, 32), spriteOffset: new Vec2(304, 0), price: 1000 },
        OBJECT_19: { name: 'Object 19', size: new Vec2(32, 32), spriteOffset: new Vec2(336, 0), price: 1000 },
        OBJECT_20: { name: 'Object 20', size: new Vec2(32, 32), spriteOffset: new Vec2(368, 0), price: 1000 },
        OBJECT_21: { name: 'Object 21', size: new Vec2(32, 32), spriteOffset: new Vec2(400, 0), price: 1000 },
        OBJECT_22: { name: 'Object 22', size: new Vec2(32, 32), spriteOffset: new Vec2(432, 0), price: 1000 },
        OBJECT_23: { name: 'Object 23', size: new Vec2(32, 32), spriteOffset: new Vec2(464, 0), price: 1000 },
        OBJECT_24: { name: 'Object 24', size: new Vec2(32, 32), spriteOffset: new Vec2(496, 0), price: 1000 },
        OBJECT_25: { name: 'Object 25', size: new Vec2(32, 32), spriteOffset: new Vec2(528, 0), price: 1000 },
    };

    static SMALL_MISC = {
        OBJECT_01: { name: 'Object 01', size: new Vec2(16), spriteOffset: new Vec2(0, 32), price: 100 },
        OBJECT_02: { name: 'Object 02', size: new Vec2(16), spriteOffset: new Vec2(16, 32), price: 100 },
        OBJECT_03: { name: 'Object 03', size: new Vec2(16), spriteOffset: new Vec2(32, 32), price: 100 },
        OBJECT_04: { name: 'Object 04', size: new Vec2(16), spriteOffset: new Vec2(48, 32), price: 100 },
        OBJECT_05: { name: 'Object 05', size: new Vec2(16), spriteOffset: new Vec2(64, 32), price: 100 },
        OBJECT_06: { name: 'Object 06', size: new Vec2(16), spriteOffset: new Vec2(80, 32), price: 100 },
        OBJECT_07: { name: 'Object 07', size: new Vec2(16), spriteOffset: new Vec2(96, 32), price: 100 },
        OBJECT_08: { name: 'Object 08', size: new Vec2(16), spriteOffset: new Vec2(112, 32), price: 100 },
        OBJECT_09: { name: 'Object 09', size: new Vec2(16), spriteOffset: new Vec2(128, 32), price: 100 },
        OBJECT_10: { name: 'Object 10', size: new Vec2(16), spriteOffset: new Vec2(144, 32), price: 100 },
        OBJECT_11: { name: 'Object 11', size: new Vec2(16), spriteOffset: new Vec2(160, 32), price: 100 },
        OBJECT_12: { name: 'Object 12', size: new Vec2(16), spriteOffset: new Vec2(176, 32), price: 100 },
        OBJECT_13: { name: 'Object 13', size: new Vec2(16), spriteOffset: new Vec2(192, 32), price: 100 },
        OBJECT_14: { name: 'Object 14', size: new Vec2(16), spriteOffset: new Vec2(208, 32), price: 100 },
        OBJECT_15: { name: 'Object 15', size: new Vec2(16), spriteOffset: new Vec2(224, 32), price: 100 },
        OBJECT_16: { name: 'Object 16', size: new Vec2(16), spriteOffset: new Vec2(240, 32), price: 100 },
        OBJECT_17: { name: 'Object 17', size: new Vec2(16), spriteOffset: new Vec2(256, 32), price: 100 },
        OBJECT_18: { name: 'Object 18', size: new Vec2(16), spriteOffset: new Vec2(272, 32), price: 100 },
        OBJECT_19: { name: 'Object 19', size: new Vec2(16), spriteOffset: new Vec2(288, 32), price: 100 },
        OBJECT_20: { name: 'Object 20', size: new Vec2(16), spriteOffset: new Vec2(304, 32), price: 100 },
        OBJECT_21: { name: 'Object 21', size: new Vec2(16), spriteOffset: new Vec2(320, 32), price: 100 },
        OBJECT_22: { name: 'Object 22', size: new Vec2(16), spriteOffset: new Vec2(336, 32), price: 100 },
        OBJECT_23: { name: 'Object 23', size: new Vec2(16), spriteOffset: new Vec2(352, 32), price: 100 },
        OBJECT_24: { name: 'Object 24', size: new Vec2(16), spriteOffset: new Vec2(368, 32), price: 100 },
        OBJECT_25: { name: 'Object 25', size: new Vec2(16), spriteOffset: new Vec2(384, 32), price: 100 },
        OBJECT_26: { name: 'Object 26', size: new Vec2(16), spriteOffset: new Vec2(400, 32), price: 100 },
        OBJECT_27: { name: 'Object 27', size: new Vec2(16), spriteOffset: new Vec2(416, 32), price: 100 },
        OBJECT_28: { name: 'Object 28', size: new Vec2(16), spriteOffset: new Vec2(432, 32), price: 100 },
        OBJECT_29: { name: 'Object 29', size: new Vec2(16), spriteOffset: new Vec2(448, 32), price: 100 },
        OBJECT_30: { name: 'Object 30', size: new Vec2(16), spriteOffset: new Vec2(464, 32), price: 100 },
        OBJECT_31: { name: 'Object 31', size: new Vec2(16), spriteOffset: new Vec2(0, 48), price: 350 },
        OBJECT_32: { name: 'Object 32', size: new Vec2(16), spriteOffset: new Vec2(16, 48), price: 350 },
        OBJECT_33: { name: 'Object 33', size: new Vec2(16), spriteOffset: new Vec2(32, 48), price: 350 },
        OBJECT_34: { name: 'Object 34', size: new Vec2(16), spriteOffset: new Vec2(48, 48), price: 350 },
        OBJECT_35: { name: 'Object 35', size: new Vec2(16), spriteOffset: new Vec2(64, 48), price: 350 },
        OBJECT_36: { name: 'Object 36', size: new Vec2(16), spriteOffset: new Vec2(80, 48), price: 350 },
        OBJECT_37: { name: 'Object 37', size: new Vec2(16), spriteOffset: new Vec2(96, 48), price: 350 },
        OBJECT_38: { name: 'Object 38', size: new Vec2(16), spriteOffset: new Vec2(112, 48), price: 350 },
        OBJECT_39: { name: 'Object 39', size: new Vec2(16), spriteOffset: new Vec2(128, 48), price: 350 },
        OBJECT_40: { name: 'Object 40', size: new Vec2(16), spriteOffset: new Vec2(144, 48), price: 350 },
        OBJECT_41: { name: 'Object 41', size: new Vec2(16), spriteOffset: new Vec2(160, 48), price: 350 },
        OBJECT_42: { name: 'Object 42', size: new Vec2(16), spriteOffset: new Vec2(176, 48), price: 350 },
        OBJECT_43: { name: 'Object 43', size: new Vec2(16), spriteOffset: new Vec2(192, 48), price: 350 },
        OBJECT_44: { name: 'Object 44', size: new Vec2(16), spriteOffset: new Vec2(208, 48), price: 350 },
        OBJECT_45: { name: 'Object 45', size: new Vec2(16), spriteOffset: new Vec2(224, 48), price: 350 },
        OBJECT_46: { name: 'Object 46', size: new Vec2(16), spriteOffset: new Vec2(240, 48), price: 350 },
        OBJECT_47: { name: 'Object 47', size: new Vec2(16), spriteOffset: new Vec2(256, 48), price: 350 },
        OBJECT_48: { name: 'Object 48', size: new Vec2(16), spriteOffset: new Vec2(272, 48), price: 350 },
        OBJECT_49: { name: 'Object 49', size: new Vec2(16), spriteOffset: new Vec2(288, 48), price: 350 },
        OBJECT_50: { name: 'Object 50', size: new Vec2(16), spriteOffset: new Vec2(304, 48), price: 350 },
        OBJECT_51: { name: 'Object 51', size: new Vec2(16), spriteOffset: new Vec2(320, 48), price: 350 },
        OBJECT_52: { name: 'Object 52', size: new Vec2(16), spriteOffset: new Vec2(336, 48), price: 350 },
        OBJECT_53: { name: 'Object 53', size: new Vec2(16), spriteOffset: new Vec2(352, 48), price: 350 },
        OBJECT_54: { name: 'Object 54', size: new Vec2(16), spriteOffset: new Vec2(368, 48), price: 350 },
        OBJECT_55: { name: 'Object 55', size: new Vec2(16), spriteOffset: new Vec2(384, 48), price: 350 },
        
    };

        static FENCES = {
        OBJECT_01: { name: 'Fence', size: new Vec2(32, 16), spriteOffset: new Vec2(0, 128), price: 50 },
        OBJECT_02: { name: 'Fence (Right)', size: new Vec2(16, 32), spriteOffset: new Vec2(32, 128), price: 50 },
        OBJECT_03: { name: 'Fence (Left)', size: new Vec2(16, 32), spriteOffset: new Vec2(48, 128), price: 50 },
        OBJECT_04: { name: 'White Fence', size: new Vec2(32, 16), spriteOffset: new Vec2(64, 128), price: 50 },
        OBJECT_05: { name: 'White Fence (Right)', size: new Vec2(16, 32), spriteOffset: new Vec2(96, 128), price: 50 },
        OBJECT_06: { name: 'White Fence (Left)', size: new Vec2(16, 32), spriteOffset: new Vec2(112, 128), price: 50 },
        OBJECT_07: { name: 'Fence', size: new Vec2(32, 16), spriteOffset: new Vec2(128, 128), price: 50 },
        OBJECT_08: { name: 'Fence (Right)', size: new Vec2(16, 32), spriteOffset: new Vec2(160, 128), price: 50 },
        OBJECT_09: { name: 'Fence (Left)', size: new Vec2(16, 32), spriteOffset: new Vec2(176, 128), price: 50 },
        };

        static SPECIAL = {
        OBJECT_01: { name: 'JavaScript Banner', size: new Vec2(32, 48), spriteOffset: new Vec2(0, 464), nightSpriteOffsetY: 256, price: 0 },
        OBJECT_02: { name: 'C Banner', size: new Vec2(32, 48), spriteOffset: new Vec2(32, 464), nightSpriteOffsetY: 256, price: 0 },
        OBJECT_03: { name: 'C++ Banner', size: new Vec2(32, 48), spriteOffset: new Vec2(64, 464), nightSpriteOffsetY: 256, price: 0 },
        OBJECT_04: { name: 'C# Banner', size: new Vec2(32, 48), spriteOffset: new Vec2(96, 464), nightSpriteOffsetY: 256, price: 0 },
        OBJECT_05: { name: 'Java Banner', size: new Vec2(32, 48), spriteOffset: new Vec2(128, 464), nightSpriteOffsetY: 256, price: 0 },
    };

}
