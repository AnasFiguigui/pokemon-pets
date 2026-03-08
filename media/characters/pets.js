//AI
class AI {

    //States
    static get IDLE() { return 'idle'; }
    static get MOVE() { return 'move'; }
    static get SPECIAL() { return 'special'; }

    //AI info
    #character;
    #state = AI.IDLE;
    #timer = new Timer();
    #movePos = new Vec2();
    
    get character() { return this.#character; }
    get state() { return this.#state; }
    get timer() { return this.#timer; }

    //Config (idle)
    #idleDurationBase = 2 * Game.fps;       //Minimum duration of idle (in frames)
    #idleDurationVariation = 2 * Game.fps;  //Variation of duration for idle (in frames)

    get idleDuration() { return this.#idleDurationBase + Util.randomInclusive(this.#idleDurationVariation); }

    //Config (sleep)
    #canSleep = true;
    #isSleeping = false;
    #sleepDurationBase = 10 * Game.fps;     //Minimum duration of sleep (in frames)
    #sleepDurationVariation = 5 * Game.fps; //Variation of duration for sleep (in frames)

    get sleepDuration() { return this.#sleepDurationBase + Util.randomInclusive(this.#sleepDurationVariation); }

    //Config (special)
    #specialDuration = 2 * Game.fps;        //Duration of special (in frames)

    get specialDuration() { return this.#specialDuration; }


    //Constructor
    constructor(config) {
        //No config
        if (typeof config !== 'object') { return; }

        //Idle config
        if (typeof config.idleDurationBase === 'number') { this.#idleDurationBase = config.idleDurationBase; }
        if (typeof config.idleDurationVariation === 'number') { this.#idleDurationVariation = config.idleDurationVariation; }

        //Sleep config
        if (typeof config.canSleep === 'boolean') { this.#canSleep = config.canSleep; }
        if (typeof config.sleepDurationBase === 'number') { this.#sleepDurationBase = config.sleepDurationBase; }
        if (typeof config.sleepDurationVariation === 'number') { this.#sleepDurationVariation = config.sleepDurationVariation; }

        //Special config
        if (typeof config.specialDuration === 'number') { this.#specialDuration = config.specialDuration; }
    }

    assign(character) {
        //Assign character 
        this.#character = character;
    }

    //Click
    click() {
        // Base implementation - overridden in subclasses
    }

    //Movement
    _moveTowardsMovePos() {
        //Move position out of bounds -> Create a new one
        if (this.#movePos.x > this.character.maxPosX || this.#movePos.y > this.character.maxPosY) {
            this.moveTowards(this.character.randomPoint);
            return true;
        }

        //Calculate direction
        const dx = this.#movePos.x - this.character.pos.x;
        const dy = this.#movePos.y - this.character.pos.y;

        //Try to move (prefer diagonal when both axes differ)
        if (dx < 0 && dy < 0) { return this.moveUpLeft(); }
        if (dx > 0 && dy < 0) { return this.moveUpRight(); }
        if (dx < 0 && dy > 0) { return this.moveDownLeft(); }
        if (dx > 0 && dy > 0) { return this.moveDownRight(); }
        if (dx < 0) { return this.moveLeft(); }
        if (dx > 0) { return this.moveRight(); }
        if (dy < 0) { return this.moveUp(); }
        if (dy > 0) { return this.moveDown(); }
        return false;
    }

    moveTowards(point) {
        //Change move point
        this.#movePos = point;

        //Set state to moving
        this.setState(AI.MOVE);
    }

    moveTowardsRandom() {
        //Move towards random point
        this.moveTowards(this.character.randomPoint);
    }

    moveLeft() {
        this.character.animate('moveLeft');
        return this.character.moveTo(new Vec2(this.character.pos.x - 1, this.character.pos.y));
    }

    moveRight() {
        this.character.animate('moveRight');
        return this.character.moveTo(new Vec2(this.character.pos.x + 1, this.character.pos.y));
    }

    moveUp() {
        this.character.animate('moveUp');
        return this.character.moveTo(new Vec2(this.character.pos.x, this.character.pos.y - 1));
    }

    moveDown() {
        this.character.animate('moveDown');
        return this.character.moveTo(new Vec2(this.character.pos.x, this.character.pos.y + 1));
    }

    moveDownRight() {
        this.character.animate('moveDownRight');
        return this.character.moveTo(new Vec2(this.character.pos.x + 1, this.character.pos.y + 1));
    }

    moveUpRight() {
        this.character.animate('moveUpRight');
        return this.character.moveTo(new Vec2(this.character.pos.x + 1, this.character.pos.y - 1));
    }

    moveUpLeft() {
        this.character.animate('moveUpLeft');
        return this.character.moveTo(new Vec2(this.character.pos.x - 1, this.character.pos.y - 1));
    }

    moveDownLeft() {
        this.character.animate('moveDownLeft');
        return this.character.moveTo(new Vec2(this.character.pos.x - 1, this.character.pos.y + 1));
    }

    //State
    update() {
        //Run on update for current state
        const onUpdate = this[`onUpdate_${this.state}`];
        if (typeof onUpdate === 'function') { onUpdate.call(this); }
    }

    setState(newState) {
        //Not a valid state
        if (typeof newState !== 'string') { return; }

        //Run on end for old state
        const onEnd = this[`onEnd_${this.state}`];
        if (typeof onEnd === 'function') { onEnd.call(this); }

        //Set state
        this.#state = newState;

        //Run on start for new state
        const onStart = this[`onStart_${this.state}`];
        if (typeof onStart === 'function') { onStart.call(this); }
    }

    //State: IDLE
    onStart_idle() {
        //Animate idle
        this.character.animate('idle');

        //Start timer
        this.timer.count(this.idleDuration);

        //Reset sleeping
        this.#isSleeping = false;
    }

    onUpdate_idle() {
        //Timer didn't finish
        if (!this.timer.finished) { return; }

        //Reset timer
        this.timer.reset();

        //Check action (75% chance to sleep if it can)
        if (this.#canSleep && !this.#isSleeping && Util.randomExclusive(100) < 75) {
            //Animate sleep
            this.character.animate('sleep');

            //Set state to sleep-idle
            this.#isSleeping = true;

            //Start sleep timer
            this.timer.count(this.sleepDuration);
        } else {
            //Move towards a random point
            this.moveTowardsRandom();
        }
    }

    //State: MOVE
    onUpdate_move() {
        //Try to move
        if (this._moveTowardsMovePos()) { return; }

        //Didn't move -> Point reached, animate idle
        this.setState(AI.IDLE);
    }

    //State: SPECIAL
    onStart_special() {
        //Animate special
        this.character.animate('special', true);

        //Start timer to move again
        this.timer.count(this.specialDuration);
    }

    onUpdate_special() {
        //Timer didn't finish
        if (!this.timer.finished) { return; }

        //Reset timer
        this.timer.reset();

        //Move towards a random point
        this.moveTowardsRandom();
    }

}

//Characters
class Character extends GameObject {

    //Object
    get isCharacter() { return true; }

    //AI
    #ai;

    get ai() { return this.#ai; }


    //Constructor
    constructor(config, ai) {
        super(config);

        //Assign AI
        this.#ai = ai;
        ai.assign(this);

        //Respawn character
        this.respawn();
    }

    //Update
    update() {
        //Update AI
        this.ai.update();

        //Update game object
        super.update();
    }

    //Click
    onclick() {
        //Notify AI a click happened
        this.ai.onclick();
    }

}

class PokemonAnimations {

    static get DEFAULT() {
        return {
            'idle': new Animation(
                [[0, 8], [1, 8], [2, 8], [3, 8]],
                5,
                { loop: false }
            ),
            'moveDown': new Animation(
                [[0, 0], [1, 0], [2, 0], [3, 0]],
                3
            ),
            'moveDownRight': new Animation(
                [[0, 1], [1, 1], [2, 1], [3, 1]],
                3
            ),
            'moveRight': new Animation(
                [[0, 2], [1, 2], [2, 2], [3, 2]],
                3
            ),
            'moveUpRight': new Animation(
                [[0, 3], [1, 3], [2, 3], [3, 3]],
                3
            ),
            'moveUp': new Animation(
                [[0, 4], [1, 4], [2, 4], [3, 4]],
                3
            ),
            'moveUpLeft': new Animation(
                [[0, 5], [1, 5], [2, 5], [3, 5]],
                3
            ),
            'moveLeft': new Animation(
                [[0, 6], [1, 6], [2, 6], [3, 6]],
                3
            ),
            'moveDownLeft': new Animation(
                [[0, 7], [1, 7], [2, 7], [3, 7]],
                3
            ),
            'special': new Animation(
                [[0, 9], [1, 9], [2, 9], [3, 9]],
                4,
                { loop: false }
            ),
            'sleep': [
                new Animation(
                    [[0, 11], [1, 11]],
                    30
                ),
                new Animation(
                    [[0, 10], [1, 10], [2, 10], [3, 10]],
                    3,
                    { loop: false }
                )
            ],
        };
    }

}

//AI
class PetMoods {

    //Sprite size
    static size = new Vec2(16);

    //Special moods
    static get HEART() { return new Vec2(2, 1); }
    static get RANDOM() { return PetMoods[PetMoods.#moods[Util.randomExclusive(PetMoods.#moods.length)]]; }

    //Normal moods
    static #moods = ['HAPPY', 'BLUSH', 'ASHAMED', 'CRY', 'MAD', 'IDK', 'PLEDGE', 'GIGACHAD', 'ALIEN', 'DEVIL', 'SILLY', 'MUSIC'];

    static get HAPPY() { return new Vec2(4, 0); }
    static get BLUSH() { return new Vec2(4, 1); }
    static get ASHAMED() { return new Vec2(5, 2); }
    static get CRY() { return new Vec2(4, 2); }
    static get MAD() { return new Vec2(6, 1); }
    static get IDK() { return new Vec2(0, 2); }
    static get PLEDGE() { return new Vec2(5, 1); }
    static get GIGACHAD() { return new Vec2(6, 1); }
    static get ALIEN() { return new Vec2(1, 1); }
    static get DEVIL() { return new Vec2(2, 2); }
    static get SILLY() { return new Vec2(0, 0); }
    static get MUSIC() { return new Vec2(2, 0); }

}

class PetAI extends AI {

    //States
    static get MOVE_BALL() { return 'moveball'; }

    //Moods
    #moodSprite = new Image();
    #moodOffset = new Vec2();
    #moodElevation = 0; //Fine tune offset applied after automatic positioning
    #moodShow = false;
    #moodHideTimeout = new Timeout(() => this.#moodShow = false);
    #moodHeartTimeout = new Timeout(() => this.#setRandomMood());


    //State
    constructor(config) {
        super(config);

        //Check config
        if (typeof config === 'object') {
            //Mood elevation
            if (typeof config.moodElevation === 'number') { this.#moodElevation = config.moodElevation; }
        }

        //Init moods sprite
        this.#moodSprite.src = `${Game.mediaURI}sprites/emotes.png`;

        //Random mood
        this.#setRandomMood();
    }

    //Click
    click() {
        //Has candy?
        if (Game.isAction(Action.CANDY)) {
            //Check candy count
            if (Game.candy <= 0) {
                Game.showMessage('No candy!');
                Game.setAction(Action.NONE);
                const candyBtn = document.getElementById('candyBtn');
                if (candyBtn) { candyBtn.removeAttribute('active'); }
                return;
            }

            //Consume candy
            Game.setAction(Action.NONE);
            const candyBtn = document.getElementById('candyBtn');
            if (candyBtn) { candyBtn.removeAttribute('active'); }

            //Notify extension about candy feeding (for evolution tracking)
            const petIndex = Game.pets.indexOf(this.character);
            if (petIndex >= 0) {
                vscode.postMessage({ type: 'candy_fed', index: petIndex });
            }

            //Set mood to heart
            this.#setHeartMood();
        }

        //Show mood
        this.showMood();

        //Play special animation
        this.setState(AI.SPECIAL);
    }

    //Mood
    #setMood(moodOffset) {
        this.#moodOffset = moodOffset.mult(PetMoods.size);
    }

    #setHeartMood() {
        //Change mood to heart
        this.#setMood(PetMoods.HEART);

        //Clear heart mood timeout & start a new one
        this.#moodHeartTimeout.wait(10 * 60 * 1000); //Heart stays for 10 minutes
    }

    #setRandomMood() {
        //Change mood to a random one
        this.#setMood(PetMoods.RANDOM);
    }

    showMood() {
        //Show mood
        this.#moodShow = true;

        //Clear hide mood timeout & start a new one
        this.#moodHideTimeout.wait(2000);
    }

    drawMood(ctx) {
        //Mood is hidden
        if (!this.#moodShow) { return; }

        //Auto lift mood depending on pokemon sprite size (32px or 48px)
        const moodLift = this.character.size.y >= 48 ? 10 : 12;

        //Draw mood
        ctx.drawImage(
            this.#moodSprite,
            this.#moodOffset.x,
            this.#moodOffset.y, 
            PetMoods.size.x,
            PetMoods.size.y,
            this.character.pos.x + Math.round((this.character.size.x - PetMoods.size.x) / 2),
            this.character.pos.y - moodLift + this.#moodElevation,
            PetMoods.size.x,
            PetMoods.size.y
        );
    }

    //Movement
    moveTowards(point, towardsBall) {
        super.moveTowards(point);

        //Move towards ball
        if (towardsBall) { this.setState(PetAI.MOVE_BALL); }
    }

    //State: MOVING or MOVING_BALL
    onUpdate_moveball() {
        //Try to move
        if (this._moveTowardsMovePos()) { return; }

        //Didn't move -> Point reached, notify game that the ball was reached
        Game.ball.onReached();

        //Set mood to heart & show mood
        this.#setHeartMood();
        this.showMood();

        //Animate special
        this.setState(AI.SPECIAL);
    }

}

//Characters
class PokemonCharacter extends Character {

    // Pet info
    #specie = '';
    #color = 'Color';

    get specie() { return this.#specie; }
    get color() { return this.#color; }

    // Constructor
    constructor(name, specie, color, config = {}, config_ai = {}) {
        // Add name & image to config
        config.name = name;
        const spriteName = typeof config.spriteName === 'string'
            ? config.spriteName
            : specie.toLowerCase().replaceAll(' ', '_');
        const spriteSize = typeof config.spriteSize === 'number' ? config.spriteSize : 32;
        config.image = `pokemons/${spriteName}.png`;
        if (typeof config.size !== 'object') { config.size = new Vec2(spriteSize); }
        if (typeof config.animations !== 'object') { config.animations = PokemonAnimations.DEFAULT; }

        // Create character
        super(config, new PetAI(config_ai));

        // Save pet info
        this.#specie = specie;
        this.#color = color;

        // Move towards random point
        this.ai.moveTowardsRandom();

        // Add to pets list
        Game.pets.push(this);
    }

    remove() {
        super.remove();
        // Remove from pets list
        Game.pets.removeItem(this);
    }

    // Clicks
    mouseUp(pos) {
        // Notify AI pet was clicked
        this.ai.click();
        // Consume event
        return true;
    }

    draw(ctx, options = {}) {
        super.draw(ctx, options);

        if (this.ai && typeof this.ai.drawMood === 'function') {
            this.ai.drawMood(ctx);
        }
    }

    moveTowardsBall(pos) {
        const target = new Vec2(
            Util.clamp(pos.x, 0, this.maxPosX),
            Util.clamp(pos.y, 0, this.maxPosY)
        );
        this.ai.moveTowards(target, true);
    }
}

class Pokemon extends PokemonCharacter {

    #form = '';
    #generation = '';

    get form() { return this.#form; }
    get generation() { return this.#generation; }

    constructor(name, specie, generation, form, sprite, spriteSize = 32) {
        const size = spriteSize === 48 ? 48 : 32;

        const config = {
            spriteName: sprite,
            spriteSize: size,
            size: new Vec2(size),
            animations: PokemonAnimations.DEFAULT,
        };

        super(name, specie, generation, config, {});

        this.#form = form;
        this.#generation = generation;
    }

}