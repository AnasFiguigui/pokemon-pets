//Classes
class Vec2 {

    //Position
    x = 0;
    y = 0;

    //Constructor
    constructor(x, y) {
        //Init from Vec2
        if (typeof x === 'object') {
            y = x.y;
            x = x.x;
        }

        //Init from numbers
        this.x = typeof x === 'number' ? x : 0;
        this.y = typeof y === 'number' ? y : this.x;
    }

    //Functions
    clone() {
        return new Vec2(this.x, this.y);
    }

    equals(v) {
        return this.x === v.x && this.y === v.y;
    }

    add(n) {
        if (typeof n === 'object') {
            return new Vec2(this.x + n.x, this.y + n.y);
        } else {
            return new Vec2(this.x + n, this.y + n);
        }
    }

    sub(n) {
        if (typeof n === 'object') {
            return new Vec2(this.x - n.x, this.y - n.y);
        } else {
            return new Vec2(this.x - n, this.y - n);
        }
    }

    mult(n) {
        if (typeof n === 'object') {
            return new Vec2(this.x * n.x, this.y * n.y);
        } else {
            return new Vec2(this.x * n, this.y * n);
        }
    }

    div(n) {
        if (typeof n === 'object') {
            return new Vec2(this.x / n.x, this.y / n.y);
        } else {
            return new Vec2(this.x / n, this.y / n);
        }
    }

    mod(n) {
        if (typeof n === 'object') {
            return new Vec2(this.x % n.x, this.y % n.y);
        } else {
            return new Vec2(this.x % n, this.y % n);
        }
    }

    toInt() {
        return new Vec2(Math.floor(this.x), Math.floor(this.y));
    }

    toIntRound() {
        return new Vec2(Math.round(this.x), Math.round(this.y));
    }

    toIntCeil() {
        return new Vec2(Math.ceil(this.x), Math.ceil(this.y));
    }

    toString() {
        return `(${this.x}, ${this.y})`;
    }

}

class Timer {

    //Info
    #active = false;
    #end = 0;

