//Layers & presets
class DecorationLayer { 
    
    static get DEFAULT() { return 0; }
    static get CUSHIONS() { return -10; }
    static get RUGS() { return -20; }

}

class DecorationPreset {

    //Plants
    static PLANTS = {
        HOUSE_PLANT_1: {
            name: 'House Plant 1',
            size: new Vec2(16, 32),
            spriteOffset: new Vec2(0, 688),
            price: 250,
        },
    };

    //Misc
    static LARGE_MISC = {
        OBJECT_01: { name: 'Object 01', size: new Vec2(16, 32), spriteOffset: new Vec2(0, 64), price: 100 },
        OBJECT_02: { name: 'Object 02', size: new Vec2(16, 32), spriteOffset: new Vec2(32, 64), price: 100 },
        OBJECT_03: { name: 'Object 03', size: new Vec2(16, 32), spriteOffset: new Vec2(48, 64), price: 100 },
        OBJECT_04: { name: 'Object 04', size: new Vec2(16, 32), spriteOffset: new Vec2(64, 64), price: 100 },
        OBJECT_05: { name: 'Object 05', size: new Vec2(16, 32), spriteOffset: new Vec2(80, 64), price: 100 },
        OBJECT_06: { name: 'Object 06', size: new Vec2(16, 32), spriteOffset: new Vec2(96, 64), price: 100 },
        OBJECT_07: { name: 'Object 07', size: new Vec2(16, 32), spriteOffset: new Vec2(112, 64), price: 100 },
        OBJECT_08: { name: 'Object 08', size: new Vec2(16, 32), spriteOffset: new Vec2(128, 64), price: 100 },
        OBJECT_09: { name: 'Object 09', size: new Vec2(16, 32), spriteOffset: new Vec2(144, 64), price: 100 },
        OBJECT_10: { name: 'Object 10', size: new Vec2(16, 32), spriteOffset: new Vec2(160, 64), price: 100 },
        OBJECT_11: { name: 'Object 11', size: new Vec2(16, 32), spriteOffset: new Vec2(176, 64), price: 100 },
    };

        static MID_MISC = {
        OBJECT_01: { name: 'Object 01', size: new Vec2(16, 32), spriteOffset: new Vec2(0, 0), price: 100 },
        OBJECT_02: { name: 'Object 02', size: new Vec2(16, 32), spriteOffset: new Vec2(16, 0), price: 100 },
        OBJECT_03: { name: 'Object 03', size: new Vec2(16, 32), spriteOffset: new Vec2(32, 0), price: 100 },
        OBJECT_04: { name: 'Object 04', size: new Vec2(16, 32), spriteOffset: new Vec2(48, 0), price: 100 },
        OBJECT_05: { name: 'Object 05', size: new Vec2(16, 32), spriteOffset: new Vec2(64, 0), price: 100 },
        OBJECT_06: { name: 'Object 06', size: new Vec2(16, 32), spriteOffset: new Vec2(80, 0), price: 100 },
        OBJECT_07: { name: 'Object 07', size: new Vec2(16, 32), spriteOffset: new Vec2(96, 0), price: 100 },
        OBJECT_08: { name: 'Object 08', size: new Vec2(16, 32), spriteOffset: new Vec2(112, 0), price: 100 },
        OBJECT_09: { name: 'Object 09', size: new Vec2(16, 32), spriteOffset: new Vec2(128, 0), price: 100 },
        OBJECT_10: { name: 'Object 10', size: new Vec2(16, 32), spriteOffset: new Vec2(144, 0), price: 100 },
        OBJECT_11: { name: 'Object 11', size: new Vec2(16, 32), spriteOffset: new Vec2(160, 0), price: 100 },
        OBJECT_12: { name: 'Object 12', size: new Vec2(16, 32), spriteOffset: new Vec2(176, 0), price: 100 },
        OBJECT_13: { name: 'Object 13', size: new Vec2(16, 32), spriteOffset: new Vec2(192, 0), price: 100 },
        OBJECT_14: { name: 'Object 14', size: new Vec2(16, 32), spriteOffset: new Vec2(208, 0), price: 100 },
        OBJECT_15: { name: 'Object 15', size: new Vec2(16, 32), spriteOffset: new Vec2(224, 0), price: 100 },
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
    };

}

//Decoration object
class Decoration extends GameObject {

    //Object
    get isDecoration() { return true; }

    //Info
    #price = 0;
    
    get price() { return this.#price; }

    //Moving
    #snap = 16; //Snap grid size
    #moving = false;
    #movingOffset = new Vec2();

    get moving() { return this.#moving; }


    //Constructor
    constructor(preset = {}, config = {}) {
        //Add image to config
        config.image = `decoration.png`;

        //Create game object
        super({ ...preset, ...config });

        //Save price
        if (typeof preset.price === 'number') this.#price = preset.price;

        //Add to decoration list
        Game.decoration.push(this);
    }

    remove() {
        super.remove();

        //Remove from decoration list
        const index = Game.decoration.removeItem(this);

        //Notify decor removed
        vscode.postMessage({
            type: 'remove_decor',
            index: index,
        });

        //Exit decor mode if no decor left
        if (Game.decoration.isEmpty() && Game.isAction(Action.DECOR)) DecorMode.toggle(false);
    }

    //Update
    update() {
        //Update game object
        super.update();

        //Check if moving
        if (!this.#moving || !DecorMode.isAction(DecorMode.ACTION_MOVE)) return;

        //Calculate new snapped position
        const mousePos = Cursor.posScaled.sub(this.#movingOffset);
        const snappedPos = this.snapPos(mousePos);

        //Fix bounds
        snappedPos.x = Util.clamp(snappedPos.x, 0, Math.floor((Game.windowSizeScaled.x - this.size.x + this.#snap) / this.#snap) * this.#snap);
        snappedPos.y = Util.clamp(snappedPos.y, 0, Math.floor((Game.windowSizeScaled.y - this.size.y + this.#snap) / this.#snap) * this.#snap);

        //Position didnt change
        if (snappedPos.equals(this.pos)) return;

        //Move to new pos
        this.moveTo(snappedPos, { ignoreWalls: true });

        //Notify position changed
        vscode.postMessage({
            type: 'move_decor',
            index: Game.decoration.indexOf(this),
            x: snappedPos.x,
            y: snappedPos.y
        });
    }

    //Click
    mouseDown(pos) {
        //Check game action
        if (!Game.isAction(Action.DECOR)) return false;

        //Check decor action
        switch (DecorMode.action) {
            //Move
            case DecorMode.ACTION_MOVE:
                //Start moving
                this.startDragging(pos.sub(this.pos));
                break;

            //Sell
            case DecorMode.ACTION_SELL:
                //Do nothing
                break;
        }

        //Consume event
        return true;
    }

    mouseUp(pos) {
        //Check game action
        if (!Game.isAction(Action.DECOR)) return false;

        //Check decor action
        switch (DecorMode.action) {
            //Move
            case DecorMode.ACTION_MOVE:
                //Stop moving
                this.stopDragging();
                break;

            //Sell
            case DecorMode.ACTION_SELL:
                //Give money to player (80%)
                if (typeof this.price === 'number') Game.addMoney(Math.floor(this.price * 0.8));

                //Remove decor
                this.remove();
                break;
        }

        //Consume event
        return true;
    }

    //Movement
    startDragging(moveOffset) {
        //Start moving
        this.#moving = true;
        this.#movingOffset = moveOffset;
    }

    stopDragging() {
        //Stop moving
        this.#moving = false;
    };

    snapPos(pos) {
        return pos.div(this.#snap).toIntRound().mult(this.#snap);
    }

}
