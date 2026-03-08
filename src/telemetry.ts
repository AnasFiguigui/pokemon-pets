import type { TelemetryData } from './models';
import type { SaveManager } from './save-manager';

/**
 * Opt-in telemetry tracker.
 * All data stays local in the save file — nothing is sent externally.
 * Provides insight into which Pokémon / features are most used.
 */
export class TelemetryService {
    private enabled: boolean;
    private readonly saveManager: SaveManager;

    constructor(saveManager: SaveManager, enabled: boolean) {
        this.saveManager = saveManager;
        this.enabled = enabled;
    }

    /** Returns the current telemetry snapshot (read-only copy). */
    public getData(): TelemetryData {
        return { ...this.saveManager.save.telemetry };
    }

    /** Update the opt-in flag at runtime (e.g. when settings change). */
    public setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    public isEnabled(): boolean {
        return this.enabled;
    }

    // ── Tracking helpers ────────────────────────────────────────────────

    public trackPokemonAdded(specie: string): void {
        if (!this.enabled) { return; }
        const t = this.saveManager.save.telemetry;
        t.pokemonAdded[specie] = (t.pokemonAdded[specie] ?? 0) + 1;
        this.saveManager.saveGame();
    }

    public trackPokemonEvolved(specie: string): void {
        if (!this.enabled) { return; }
        const t = this.saveManager.save.telemetry;
        t.pokemonEvolved[specie] = (t.pokemonEvolved[specie] ?? 0) + 1;
        this.saveManager.saveGame();
    }

    public trackCandyFed(): void {
        if (!this.enabled) { return; }
        this.saveManager.save.telemetry.candyFed++;
        this.saveManager.saveGame();
    }

    public trackWildPokemonCaught(): void {
        if (!this.enabled) { return; }
        this.saveManager.save.telemetry.wildPokemonCaught++;
        this.saveManager.saveGame();
    }

    public trackDecorationPlaced(): void {
        if (!this.enabled) { return; }
        this.saveManager.save.telemetry.decorationsPlaced++;
        this.saveManager.saveGame();
    }

    public trackGoldEarned(amount: number): void {
        if (!this.enabled) { return; }
        this.saveManager.save.telemetry.goldEarned += amount;
        this.saveManager.saveGame();
    }

    public trackGoldSpent(amount: number): void {
        if (!this.enabled) { return; }
        this.saveManager.save.telemetry.goldSpent += amount;
        this.saveManager.saveGame();
    }

    public trackSession(): void {
        if (!this.enabled) { return; }
        const t = this.saveManager.save.telemetry;
        t.sessionsCount++;
        t.lastSessionDate = new Date().toISOString().slice(0, 10);
        this.saveManager.saveGame();
    }

    /** Returns a human-readable summary string for the stats command. */
    public getSummary(): string {
        const t = this.saveManager.save.telemetry;
        const topPokemon = Object.entries(t.pokemonAdded)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => `${name} (${count})`)
            .join(', ') || 'None yet';

        return [
            `📊 Pokemon Pets — Local Stats`,
            ``,
            `Sessions: ${t.sessionsCount}`,
            `Pokémon added: ${Object.values(t.pokemonAdded).reduce((a, b) => a + b, 0)}`,
            `Pokémon evolved: ${Object.values(t.pokemonEvolved).reduce((a, b) => a + b, 0)}`,
            `Candy fed: ${t.candyFed}`,
            `Wild Pokémon caught: ${t.wildPokemonCaught}`,
            `Decorations placed: ${t.decorationsPlaced}`,
            `Gold earned: ${t.goldEarned}G`,
            `Gold spent: ${t.goldSpent}G`,
            `Most popular: ${topPokemon}`,
        ].join('\n');
    }
}
