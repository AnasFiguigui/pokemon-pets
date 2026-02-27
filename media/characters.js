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
    click() {}

    //Movement
    _moveTowardsMovePos() {
        //Move position out of bounds -> Create a new one
        if (this.#movePos.x > this.character.maxPosX || this.#movePos.y > this.character.maxPosY) {
            this.moveTowards(this.character.randomPoint);
            return true;
        }

        //Try to move
        if (this.#movePos.x < this.character.pos.x) {
            return this.moveLeft();
        } else if (this.#movePos.x > this.character.pos.x) {
            return this.moveRight();
        } else if (this.#movePos.y < this.character.pos.y) {
            return this.moveUp();
        } else if (this.#movePos.y > this.character.pos.y) {
            return this.moveDown();
        } else {
            return false;
        }
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


 /*$$$$$$             /$$
| $$__  $$           | $$
| $$  \ $$ /$$$$$$  /$$$$$$   /$$$$$$$
| $$$$$$$//$$__  $$|_  $$_/  /$$_____/
| $$____/| $$$$$$$$  | $$   |  $$$$$$
| $$     | $$_____/  | $$ /$$\____  $$
| $$     |  $$$$$$$  |  $$$$//$$$$$$$/
|__/      \_______/   \___/ |______*/

//Animations
class PetAnimations {

    static get CAT() { 
        return {
            'idle': new Animation(
                [[0, 4], [1, 4], [2, 4]],
                5,
                { loop: false }
            ),
            'moveDown': new Animation(
                [[0, 0], [1, 0], [2, 0], [3, 0]],
                5
            ),
            'moveRight': new Animation(
                [[0, 1], [1, 1], [2, 1], [3, 1]],
                5
            ),
            'moveUp': new Animation(
                [[0, 2], [1, 2], [2, 2], [3, 2]],
                5
            ),
            'moveLeft': new Animation(
                [[0, 3], [1, 3], [2, 3], [3, 3]],
                5
            ),
            'special': new Animation(
                [[0, 5], [1, 5], [2, 5], [3, 5], [0, 5], [2, 4]],
                5,
                { loop: false }
            ),
            'sleep': [
                new Animation(
                    [[0, 7], [1, 7]],
                    30
                ),
                new Animation(
                    [[0, 6], [1, 6], [2, 6], [3, 6]],
                    5,
                    { loop: false }
                )
            ],
        };
    }

}

//AI
class PetMoods {

    //Sprite size
    static size = new Vec2(9);

    //Special moods
    static get HEART() { return new Vec2(1, 3); }
    static get RANDOM() { return PetMoods[PetMoods.#moods[Util.randomExclusive(PetMoods.#moods.length)]]; }

    //Normal moods
    static #moods = ['HAPPY', 'BLUSH', 'ASHAMED', 'CRY', 'MAD', 'IDK', 'PLEDGE', 'GIGACHAD', 'ALIEN', 'DEVIL', 'SILLY', 'MUSIC'];

    static get HAPPY() { return new Vec2(0, 0); }
    static get BLUSH() { return new Vec2(8, 0); }
    static get ASHAMED() { return new Vec2(9, 0); }
    static get CRY() { return new Vec2(13, 0); }
    static get MAD() { return new Vec2(2, 1); }
    static get IDK() { return new Vec2(5, 1); }
    static get PLEDGE() { return new Vec2(8, 1); }
    static get GIGACHAD() { return new Vec2(11, 1); }
    static get ALIEN() { return new Vec2(1, 2); }
    static get DEVIL() { return new Vec2(2, 2); }
    static get SILLY() { return new Vec2(13, 1); }
    static get MUSIC() { return new Vec2(6, 3); }

}

class PetAI extends AI {

    //States
    static get MOVE_BALL() { return 'moveball'; }

    //Moods
    #moodSprite = new Image();
    #moodOffset = new Vec2();
    #moodElevation = 0; //Elevation is inverted, positive is down, negative is up
    #moodShow = false;
    #moodHideTimeout = new Timeout(() => this.#moodShow = false);
    #moodHeartTimeout = new Timeout(() => this.#setRandomMood());


    //State
    constructor(config) {
        super(config);

        //Check config
        if (typeof config === 'object') {
            //Mood elevation
            if (typeof config.moodElevation === 'number') { this.#moodElevation = -config.moodElevation; } //Elevation is inverted
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
            //Consume candy
            Game.setAction(Action.NONE);

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

        //Draw mood
        ctx.drawImage(
            this.#moodSprite,
            this.#moodOffset.x,
            this.#moodOffset.y, 
            PetMoods.size.x,
            PetMoods.size.y,
            this.character.pos.x + Math.round((this.character.size.x - PetMoods.size.x) / 2),
            this.character.pos.y + this.#moodElevation,
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
class PetCharacter extends Character {

    // Pet info
    #specie = '';
    #color = 'Color';

    get specie() { return this.#specie; }
    get color() { return this.#color; }

    // Constructor
    constructor(name, specie, color, config = {}, config_ai = {}) {
        // Add name & image to config
        config.name = name;
        config.image = `pokemons/${specie.toLowerCase()}.png`;
            config.size = new Vec2(32);
            // Fallback to PetAnimations.CAT if PokemonAnimations.DEFAULT is missing
            if (typeof PokemonAnimations !== 'undefined' && PokemonAnimations.DEFAULT) {
                config.animations = PokemonAnimations.DEFAULT;
            } else {
                console.warn('PokemonAnimations.DEFAULT not found, using PetAnimations.CAT as fallback.');
                config.animations = PetAnimations.CAT;
            }

        // Create character
        super(config, new PetAI(config_ai));

        // Save pet info
        this.#specie = specie;
        this.#color = color;

        // Move towards random point
        this.ai.moveTowardsRandom();

        // Add to pets list and objects for rendering
        Game.pets.push(this);
        Game.objects.push(this);
    }

    remove() {
        super.remove();
        // Remove from pets list
        Game.pets.removeItem(this);
        // Remove from objects list
        Game.objects.removeItem(this);
    }

    // Clicks
    mouseUp(pos) {
        // Notify AI pet was clicked
        this.ai.click();
        // Consume event
        return true;
    }
}


// Pokemon class
class Pokemon extends PetCharacter {
    #evolution = 0;
    #level = 0;

    get evolution() { return this.#evolution; }
    get level() { return this.#level; }

    constructor(name, specie, evolution = 0, level = 0) {
        // Set up config for PetCharacter
        const config = {
            size: new Vec2(32),
            // Sprite offset for evolution: 192px per evolution stage
            spriteSheetOffset: new Vec2(192 * (evolution || 0), 0)
        };
        // Use PokemonAnimations.DEFAULT if available, fallback to PetAnimations.CAT
        if (typeof PokemonAnimations !== 'undefined' && PokemonAnimations.DEFAULT) {
            config.animations = PokemonAnimations.DEFAULT;
        } else {
            config.animations = PetAnimations.CAT;
        }

        // AI config
        const config_ai = {
            moodElevation: -3
        };

        super(name, specie, 'Color', config, config_ai);
        this.#evolution = evolution;
        this.#level = level;
    }

    // Level up and evolve logic
    giveCandy() {
        this.#level++;
        // Example: evolve every 5 levels, up to 3
        const newEvolution = Math.min(3, Math.floor(this.#level / 5));
        if (newEvolution !== this.#evolution) {
            this.#evolution = newEvolution;
            this.updateSpriteSheetOffset();
        }
    }

    updateSpriteSheetOffset() {
        // Update sprite offset for evolution
        this.spriteSheetOffset = new Vec2(192 * this.#evolution, 0);
    }

    // Draw overlay with level and evolution
    drawOverlay(ctx) {
        ctx.save();
        ctx.font = 'bold 12px Arial';
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        const x = this.pos.x + this.size.x / 2;
        const y = this.pos.y - 8;
        ctx.strokeText(`Lv.${this.#level} Evo:${this.#evolution}`, x, y);
        ctx.fillText(`Lv.${this.#level} Evo:${this.#evolution}`, x, y);
        ctx.restore();
    }
}

// Make Pokemon globally available
window.Pokemon = Pokemon;


 /*$$$$$$$                                   /$$
| $$_____/                                  |__/
| $$       /$$$$$$$   /$$$$$$  /$$$$$$/$$$$  /$$  /$$$$$$   /$$$$$$$
| $$$$$   | $$__  $$ /$$__  $$| $$_  $$_  $$| $$ /$$__  $$ /$$_____/
| $$__/   | $$  \ $$| $$$$$$$$| $$ \ $$ \ $$| $$| $$$$$$$$|  $$$$$$
| $$      | $$  | $$| $$_____/| $$ | $$ | $$| $$| $$_____/ \____  $$
| $$$$$$$$| $$  | $$|  $$$$$$$| $$ | $$ | $$| $$|  $$$$$$$ /$$$$$$$/
|________/|__/  |__/ \_______/|__/ |__/ |__/|__/ \_______/|______*/

//Animations
class MonsterAnimations {

    static get SLIME() { 
        return {
            'idle': new Animation(
                [[0, 0]],
                4,
                { loop: false },
            ),
            'moveDown': new Animation(
                [[0, 0], [1, 0], [2, 0], [3, 0]],
                4,
            ),
            'moveRight': new Animation(
                [[0, 1], [1, 1], [2, 1], [3, 1]],
                4,
            ),
            'moveLeft': new Animation(
                [[0, 2], [1, 2], [2, 2], [3, 2]],
                4,
            ),
            'moveUp': new Animation(
                [[0, 3], [1, 3], [2, 3], [3, 3]],
                4,
            ),
            'special': new Animation(
                [[0, 4], [1, 4], [2, 4]],
                4,
                { loop: false },
            ),
        } 
    };
}

//AI
class MonsterAI extends AI {

    //State
    constructor(config) { 
        //Fix config & disable sleep
        if (typeof config !== 'object') { config = {}; }
        config.canSleep = false;
        
        //Base AI
        super(config); 
    }

    //Click
    click() {
        //Alredy clicked
        if (this.state === AI.SPECIAL) { return; }

        //Give money to player
        Game.addMoney(60 + 5 * Util.randomInclusive(8)); //60 - 100 gold

        //Wait to spawn a new monster
        Game.monsterSpawner.wait(30 * 1000);

        //Play special animation
        this.setState(AI.SPECIAL);
    }

    //State: SPECIAL
    onEnd_special() {
        //Remove monster from game
        this.character.remove();
    }

}

//Characters
class MonsterCharacter extends Character {

    //Monster info
    #specie = '';
    #color = 'Color';

    get specie() { return this.#specie; }
    get color() { return this.#color; }


    //Constructor
    constructor(specie, color, config = {}, config_ai = {}) {
        //Add name & image to config
        config.name = Util.titleCase(specie);
        config.image = `monsters/${specie.toLowerCase()}.png`;
        
        //Create character
        super(config, new MonsterAI(config_ai));

        //Save info
        this.#specie = specie;
        this.#color = color;

        //Move towards random point
        this.ai.moveTowardsRandom();
        
        //Add to monsters list
        Game.monsters.push(this);
    }

    remove() {
        super.remove();

        //Remove from monsters list
        Game.monsters.removeItem(this);
    }

    //Clicks
    mouseUp(pos) {
        //Notify AI emeny was clicked
        this.ai.click();

        //Consume event
        return true;
    }

}

//Slime
class Slime extends MonsterCharacter {

    constructor(color) {
        //Default config
        const config = {
            size: new Vec2(16, 24),
            animations: MonsterAnimations.SLIME
        };

        //Color sprite sheet offset
        switch (color.toLowerCase()) {
            default:
            case 'iron':
                config.spriteSheetOffset = new Vec2();
                break;
            case 'tiger':
                config.spriteSheetOffset = new Vec2(64, 0);
                break;
        }

        //Create pet
        super('slime', color, config, {
            specialDuration: 0.4 * Game.fps
        });
    }

}