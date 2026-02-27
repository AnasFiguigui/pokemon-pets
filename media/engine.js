 /*$   /$$   /$$     /$$ /$$
| $$  | $$  | $$    |__/| $$
| $$  | $$ /$$$$$$   /$$| $$
| $$  | $$|_  $$_/  | $$| $$
| $$  | $$  | $$    | $$| $$
| $$  | $$  | $$ /$$| $$| $$
|  $$$$$$/  |  $$$$/| $$| $$
 \______/    \___/  |__/|_*/

//Classes
class Vec2 {

    //Position
    x = 0;
    y = 0;

    //Constructor
    constructor(x, y) {
        //Init from Vec2
        if (typeof x == 'object') {
            y = x.y;
            x = x.x;
        }

        //Init from numbers
        this.x = typeof x == 'number' ? x : 0;
        this.y = typeof y == 'number' ? y : this.x;
    }

    //Functions
    clone() {
        return new Vec2(this.x, this.y);
    }

    equals(v) {
        return this.x == v.x && this.y == v.y;
    }

    add(n) {
        if (typeof n === 'object')
            return new Vec2(this.x + n.x, this.y + n.y);
        else
            return new Vec2(this.x + n, this.y + n);
    }

    sub(n) {
        if (typeof n === 'object')
            return new Vec2(this.x - n.x, this.y - n.y);
        else
            return new Vec2(this.x - n, this.y - n);
    }

    mult(n) {
        if (typeof n === 'object')
            return new Vec2(this.x * n.x, this.y * n.y);
        else
            return new Vec2(this.x * n, this.y * n);
    }

    div(n) {
        if (typeof n === 'object')
            return new Vec2(this.x / n.x, this.y / n.y);
        else
            return new Vec2(this.x / n, this.y / n);
    }

    mod(n) {
        if (typeof n === 'object')
            return new Vec2(this.x % n.x, this.y % n.y);
        else
            return new Vec2(this.x % n, this.y % n);
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

    get justFinished() { return this.#active && Game.frames == this.#end; }
    get finished() { return this.#active && Game.frames >= this.#end; }

    //Constructor
    constructor() { }

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
        if (typeof duration === 'number') this.wait(duration);
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
        return (distance < delta ? target : current + diff / distance * delta)
    }
        
    static titleCase(str) {
        const parts = str.toLowerCase().split(' ');
        for (var i = 0; i < parts.length; i++) parts[i] = parts[i].charAt(0).toUpperCase() + parts[i].substring(1);
        return parts.join(' ');
    }

}

//Array extensions
Array.prototype.removeAt = function(index) {
    const elem = this[index];
    this.splice(index, 1);
    return elem;
}

Array.prototype.removeItem = function(elem) {
    const index = this.indexOf(elem);
    this.splice(index, 1);
    return index;
}

Array.prototype.isEmpty = function() {
    return this.length == 0;
}


  /*$$$$$              /$$     /$$
 /$$__  $$            | $$    |__/
| $$  \ $$  /$$$$$$$ /$$$$$$   /$$  /$$$$$$  /$$$$$$$   /$$$$$$$
| $$$$$$$$ /$$_____/|_  $$_/  | $$ /$$__  $$| $$__  $$ /$$_____/
| $$__  $$| $$        | $$    | $$| $$  \ $$| $$  \ $$|  $$$$$$
| $$  | $$| $$        | $$ /$$| $$| $$  | $$| $$  | $$ \____  $$
| $$  | $$|  $$$$$$$  |  $$$$/| $$|  $$$$$$/| $$  | $$ /$$$$$$$/
|__/  |__/ \_______/   \___/  |__/ \______/ |__/  |__/|______*/

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
        document.body.setAttribute('cursor', icon != Action.NONE ? 'none' : '');
    }

}


 /*$      /$$
| $$$    /$$$
| $$$$  /$$$$  /$$$$$$  /$$$$$$$  /$$   /$$  /$$$$$$$
| $$ $$/$$ $$ /$$__  $$| $$__  $$| $$  | $$ /$$_____/
| $$  $$$| $$| $$$$$$$$| $$  \ $$| $$  | $$|  $$$$$$
| $$\  $ | $$| $$_____/| $$  | $$| $$  | $$ \____  $$
| $$ \/  | $$|  $$$$$$$| $$  | $$|  $$$$$$/ /$$$$$$$/
|__/     |__/ \_______/|__/  |__/ \______/ |______*/

