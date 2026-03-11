class Plant extends GameObject {

    get isDecoration() { return true; }
    get isPlant() { return true; }

    #plantId = '';
    #plantIndex = -1;
    #phase = 0;
    #baseOffsetX = 0;
    #baseOffsetY = 0;
    #stepX = 0;
    #stepY = 0;
    #price = 0;

    get plantId() { return this.#plantId; }
    get plantIndex() { return this.#plantIndex; }
    get phase() { return this.#phase; }
    get price() { return this.#price; }

    #snap = 16;
    #moving = false;
    #movingOffset = new Vec2();
    #dirty = false;
    #pendingPurchase = false; // true when bought from store, cleared on first placement

    get moving() { return this.#moving; }
    get isPendingPurchase() { return this.#pendingPurchase; }

    setPendingPurchase() {
        this.#pendingPurchase = true;
    }

    /**
     * @param {object} config
     *   plantId, index, phase, size, spriteOffset, phaseStep, price, pos
     */
    constructor(config = {}) {
        const w = Array.isArray(config.size) ? config.size[0] : 16;
        const h = Array.isArray(config.size) ? config.size[1] : 32;
        super({
            image: 'plants.png',
            size: new Vec2(w, h),
            pos: config.pos ?? new Vec2(),
        });

        this.#plantId = config.plantId ?? '';
        this.#plantIndex = typeof config.index === 'number' ? config.index : -1;
        this.#phase = typeof config.phase === 'number' ? config.phase : 0;
        this.#baseOffsetX = Array.isArray(config.spriteOffset) ? config.spriteOffset[0] : 0;
        this.#baseOffsetY = Array.isArray(config.spriteOffset) ? config.spriteOffset[1] : 0;
        this.#stepX = Array.isArray(config.phaseStep) ? config.phaseStep[0] : 0;
        this.#stepY = Array.isArray(config.phaseStep) ? config.phaseStep[1] : 16;
        this.#price = typeof config.price === 'number' ? config.price : 0;

        // Set initial sprite based on phase
        this.#updateSprite();

        Game.plants.push(this);
        Game.decoration.push(this);
    }

    /** Updates the sprite offset to match the current growth phase. */
    #updateSprite() {
        this.spriteOffset.x = this.#baseOffsetX + this.#phase * this.#stepX;
        this.spriteOffset.y = this.#baseOffsetY + this.#phase * this.#stepY;
    }

    /** Sets the growth phase (0–4) and updates the visual. */
    setPhase(phase) {
        this.#phase = phase;
        this.#updateSprite();
    }

    remove() {
        super.remove();

        const idx = Game.plants.indexOf(this);
        Game.plants.removeItem(this);
        Game.decoration.removeItem(this);

        // If this was a pending purchase that was never placed, just remove from frontend
        if (!this.#pendingPurchase) {
            vscode.postMessage({
                type: 'remove_plant',
                index: idx >= 0 ? idx : this.#plantIndex,
            });
        } else {
            this.#pendingPurchase = false;
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
        // If mulch consumable selected, apply it to this plant
        if (Game.isAction(Action.CANDY) && Game.selectedConsumable) {
            const consumableId = Game.selectedConsumable;
            const info = typeof ConsumableCatalog !== 'undefined'
                ? ConsumableCatalog.find(c => c.id === consumableId)
                : null;
            if (info && info.category === 'mulch') {
                if (Game.getItemCount(consumableId) <= 0) {
                    Game.showMessage('None left!');
                    Game.setAction(Action.NONE);
                    Game.setSelectedConsumable(null);
                    return true;
                }
                Game.setAction(Action.NONE);
                Game.setSelectedConsumable(null);
                const plantIndex = Game.plants.indexOf(this);
                if (plantIndex >= 0) {
                    vscode.postMessage({ type: 'apply_mulch', mulchId: consumableId, index: plantIndex });
                }
                return true;
            }
        }

        // If in normal mode (no action / no decor), attempt harvest
        if (!Game.isAction(Action.DECOR)) {
            if (this.#phase >= 4) {
                vscode.postMessage({ type: 'harvest_plant', index: Game.plants.indexOf(this) });
            } else {
                Game.showMessage('Not ripe yet...');
            }
            return true;
        }

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
            Game.addMoney(-this.price);
            vscode.postMessage({
                type: 'add_plant',
                plantId: this.#plantId,
                x: this.pos.x,
                y: this.pos.y,
            });
            this.#pendingPurchase = false;
            this.#dirty = false;
        } else if (this.#dirty) {
            const idx = Game.plants.indexOf(this);
            vscode.postMessage({
                type: 'move_plant',
                index: idx >= 0 ? idx : this.#plantIndex,
                x: this.pos.x,
                y: this.pos.y,
            });
            this.#dirty = false;
        }
        this.#moving = false;
    }

    snapPos(pos) {
        return pos.div(this.#snap).toIntRound().mult(this.#snap);
    }

    /** Override draw to add sparkle effect when ripe. */
    draw(ctx, options = {}) {
        super.draw(ctx, options);

        // Add a subtle glow when ripe (phase 4)
        if (this.#phase >= 4 && Game.frames % 40 < 20) {
            const drawPos = options.pos ?? this.pos;
            ctx.save();
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = '#ffdd44';
            ctx.beginPath();
            ctx.arc(drawPos.x + this.size.x / 2, drawPos.y + 4, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
}
