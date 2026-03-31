export interface CodingRewardsConfig {
    enabled: boolean;
    saveGold: number;
    savesPerFriendship: number;
    saveCooldownSeconds: number;
    pushGold: number;
    pushCandy: number;
    pushFriendship: number;
}

export interface RewardEvent {
    gold: number;
    /** Pet index → friendship gained. */
    friendship: Map<number, number>;
    /** Pet index that should receive a candy, or -1 if none. */
    candyPetIndex: number;
}

/**
 * Tracks file-save events and calculates rewards.
 * Manages per-file cooldowns to prevent abuse.
 */
export class CodingRewardsTracker {
    /** file path → last rewarded timestamp (ms). */
    private readonly cooldowns = new Map<string, number>();
    /** Running count of rewarded saves (for friendship threshold). */
    private saveCount = 0;

    /** Process a file-save event. Returns a reward, or undefined if on cooldown / disabled. */
    public onFileSave(filePath: string, petCount: number, config: CodingRewardsConfig): RewardEvent | undefined {
        if (!config.enabled || petCount === 0) { return undefined; }

        const now = Date.now();
        const cooldownMs = config.saveCooldownSeconds * 1000;
        const lastTime = this.cooldowns.get(filePath);
        if (lastTime !== undefined && (now - lastTime) < cooldownMs) {
            return undefined; // still on cooldown for this file
        }
        this.cooldowns.set(filePath, now);

        // Prune old cooldown entries every 50 saves to avoid unbounded growth
        if (this.cooldowns.size > 200) {
            for (const [path, ts] of this.cooldowns) {
                if ((now - ts) >= cooldownMs) { this.cooldowns.delete(path); }
            }
        }

        this.saveCount++;

        const gold = config.saveGold;
        const friendship = new Map<number, number>();

        // Every N saves, +1 friendship to a random pet
        if (config.savesPerFriendship > 0 && (this.saveCount % config.savesPerFriendship) === 0) {
            const idx = Math.floor(Math.random() * petCount);
            friendship.set(idx, 1);
        }

        return { gold, friendship, candyPetIndex: -1 };
    }

    /** Process a git-push event. Returns a reward, or undefined if disabled. */
    public onGitPush(petCount: number, config: CodingRewardsConfig): RewardEvent | undefined {
        if (!config.enabled || petCount === 0) { return undefined; }

        const friendship = new Map<number, number>();
        if (config.pushFriendship > 0) {
            for (let i = 0; i < petCount; i++) {
                friendship.set(i, config.pushFriendship);
            }
        }

        const candyPetIndex = config.pushCandy > 0 && petCount > 0
            ? Math.floor(Math.random() * petCount)
            : -1;

        return { gold: config.pushGold, friendship, candyPetIndex };
    }
}
