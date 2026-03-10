class WildPokemonAnimations {

    static frames(row) {
        return [[0, row], [1, row], [2, row], [3, row]];
    }

    static get DEFAULT() { 
        return {
            'idle': new Animation(
                WildPokemonAnimations.frames(8),
                4,
                { loop: true },
            ),
            'moveDown': new Animation(
                WildPokemonAnimations.frames(0),
                4,
            ),
            'moveDownRight': new Animation(
                WildPokemonAnimations.frames(1),
                4,
            ),
            'moveRight': new Animation(
                WildPokemonAnimations.frames(2),
                4,
            ),
            'moveUpRight': new Animation(
                WildPokemonAnimations.frames(3),
                4,
            ),
            'moveUp': new Animation(
                WildPokemonAnimations.frames(4),
                4,
            ),
            'moveUpLeft': new Animation(
                WildPokemonAnimations.frames(5),
                4,
            ),
            'moveLeft': new Animation(
                WildPokemonAnimations.frames(6),
                4,
            ),
            'moveDownLeft': new Animation(
                WildPokemonAnimations.frames(7),
                4,
            ),
            'special': new Animation(
                WildPokemonAnimations.frames(9),
                4,
                { loop: false },
            ),
            'sleep': [
                new Animation(
                    [[0, 11], [1, 11]],
                    30,
                ),
                new Animation(
                    [[0, 10], [1, 10], [2, 10], [3, 10]],
                    3,
                    { loop: false },
                ),
            ],
        }; 
    }
}
//AI
class WildPokemonAI extends AI {

    //State
    constructor(config) { 
        //Fix config
        if (typeof config !== 'object') { config = {}; }
        
        //Base AI
        super(config); 
    }

    //Click
    click() {
        //Already clicked
        if (this.state === AI.SPECIAL) { return; }

        //Notify extension about the catch (backend computes reward)
        vscode.postMessage({ type: 'wild_pokemon_caught' });

        //Wait to spawn a new wild pokemon
        Game.wildPokemonSpawner.wait(30 * 1000);

        //Play special animation
        this.setState(AI.SPECIAL);
    }

    //State: SPECIAL
    onEnd_special() {
        //Remove wild pokemon from game
        this.character.remove();
    }

}

//Characters
class WildPokemonCharacter extends Character {

    //Wild pokemon info
    #specie = '';

    get specie() { return this.#specie; }


    //Constructor
    constructor(specie, config = {}, config_ai = {}) {
        //Add name & image to config
        config.name = Util.titleCase(specie);
        config.image = `wild-pokemons/${specie.toLowerCase()}.png`;
        if (typeof config.size !== 'object') { config.size = new Vec2(32); }
        if (typeof config.animations !== 'object') { config.animations = WildPokemonAnimations.DEFAULT; }
        
        //Create character
        super(config, new WildPokemonAI(config_ai));

        //Save info
        this.#specie = specie;

        //Move towards random point
        this.ai.moveTowardsRandom();
        
        //Add to wild pokemons list
        Game.wildPokemons.push(this);
    }

    remove() {
        super.remove();

        //Remove from wild pokemons list
        Game.wildPokemons.removeItem(this);
    }

    //Clicks
    mouseUp(pos) {
        //Notify AI emeny was clicked
        this.ai.click();

        //Consume event
        return true;
    }

}

class WildPokemon extends WildPokemonCharacter {

    constructor(specie) {
        super(specie, {}, {
            specialDuration: 0.4 * Game.fps
        });
    }

}