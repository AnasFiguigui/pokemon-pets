class Decoration extends GameObject {

    get isDecoration() { return true; }

    #price = 0;
    
    get price() { return this.#price; }

    #snap = 16;
    #moving = false;
    #movingOffset = new Vec2();
    #dirty = false;     // Position changed during drag, needs saving

    get moving() { return this.#moving; }

    constructor(preset = {}, config = {}) {
        config.image = `decoration.png`;
        super({ ...preset, ...config });

        if (typeof preset.price === 'number') this.#price = preset.price;

        Game.decoration.push(this);
    }

    remove() {
        super.remove();

        const index = Game.decoration.removeItem(this);

        vscode.postMessage({
            type: 'remove_decor',
            index: index,
        });

        if (Game.decoration.isEmpty() && Game.isAction(Action.DECOR)) DecorMode.toggle(false);
    }

    update() {
        super.update();

        if (!this.#moving || !DecorMode.isAction(DecorMode.ACTION_MOVE)) return;

        const mousePos = Cursor.posScaled.sub(this.#movingOffset);
        const snappedPos = this.snapPos(mousePos);

        snappedPos.x = Util.clamp(snappedPos.x, 0, Math.floor((Game.windowSizeScaled.x - this.size.x + this.#snap) / this.#snap) * this.#snap);
        snappedPos.y = Util.clamp(snappedPos.y, 0, Math.floor((Game.windowSizeScaled.y - this.size.y + this.#snap) / this.#snap) * this.#snap);

        if (snappedPos.equals(this.pos)) return;

        this.moveTo(snappedPos, { ignoreWalls: true });
        this.#dirty = true;
    }

    mouseDown(pos) {
        if (!Game.isAction(Action.DECOR)) return false;

        switch (DecorMode.action) {
            case DecorMode.ACTION_MOVE:
                this.startDragging(pos.sub(this.pos));
                break;
            case DecorMode.ACTION_SELL:
                break;
        }

        return true;
    }

    mouseUp(pos) {
        if (!Game.isAction(Action.DECOR)) return false;

        switch (DecorMode.action) {
            case DecorMode.ACTION_MOVE:
                this.stopDragging();
                break;
            case DecorMode.ACTION_SELL:
                if (typeof this.price === 'number') Game.addMoney(Math.floor(this.price * 0.8));
                this.remove();
                break;
        }

        return true;
    }

    startDragging(moveOffset) {
        this.#moving = true;
        this.#movingOffset = moveOffset;
    }

    stopDragging() {
        if (this.#dirty) {
            vscode.postMessage({
                type: 'move_decor',
                index: Game.decoration.indexOf(this),
                x: this.pos.x,
                y: this.pos.y
            });
            this.#dirty = false;
        }
        this.#moving = false;
    }

    snapPos(pos) {
        return pos.div(this.#snap).toIntRound().mult(this.#snap);
    }
}