//Menus
class Menus {

    //Black semitransparent menus backdrop
    static #backdrop = document.getElementById('menus');

    //Toggle menus
    static #current; //Name of the currently open menu

    static get current() { return this.#current; }

    static toggle(name, show) {
        //Invalid name
        if (typeof name !== 'string') return;
        
        //Get menu
        const menu = document.getElementById(name);
        if (!menu) return;

        //Fix show
        const isVisible = menu.hasAttribute('show');
        if (typeof show !== 'boolean') {
            //Invalid value -> Toggle menu visibility
            show = !isVisible;
        } else if (show == isVisible) {
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
        } else {
            //Hide menu
            menu.removeAttribute('show');
            this.#current = undefined;
            this.#backdrop.removeAttribute('show');
        }
    }

    static close() {
        this.toggle(this.current, false);
    }

}

//Decor mode
class DecorMode {

    //Actions
    static get ACTION_MOVE() { return 'move'; }
    static get ACTION_SELL() { return 'sell'; }

    static #action = DecorMode.ACTION_MOVE;

    static get action() { return this.#action; }

    static isAction(action) { 
        return this.action == action;
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
        if (this.isAction(DecorMode.ACTION_MOVE))
            this.setAction(DecorMode.ACTION_SELL);
        else
            this.setAction(DecorMode.ACTION_MOVE);
    }

    //UI
    static #overlay = document.getElementById('decor');
    static #helpText = document.getElementById('decorHelp');
    static #actionButton = document.getElementById('decorAction');
    static #actionsToggleButton = document.getElementById('actionsDecor');

    static showOverlay(show) {
        //Fix args
        if (typeof show !== 'boolean') show = !this.#overlay.hasAttribute('show');

        //Toggle
        if (show) {
            this.#actionsToggleButton.innerText = 'Exit Decor Mode';
            this.#overlay.setAttribute('show', '');
        } else {
            this.#actionsToggleButton.innerText = 'Enter Decor Mode';
            this.#overlay.removeAttribute('show');
        }
    }

    //Mode
    static toggle(show) {
        //Fix args
        if (typeof show !== 'boolean') show = !Game.isAction(Action.DECOR);

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
            for (const decoration of Game.decoration) decoration.stopDragging();

            //Exit decor mode
            Game.setAction(Action.NONE);
        }
    }

}


  /*$$$$$                                     /$$$$$$  /$$                                 /$$
 /$$__  $$                                   /$$__  $$| $$                                | $$
| $$  \__/  /$$$$$$  /$$$$$$/$$$$   /$$$$$$ | $$  \ $$| $$$$$$$  /$$  /$$$$$$   /$$$$$$$ /$$$$$$   /$$$$$$$
| $$ /$$$$ |____  $$| $$_  $$_  $$ /$$__  $$| $$  | $$| $$__  $$|__/ /$$__  $$ /$$_____/|_  $$_/  /$$_____/
| $$|_  $$  /$$$$$$$| $$ \ $$ \ $$| $$$$$$$$| $$  | $$| $$  \ $$ /$$| $$$$$$$$| $$        | $$   |  $$$$$$
| $$  \ $$ /$$__  $$| $$ | $$ | $$| $$_____/| $$  | $$| $$  | $$| $$| $$_____/| $$        | $$ /$$\____  $$
|  $$$$$$/|  $$$$$$$| $$ | $$ | $$|  $$$$$$$|  $$$$$$/| $$$$$$$/| $$|  $$$$$$$|  $$$$$$$  |  $$$$//$$$$$$$/
 \______/  \_______/|__/ |__/ |__/ \_______/ \______/ |_______/ | $$ \_______/ \_______/   \___/ |_______/
                                                           /$$  | $$
                                                          |  $$$$$$/
                                                           \_____*/

//Animations
class Animation {

    //Animation info (temporal)
    #frame = 0;
    #counter = 0;
    #finished = false;