    get justFinished() { return this.#active && Game.frames === this.#end; }
    get finished() { return this.#active && Game.frames >= this.#end; }

    //Functions
    count(frames) {
        this.#active = true;
        this.#end = Game.frames + frames;
    }

    reset() {
        this.#active = false;
    }

}

class Timeout {

    //Info
    #fun;
    #timeout;

    //Constructor
    constructor(fun, duration) {
        this.#fun = fun;
        if (typeof duration === 'number') {
            this.wait(duration);
        }
    }

    //Functions
    wait(duration) {
        this.stop();
        this.#timeout = setTimeout(this.#fun, duration);
    }

    stop() {
        clearTimeout(this.#timeout);
    }

}

class Util {

    static randomExclusive(max) {
        //Random number from 0 to max exclusive
        return Math.floor(Math.random() * (max));
    }

    static randomInclusive(max) {
        //Random number from 0 to max inclusive
        return Math.floor(Math.random() * (max + 1));
    }

    static clamp(number, min, max) {
        //Clamp number between min a max
        return Math.min(Math.max(number, min), max);
    }

    static moveTowards(current, target, delta) {
        //Get distance
        const diff = target - current;
        const distance = Math.abs(diff);

        //Move towards target
        return (distance < delta ? target : current + diff / distance * delta);
    }
        
    static titleCase(str) {
        const parts = str.toLowerCase().split(' ');
        for (let i = 0; i < parts.length; i++) {
            parts[i] = parts[i].charAt(0).toUpperCase() + parts[i].substring(1);
        }
        return parts.join(' ');
    }

}

//Array extensions
Array.prototype.removeAt = function(index) { // NOSONAR - intentional prototype extension used throughout codebase
    const elem = this[index];
    this.splice(index, 1);
    return elem;
};

Array.prototype.removeItem = function(elem) { // NOSONAR - intentional prototype extension used throughout codebase
    const index = this.indexOf(elem);
    if (index !== -1) { this.splice(index, 1); }
    return index;
};

Array.prototype.isEmpty = function() { // NOSONAR - intentional prototype extension used throughout codebase
    return this.length === 0;
};

//Actions
class Action {

    static get NONE() { return ''; }
    static get CANDY() { return 'candy'; }
    static get BALL() { return 'ball'; }
    static get DECOR() { return 'decor'; }

}

//Cursor
class Cursor {

    //Cursor HTML element
    static #element = document.getElementById('cursor');

    //Position
    static #pos = new Vec2();

    static get pos() { return this.#pos; }
    static get posScaled() { return Cursor.pos.div(Game.scale).toInt(); }

    static moveTo(pos) {
        this.#pos = pos;
        this.#element.style.left = `${pos.x}px`;
        this.#element.style.top =  `${pos.y}px`;
    }

    //Icon
    static #icons = [Action.BALL, Action.CANDY];

    static setIcon(icon) {
        //Valid icons
        icon = this.#icons.includes(icon) ? icon : Action.NONE;

        //Change cursor icon
        this.#element.setAttribute('icon', icon);

        //Toggle real cursor
        document.body.setAttribute('cursor', icon === Action.NONE ? '' : 'none');
    }

}

//Menus
class Menus {

    //Black semitransparent menus backdrop
    static #backdrop = document.getElementById('menus');

    //Toggle menus
    static #current; //Name of the currently open menu

    static get current() { return this.#current; }

    static toggle(name, show) {
        //Invalid name
        if (typeof name !== 'string') { return; }
        
        //Get menu
        const menu = document.getElementById(name);
        if (!menu) { return; }

        //Fix show
        const isVisible = menu.hasAttribute('show');
        if (typeof show !== 'boolean') {
            //Invalid value -> Toggle menu visibility
            show = !isVisible;
        } else if (show === isVisible) {
            //Same state -> Return
            return;
        }

        //Toggle menu
        if (show) {
            //Close currently open menu
            this.close();

            //Show menu
            menu.setAttribute('show', '');
            this.#current = name;
            this.#backdrop.setAttribute('show', '');
            if (typeof this.onOpen === 'function') { this.onOpen(name); }
        } else {
            //Hide menu
            menu.removeAttribute('show');
            this.#current = undefined;
            this.#backdrop.removeAttribute('show');
            if (typeof this.onClose === 'function') { this.onClose(name); }
        }
    }

    static close() {
        this.toggle(this.current, false);
    }

    //Optional callback when a menu is closed
    static onClose = null;

    //Optional callback when a menu is opened
    static onOpen = null;

}

//Decor mode
class DecorMode {

    //Actions
    static get ACTION_MOVE() { return 'move'; }
    static get ACTION_SELL() { return 'sell'; }

    static #action = DecorMode.ACTION_MOVE;

    static get action() { return this.#action; }

    static isAction(action) { 
        return this.action === action;
    }

    static setAction(action) {
        switch (action) {
            case DecorMode.ACTION_MOVE:
                this.#actionButton.innerText = 'Sell';
                this.#helpText.innerText = 'Drag to move';
                break;
            case DecorMode.ACTION_SELL:
                this.#actionButton.innerText = 'Move';
                this.#helpText.innerText = 'Click to sell';
                break;
        }
        this.#action = action;
    }

    static toggleAction() {
        if (this.isAction(DecorMode.ACTION_MOVE)) {
            this.setAction(DecorMode.ACTION_SELL);
        } else {
            this.setAction(DecorMode.ACTION_MOVE);
        }
    }

    //UI
    static #overlay = document.getElementById('decor');
    static #helpText = document.getElementById('decorHelp');
    static #actionButton = document.getElementById('decorAction');
    static #actionsToggleButton = document.getElementById('actionsDecor');

    static showOverlay(show) {
        //Fix args
        if (typeof show !== 'boolean') { show = !this.#overlay.hasAttribute('show'); }

        //Toggle
        if (show) {
            this.#actionsToggleButton.innerText = 'Exit Build Mode';
            this.#overlay.setAttribute('show', '');
        } else {
            this.#actionsToggleButton.innerText = 'Enter Build Mode';
            this.#overlay.removeAttribute('show');
        }
    }

    //Mode
    static toggle(show) {
        //Fix args
        if (typeof show !== 'boolean') { show = !Game.isAction(Action.DECOR); }

        //Toggle
        if (show) {
            //No decoration
            if (Game.decoration.isEmpty()) {
                Game.showMessage('Buy decoration first', true);
                return;
            }

            //Set action to move decor
            this.setAction(DecorMode.ACTION_MOVE);

            //Enter decor mode
            Game.setAction(Action.DECOR);
        } else {
            //Stop dragging all
            for (const decoration of Game.decoration) { decoration.stopDragging(); }

            //Exit decor mode
            Game.setAction(Action.NONE);
        }
    }

}

//Animations
