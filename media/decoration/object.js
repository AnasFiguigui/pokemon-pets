class Decoration extends GameObject {

    get isDecoration() { return true; }

    #price = 0;
    #isLamp = false;
    #lightRadius = 0;
    #daySpriteY = 0;
    #nightSpriteY = 0;
    #quickAction = null;
    
    get price() { return this.#price; }
    get isLamp() { return this.#isLamp; }
    get lightRadius() { return this.#lightRadius; }
    get daySpriteY() { return this.#daySpriteY; }
    get nightSpriteY() { return this.#nightSpriteY; }
    get quickAction() { return this.#quickAction; }

    #snap = 16;
    #moving = false;
    #movingOffset = new Vec2();
    #dirty = false;     // Position changed during drag, needs saving
    #pendingPurchase = null; // { category, name } — set when bought from store, cleared on first placement

    get moving() { return this.#moving; }
    get isPendingPurchase() { return this.#pendingPurchase !== null; }

    setPendingPurchase(category, name) {
        this.#pendingPurchase = { category, name };
    }

    constructor(preset = {}, config = {}) {
        config.image = `decoration.png`;
        super({ ...preset, ...config });

        if (typeof preset.price === 'number') this.#price = preset.price;
        if (preset.isLamp === true) this.#isLamp = true;
        if (typeof preset.lightRadius === 'number') this.#lightRadius = preset.lightRadius;
        if (typeof preset.spriteOffset === 'object') this.#daySpriteY = preset.spriteOffset.y;
        if (typeof preset.nightSpriteOffsetY === 'number') this.#nightSpriteY = preset.nightSpriteOffsetY;
        if (typeof preset.quickAction === 'string') this.#quickAction = preset.quickAction;

        // Apply night sprite immediately if night overlay is active
        if (this.#isLamp && Game.nightOverlayActive) {
            this.spriteOffset.y = this.#nightSpriteY;
        }

        Game.decoration.push(this);
        if (this.#isLamp) { Game.lampMaskDirty = true; }
    }

    // Returns the decoration-only index (excluding plants) for backend sync
    getDecorIndex() {
        let decorIdx = 0;
        for (const item of Game.decoration) {
            if (item === this) { return decorIdx; }
            if (!item.isPlant) { decorIdx++; }
        }
        return -1;
    }

    remove() {
        super.remove();
        if (this.#isLamp) { Game.lampMaskDirty = true; }

        // Compute decoration-only index BEFORE removing from the array
        const decorIndex = this.getDecorIndex();
        Game.decoration.removeItem(this);

        // If this was a pending purchase that was never placed, just remove from frontend
        if (this.#pendingPurchase) {
            this.#pendingPurchase = null;
        } else if (decorIndex >= 0) {
            vscode.postMessage({
                type: 'remove_decor',
                index: decorIndex,
            });
        }

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
        if (this.#isLamp) { Game.lampMaskDirty = true; }
    }

    mouseDown(pos) {
        // Quick-access: capture mouse down so mouseUp fires
        if (!Game.isAction(Action.DECOR) && this.#quickAction) return true;

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
        // Quick-access click outside build mode
        if (!Game.isAction(Action.DECOR) && this.#quickAction) {
            this.#triggerQuickAction();
            return true;
        }

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
        // Finalize pending purchase on first placement
        if (this.#pendingPurchase) {
            const purchasedItem = this.#pendingPurchase;
            Game.addMoney(-this.price);
            vscode.postMessage({
                type: 'add_decor',
                x: this.pos.x,
                y: this.pos.y,
                category: purchasedItem.category,
                name: purchasedItem.name,
            });
            this.#pendingPurchase = null;
            this.#dirty = false;
            if (typeof rememberBuildShortcut === 'function') {
                rememberBuildShortcut({
                    kind: 'decoration',
                    category: purchasedItem.category,
                    name: purchasedItem.name,
                });
            }
        } else if (this.#dirty) {
            vscode.postMessage({
                type: 'move_decor',
                index: this.getDecorIndex(),
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

    #triggerQuickAction() {
        switch (this.#quickAction) {
            case 'pokedex':
                openPokedex();
                break;
            case 'throw_ball':
                toggleActionBall();
                break;
            case 'item_shop':
                openStoreMenu();
                break;
            case 'backpack':
                openBackpack();
                break;
            case 'build_mode':
                toggleActionDecor();
                break;
        }
    }
}