    get finished() { return this.#finished; };

    //Animation info (permanent)
    #frames = [];
    #speed = 5;   //Duration of each frame

    //Animation options
    #loop = true;           //Loop animation
    #flip = false;          //Flip sprite
    #pixelOffset = false;   //Use pixels instead of object size for the offset

    get loop() { return this.#loop; };
    get flip() { return this.#flip; };
    get pixelOffset() { return this.#pixelOffset; };


    //State
    constructor(frames, speed, config) {
        //Animation info
        this.#frames = frames;
        this.#speed = speed;

        //Check config
        if (typeof config === 'object') {
            if (typeof config.loop === 'boolean') this.#loop = config.loop;
            if (typeof config.flip === 'boolean') this.#flip = config.flip;
            if (typeof config.pixelOffset === 'boolean') this.#pixelOffset = config.pixelOffset;
        }

        //Reset current info
        this.reset();
    }

    reset() {
        //Reset current info
        this.#frame = 0;
        this.#counter = 0;
        this.#finished = false;
    }

    update() {
        //Not finished
        if (!this.finished) {
            //Add one to counter
            this.#counter++;

            //Check if counter finished
            if (this.#counter >= this.#speed) {
                //Counter finished -> Reset it
                this.#counter = 0;

                //Next frame
                if (!this.#loop && this.#frame >= this.#frames.length - 1) {
                    //Already in last frame & not looping -> Finish animation
                    this.#finished = true;
                } else {
                    //Next frame
                    this.#frame++;
                    if (this.#frame >= this.#frames.length) this.#frame = 0;
                }
            }
        }

        //Return animation sprite position
        const offset = this.#frames[this.#frame];
        return new Vec2(offset[0], offset[1]);
    }

}

//Game objects
class GameObject {

    //Object
    #active = true;
    #name = 'GameObject';

    get active() { return this.#active; }
    get name() { return this.#name; }

    //Position & Size
    #pos = new Vec2();
    #size = new Vec2(16);

    get pos() { return this.#pos; }
    get size() { return this.#size; }

    //Clicks
    #clickable = true;

    get clickable() { return this.#clickable; }

    //Rendering (sorting)
    #sortingLayer = 0;

    get sortingLayer() { return this.#sortingLayer; }
    get sortingOrder() { return this.pos.y + this.size.y; }

    //Rendering (sprite sheet)
    #image = new Image();               //Image containing the sprite sheet
    #spriteOffset = new Vec2();         //Offset for sprites inside a sprite sheet
    #spriteSheetOffset = new Vec2();    //Offset for images with multiple sprite sheets

    get image() { return this.#image; }
    get spriteOffset() { return this.#spriteOffset; }
    get spriteSheetOffset() { return this.#spriteSheetOffset; }

    //Animations
    #animations = {};                   //Object of animations with their names as keys
    #animation;                         //Currently selected animation

    get animations() { return this.#animations; }
    get animation() { return this.#animation; }


    //Constructor
    constructor(config = {}) {
        //Check config
        if (typeof config === 'object') {
            //Object
            if (typeof config.active === 'boolean') this.#active = config.active;
            if (typeof config.name === 'string') this.#name = config.name;

            //Position & size
            if (typeof config.pos === 'object') this.#pos = config.pos;
            if (typeof config.size === 'object') this.#size = config.size;

            //Clicks
            if (typeof config.clickable === 'boolean') this.#clickable = config.clickable;

            //Rendering (sorting)
            if (typeof config.sortingLayer === 'number') this.#sortingLayer = config.sortingLayer;

            //Rendering (sprite sheet)
            if (typeof config.image === 'string') this.#image.src = `${Game.mediaURI}sprites/${config.image}`;
            if (typeof config.spriteOffset === 'object') this.#spriteOffset = config.spriteOffset;
            if (typeof config.spriteSheetOffset === 'object') this.#spriteSheetOffset = config.spriteSheetOffset;

            //Animation
            if (typeof config.animations === 'object') this.#animations = config.animations;
        }

        //Add to game objects list
        Game.objects.push(this);
    }

    remove() {
        //Remove from objects list
        Game.objects.removeItem(this);
    }

    setActive(active) {
        //Invalid value
        if (typeof active !== 'boolean') return;

        //Set active
        this.#active = active;
    }

    //Update
    update() {
        //Update animation sprite offset
        if (this.#animation) this.#spriteOffset = this.#animation.update().mult(this.#animation.pixelOffset ? new Vec2(1) : this.size);
    }

    //Clicks
    isValidMousePos(pos) {
        //Not clickable
        if (!this.clickable) return false;

        //Check if clicked inside bounding box
        if (!this.isPosInBounds(pos)) return false;

        //Check if clicked on transparent pixel
        if (!this.isPosInSprite(pos, Game.canvasAlphaTest, Game.contextAlphaTest)) return false;

        //Valid 
        return true;
    }

    isPosInBounds(pos) {
        //Return true if pos is inside bounding box
        return pos.x >= this.pos.x && pos.x <= this.pos.x + this.size.x && pos.y >= this.pos.y && pos.y <= this.pos.y + this.size.y;
    }

    isPosInSprite(pos, canvas, ctx) {
        //Get relative click position
        const relPos = pos.sub(this.pos);  

        //Change canvas size to match object size
        canvas.width = this.size.x;
        canvas.height = this.size.y;
        
        //Clear canvas & draw object at origin
        ctx.clearRect(0, 0, this.size.x, this.size.y);
        this.draw(ctx, { pos: new Vec2() });

        //Get pixel at pos & check alpha
        const pixelData = ctx.getImageData(relPos.x, relPos.y, 1, 1).data;
        return pixelData[3] !== 0;
    }

    checkMouseDown(clickPos) {
        //Check if mouse pos is valid
        if (!this.isValidMousePos(clickPos)) return false;
        
        //Mouse down event
        return this.mouseDown(clickPos);
    }

    checkMouseUp(clickPos) {
        //Check if mouse pos is valid
        if (!this.isValidMousePos(clickPos)) return false;
        
        //Click event
        return this.mouseUp(clickPos);
    }
    
    mouseDown(pos) {
        //Mouse down was consumed
        return true;
    }

    mouseUp(pos) {
        //Mouse up was consumed
        return true;
    }

    //Rendering
    draw(ctx, options = {}) {
        //Get info
        const pos = (typeof options.pos === 'object' ? options.pos : this.pos);

        //Save context transform
        ctx.save(); 

        //Translate sprite
        ctx.translate(pos.x, pos.y);

        //Flip sprite
        if (this.animation && this.animation.flip) {
            ctx.translate(this.size.x, 0);
            ctx.scale(-1, 1);
        }
        
        //Draw sprite
        ctx.drawImage(
            this.image,     //Image
            this.spriteSheetOffset.x + this.spriteOffset.x, //Sprite offset x
            this.spriteSheetOffset.y + this.spriteOffset.y, //Sprite offset y
            this.size.x,         //Source sprite width
            this.size.y,         //Source sprite height
            0,              //Position
            0,              //Position
            this.size.x,         //Drawing width
            this.size.y          //Drawing height
        );

        //Restore context transform
        ctx.restore();
    }

    //Animations
    animate(name, force) {
        //Not an animation
        if (typeof this.animations[name] !== 'object') return;

        //Fix force animation
        if (typeof force !== 'boolean') force = false;

        //Get animation
        let animation = this.animations[name];
        if (Array.isArray(animation)) animation = animation[Util.randomExclusive(animation.length)];

        //Change current animation & reset it
        if (animation == this.animation && !force) return;
        this.#animation = animation;
        this.animation.reset();
    }

    //Movement
    get maxPosX() { return Math.floor(Game.windowSizeScaled.x - this.size.x); }
    get maxPosY() { return Math.floor(Game.windowSizeScaled.y - this.size.y); }
    get randomPoint() { return new Vec2(Util.randomInclusive(this.maxPosX), Util.randomInclusive(this.maxPosY)); }

    moveTo(pos, options = {}) {
        //Clamp new position
        if (!options.ignoreWalls) {
            pos.x = Util.clamp(pos.x, 0, this.maxPosX);
            pos.y = Util.clamp(pos.y, 0, this.maxPosY);
        }

        //Check if moved
        const moved = this.#pos.equals(pos);

        //Update position
        this.#pos = pos;

        //Return if moved
        return !moved;
    }

    respawn() {
        //Move to random point
        this.moveTo(this.randomPoint);
    }

}

//Ball object
class Ball extends GameObject {

    //Constructor
    constructor(config = {}) {
        //Object
        config.active = false;
        config.name = 'Ball';

        //Size, rendering & animations
        config.size = new Vec2(9, 18);
        config.image = `ball.png`;
        config.animations = {
            'bounce': new Animation(
                [[0, 0], [0, 2], [0, 4], [0, 6], [0, 9], [0, 6], [0, 4], [0, 2], [0, 0], [0, 2], [0, 4], [0, 2], [0, 0], [0, 2], [0, 0]],
                1,
                { loop: false, pixelOffset: true }
            )
        };
        
        //Create object
        super(config);
    }

    setActive(active) {
        super.setActive(active);

        //Bounce
        this.animate('bounce', true);
    }

    //Pets
    onReached() {
        //Tell pets to stop moving towards the ball
        for (const pet of Game.pets) {
            if (pet.ai.state == PetAI.MOVE_BALL) {
                pet.ai.setState(AI.IDLE);
            }
        }

        //Hide ball
        this.setActive(false);
    }

}


 /*$$$$$$$                     /$$
| $$_____/                    |__/
| $$       /$$$$$$$   /$$$$$$  /$$ /$$$$$$$   /$$$$$$
| $$$$$   | $$__  $$ /$$__  $$| $$| $$__  $$ /$$__  $$
| $$__/   | $$  \ $$| $$  \ $$| $$| $$  \ $$| $$$$$$$$
| $$      | $$  | $$| $$  | $$| $$| $$  | $$| $$_____/
| $$$$$$$$| $$  | $$|  $$$$$$$| $$| $$  | $$|  $$$$$$$
|________/|__/  |__/ \____  $$|__/|__/  |__/ \_______/
                     /$$  \ $$
                    |  $$$$$$/
                     \_____*/

class Game {

    //Media folder URI
    static #mediaURI = document.body.getAttribute('media');

    static get mediaURI() { return this.#mediaURI; }

    //Window
    static #scale = 2;
    static #windowSize = new Vec2(window.innerWidth, window.innerHeight);
    static #windowSizeScaled = new Vec2(window.innerWidth / 2, window.innerHeight / 2);

    static get scale() { return this.#scale; }
    static get windowSize() { return this.#windowSize; }
    static get windowSizeScaled() { return this.#windowSizeScaled; }

    static setScale = (scale) => {
        //Invalid value
        if (typeof scale !== 'number') return;

        //Update scale
        this.#scale = scale;
        this.onResize();
    }

    static onResize = () => {
        //Update game window size
        this.#windowSize = new Vec2(window.innerWidth, window.innerHeight);
        this.#windowSizeScaled = this.windowSize.div(this.scale);

        //Update buffer canvas size
        this.canvasBuffer.width = this.windowSize.x;
        this.canvasBuffer.height = this.windowSize.y;

        //Fit all pets & monsters on screen
        this.pets.forEach(pet => pet.moveTo(pet.pos))
        this.monsters.forEach(monster => monster.moveTo(monster.pos))
    }

    //Update
    static #fps = 30;    //Game framerate
    static #frames = 0;  //Frames since game start

    static get fps() { return this.#fps }
    static get frames() { return this.#frames }

    static update = () => {
        //Check if window size changed
        if (this.windowSize.x != window.innerWidth || this.windowSize.y != window.innerHeight) this.onResize();

        //Next frame
        this.#frames++;

        //Update objects
        for (const obj of this.objects) {
            //Not active
            if (!obj.active) continue;

            //Draw object
            obj.update();
        }

        //Draw objects
        requestAnimationFrame(this.draw);
    }

    //Rendering
    static #background = document.getElementById('background');
    static #canvas = document.getElementById('canvas');         //Real canvas
    static #canvasBuffer = document.createElement('canvas');    //Double buffer rendering (to prevent flickers after resizing the screen)
    static #canvasAlphaTest = document.createElement('canvas'); //Used to check for clicks in transparent pixels
    static #context;
    static #contextBuffer;
    static #contextAlphaTest;

    static get background() { return this.#background; }
    static get canvas() { return this.#canvas; }
    static get canvasBuffer() { return this.#canvasBuffer; }
    static get canvasAlphaTest() { return this.#canvasAlphaTest; }
    static get context() { return this.#context; }
    static get contextBuffer() { return this.#contextBuffer; }
    static get contextAlphaTest() { return this.#contextAlphaTest; }

    static draw = () => {
        //Clear canvas
        this.contextBuffer.clearRect(0, 0, this.canvasBuffer.width, this.canvasBuffer.height);

        //Sort objects
        this.sortObjects();

        //Check if in decor mode
        const inDecorMode = this.isAction(Action.DECOR);

        //Draw objects
        for (const obj of this.objects) {
            //Not active
            if (!obj.active) continue;

            //Check if in decor mode and object is not decor
            if (inDecorMode && !obj.isDecoration) continue;

            //Draw object
            obj.draw(this.contextBuffer);
        }

        //Draw double bufffer into real canvas
        this.canvas.width = this.canvasBuffer.width;
        this.canvas.height = this.canvasBuffer.height;
        this.context.drawImage(this.canvasBuffer, 0, 0);
    }

    //Game objects
    static #objects = [];    //List of all the game objects (gets sorted every frame to check clicks and render back-to-front)
    static #ball;            //Pets ball object, gets init later
    static #pets = [];       //List of all the pets       (do not sort, positions must be the same as in extension.ts)
    static #decoration = []; //List of all the decoration (do not sort, positions must be the same as in extension.ts)
    static #monsters = [];   //List of all the monsters
    static #monsterSpawner = new Timeout(() => vscode.postMessage({ type: 'spawn_monster' }));

    static get objects() { return this.#objects; }
    static get ball() { return this.#ball; }
    static get pets() { return this.#pets; }
    static get decoration() { return this.#decoration; }
    static get monsters() { return this.#monsters; }
    static get monsterSpawner() { return this.#monsterSpawner; }

    static sortObjects = () => {
        //Sort objects back-to-front
        this.objects.sort((a, b) => { return a.sortingLayer != b.sortingLayer ? a.sortingLayer - b.sortingLayer : a.sortingOrder - b.sortingOrder; }); 
    }

    //Money
    static #money = 0;
    static #moneyText = document.getElementById('moneyText');

    static get money() { return this.#money; }

    static setMoney = (amount) => {
        this.#money = amount;
        this.#moneyText.innerText = `${amount}G`;
    }

    static addMoney = (amount) => {
        this.setMoney(this.money + amount);
        this.showMessage(`${amount >= 0 ? '+' : '-'}${Math.abs(amount)}G`);
        vscode.postMessage({ 
            type: 'money', 
            value: this.money 
        });
    }

    //Current action being performed
    static #action = Action.NONE;

    static get action() { return this.#action; };

    static isAction = (action) => { 
        return this.action == action;
    }

    static setAction = (action) => {
        //Update action & cursor
        this.#action = action;
        Cursor.setIcon(action);

        //Close menus & toggle decor mode overlay
        Menus.close();
        DecorMode.showOverlay(this.isAction(Action.DECOR));
    }

    //Messages
    static showMessage = (content, isLong = false) => {
        //Create message element
        const message = document.createElement('span');
        message.classList.add('message');
        message.innerText = content;
        if (isLong) message.setAttribute('long', '');
        document.getElementById('messages').appendChild(message);

        //Set timeout to remove message element
        setTimeout(() => message.remove(), isLong ? 3000 : 2000);
    }

    //Game loop
    static #deltaAccumulation = 0;
    static #lastFrameTimestamp;
    static #animationFrame;

    static gameLoop = (timestamp) => {
        //Check if last frame timestamp is init
        if (!this.#lastFrameTimestamp) this.#lastFrameTimestamp = timestamp;

        //Calculate delta accumulation
        this.#deltaAccumulation += timestamp - this.#lastFrameTimestamp;
        this.#lastFrameTimestamp = timestamp;

        //Calculate the amount of updates needed to perform
        const interval = (1000 / this.fps);
        const updates = Math.floor(this.#deltaAccumulation / interval);

        //Perform updates
        for (let update = 0; update < updates; update++) this.update();

        //Update delta accumulation
        this.#deltaAccumulation = this.#deltaAccumulation - (updates * interval);

        //Keep the loop going
        this.#animationFrame = requestAnimationFrame(this.gameLoop);
    }

    static start = () => {
        //Init canvas contexts
        this.#context = this.canvas.getContext('2d');
        this.#contextBuffer = this.canvasBuffer.getContext('2d', { willReadFrequently: true });
        this.#contextAlphaTest = this.canvasAlphaTest.getContext('2d', { willReadFrequently: true });

        //Create ball
        this.#ball = new Ball();

        //Start game loop
        cancelAnimationFrame(this.#animationFrame);
        this.#animationFrame = requestAnimationFrame(this.gameLoop);
    }

}