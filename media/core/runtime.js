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
            if (typeof config.loop === 'boolean') { this.#loop = config.loop; }
            if (typeof config.flip === 'boolean') { this.#flip = config.flip; }
            if (typeof config.pixelOffset === 'boolean') { this.#pixelOffset = config.pixelOffset; }
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
                    if (this.#frame >= this.#frames.length) { this.#frame = 0; }
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
        //Apply config
        this.#applyConfig(config);

        //Add to game objects list
        Game.objects.push(this);
    }

    #applyConfig(config) {
        //Check config
        if (typeof config !== 'object') { return; }

        //Object
        if (typeof config.active === 'boolean') { this.#active = config.active; }
        if (typeof config.name === 'string') { this.#name = config.name; }

        //Position & size
        if (typeof config.pos === 'object') { this.#pos = config.pos; }
        if (typeof config.size === 'object') { this.#size = config.size; }

        //Clicks
        if (typeof config.clickable === 'boolean') { this.#clickable = config.clickable; }

        //Rendering (sorting)
        if (typeof config.sortingLayer === 'number') { this.#sortingLayer = config.sortingLayer; }

        //Rendering (sprite sheet)
        if (typeof config.image === 'string') { this.#image.src = `${Game.mediaURI}sprites/${config.image}`; }
        if (typeof config.spriteOffset === 'object') { this.#spriteOffset = config.spriteOffset; }
        if (typeof config.spriteSheetOffset === 'object') { this.#spriteSheetOffset = config.spriteSheetOffset; }

        //Animation
        if (typeof config.animations === 'object') { this.#animations = config.animations; }
    }

    remove() {
        //Remove from objects list
        Game.objects.removeItem(this);
    }

    setActive(active) {
        //Invalid value
        if (typeof active !== 'boolean') { return; }

        //Set active
        this.#active = active;
    }

    //Update
    update() {
        //Update animation sprite offset
        if (this.#animation) { this.#spriteOffset = this.#animation.update().mult(this.#animation.pixelOffset ? new Vec2(1) : this.size); }
    }

    //Clicks
    isValidMousePos(pos) {
        //Not clickable
        if (!this.clickable) { return false; }

        //Check if clicked inside bounding box
        if (!this.isPosInBounds(pos)) { return false; }

        //Check if clicked on transparent pixel
        if (!this.isPosInSprite(pos, Game.canvasAlphaTest, Game.contextAlphaTest)) { return false; }

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
        if (!this.isValidMousePos(clickPos)) { return false; }
        
        //Mouse down event
        return this.mouseDown(clickPos);
    }

    checkMouseUp(clickPos) {
        //Check if mouse pos is valid
        if (!this.isValidMousePos(clickPos)) { return false; }
        
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
        if (this.animation?.flip) {
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
        if (typeof this.animations[name] !== 'object') { return; }

        //Fix force animation
        if (typeof force !== 'boolean') { force = false; }

        //Get animation
        let animation = this.animations[name];
        if (Array.isArray(animation)) { animation = animation[Util.randomExclusive(animation.length)]; }

        //Change current animation & reset it
        if (animation === this.animation && !force) { return; }
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
        config.size = new Vec2(10, 20);
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

    //Pokemons
    onReached() {
        //Tell pokemons to stop moving towards the ball
        for (const pokemon of Game.pets) {
            if (pokemon.ai.state === PetAI.MOVE_BALL) {
                pokemon.ai.setState(AI.IDLE);
            }
        }

        //Hide ball
        this.setActive(false);
    }

}

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
        if (typeof scale !== 'number') { return; }

        //Update scale
        this.#scale = scale;
        this.onResize();
    };

    static onResize = () => {
        //Update game window size
        this.#windowSize = new Vec2(window.innerWidth, window.innerHeight);
        this.#windowSizeScaled = this.windowSize.div(this.scale);

        //Update canvas sizes
        this.canvas.width = this.windowSize.x;
        this.canvas.height = this.windowSize.y;
        this.canvasBuffer.width = this.windowSize.x;
        this.canvasBuffer.height = this.windowSize.y;

        //Fit all pokemons & wild pokemons on screen
        this.pets.forEach(pokemon => pokemon.moveTo(pokemon.pos));
        this.wildPokemons.forEach(wildPokemon => wildPokemon.moveTo(wildPokemon.pos));
    };

    //Update
    static #fps = 20;    //Game framerate
    static #frames = 0;  //Frames since game start

    static get fps() { return this.#fps; }
    static get frames() { return this.#frames; }

    static update = () => {
        //Check if window size changed
        if (this.windowSize.x !== window.innerWidth || this.windowSize.y !== window.innerHeight) { this.onResize(); }

        //Next frame
        this.#frames++;

        //Update objects
        for (const obj of this.objects) {
            //Not active
            if (!obj.active) { continue; }

            //Draw object
            obj.update();
        }
    };

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
            if (!obj.active) { continue; }

            //Check if in decor mode and object is not decor
            if (inDecorMode && !obj.isDecoration) { continue; }

            //Draw object
            obj.draw(this.contextBuffer);
        }

        //Draw double bufffer into real canvas
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.drawImage(this.canvasBuffer, 0, 0);
    };

    //Game objects
    static #objects = [];    //List of all the game objects (gets sorted every frame to check clicks and render back-to-front)
    static #ball;            //Pets ball object, gets init later
    static #pets = [];       //List of all the pets       (do not sort, positions must be the same as in extension.ts)
    static #decoration = []; //List of all the decoration (do not sort, positions must be the same as in extension.ts)
    static #wildPokemons = [];   //List of all the wild pokemons
    static #wildPokemonSpawner = new Timeout(() => vscode.postMessage({ type: 'spawn_wild_pokemon' }));

    static get objects() { return this.#objects; }
    static get ball() { return this.#ball; }
    static get pets() { return this.#pets; }
    static get decoration() { return this.#decoration; }
    static get wildPokemons() { return this.#wildPokemons; }
    static get wildPokemonSpawner() { return this.#wildPokemonSpawner; }

    static sortObjects = () => {
        //Sort objects back-to-front
        this.objects.sort((a, b) => { return a.sortingLayer === b.sortingLayer ? a.sortingOrder - b.sortingOrder : a.sortingLayer - b.sortingLayer; }); 
    };

    //Money
    static #money = 0;
    static #moneyText = document.getElementById('moneyText');

    static get money() { return this.#money; }

    static setMoney = (amount) => {
        this.#money = amount;
        this.#moneyText.innerText = `Gold: ${amount}`;
    };

    static addMoney = (amount) => {
        this.setMoney(this.money + amount);
        this.showMessage(`${amount >= 0 ? '+' : '-'}${Math.abs(amount)}G`);
        vscode.postMessage({ 
            type: 'money', 
            value: this.money 
        });
    };

    //Current action being performed
    static #action = Action.NONE;

    static get action() { return this.#action; };

    static isAction = (action) => { 
        return this.action === action;
    };

    static setAction = (action) => {
        //Update action & cursor
        this.#action = action;
        Cursor.setIcon(action);

        //Close menus & toggle decor mode overlay
        Menus.close();
        DecorMode.showOverlay(this.isAction(Action.DECOR));
    };

    //Messages
    static showMessage = (content, isLong = false) => {
        //Create message element
        const message = document.createElement('span');
        message.classList.add('message');
        message.innerText = content;
        if (isLong) { message.setAttribute('long', ''); }
        document.getElementById('messages').appendChild(message);

        //Set timeout to remove message element
        setTimeout(() => message.remove(), isLong ? 3000 : 2000);
    };

    //Game loop
    static #deltaAccumulation = 0;
    static #lastFrameTimestamp;
    static #animationFrame;

    static gameLoop = (timestamp) => {
        //Check if last frame timestamp is init
        if (!this.#lastFrameTimestamp) { this.#lastFrameTimestamp = timestamp; }

        //Calculate delta accumulation
        this.#deltaAccumulation += timestamp - this.#lastFrameTimestamp;
        this.#lastFrameTimestamp = timestamp;

        //Calculate the amount of updates needed to perform
        const interval = (1000 / this.fps);
        const updates = Math.floor(this.#deltaAccumulation / interval);

        //Perform updates
        for (let update = 0; update < updates; update++) { this.update(); }

        //Draw once per loop
        this.draw();

        //Update delta accumulation
        this.#deltaAccumulation = this.#deltaAccumulation - (updates * interval);

        //Keep the loop going
        this.#animationFrame = requestAnimationFrame(this.gameLoop);
    };

    static start = () => {
        //Init canvas contexts
        this.#context = this.canvas.getContext('2d');
        this.#contextBuffer = this.canvasBuffer.getContext('2d', { willReadFrequently: true });
        this.#contextAlphaTest = this.canvasAlphaTest.getContext('2d', { willReadFrequently: true });

        //Init canvas sizes
        this.onResize();

        //Create ball
        this.#ball = new Ball();

        //Start game loop
        cancelAnimationFrame(this.#animationFrame);
        this.#animationFrame = requestAnimationFrame(this.gameLoop);
    };

}