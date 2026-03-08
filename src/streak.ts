import type { StreakData } from './models';
import type { SaveManager } from './save-manager';

export interface StreakReward {
    gold: number;
    message: string;
}

/**
 * Tracks daily coding streak and computes rewards.
 * A "day" is defined by the local YYYY-MM-DD date.
 */
export class StreakService {
    private readonly saveManager: SaveManager;

    constructor(saveManager: SaveManager) {
        this.saveManager = saveManager;
    }

    /** Returns today's date as YYYY-MM-DD. */
    public static today(date: Date = new Date()): string {
        return date.toISOString().slice(0, 10);
    }

    /** Returns the streak data (read-only copy). */
    public getData(): StreakData {
        return { ...this.saveManager.save.streak };
    }

    /**
     * Called once when the extension activates.
     * If the user hasn't claimed today, it updates the streak and returns a reward.
     * Returns undefined if already claimed today.
     */
    public claimDaily(today: string = StreakService.today()): StreakReward | undefined {
        const streak = this.saveManager.save.streak;

        // Already claimed today
        if (streak.lastClaimDate === today) {
            return undefined;
        }

        // Check if the last claim was yesterday (streak continues) or older (streak resets)
        const yesterday = this.getYesterday(today);
        if (streak.lastClaimDate === yesterday) {
            streak.currentStreak++;
        } else {
            streak.currentStreak = 1;
        }

        // Update longest streak
        if (streak.currentStreak > streak.longestStreak) {
            streak.longestStreak = streak.currentStreak;
        }

        streak.lastClaimDate = today;
        streak.totalRewardsClaimed++;
        this.saveManager.saveGame();

        return this.computeReward(streak.currentStreak);
    }

    /** Computes the gold reward based on streak length. */
    private computeReward(streakDays: number): StreakReward {
        // Base: 50G, +25G per streak day, capped at 500G
        const gold = Math.min(50 + (streakDays - 1) * 25, 500);

        let message: string;
        if (streakDays >= 30) {
            message = `🔥 ${streakDays}-day streak! Legendary coder! +${gold}G`;
        } else if (streakDays >= 7) {
            message = `🔥 ${streakDays}-day streak! Keep it up! +${gold}G`;
        } else if (streakDays > 1) {
            message = `⚡ ${streakDays}-day streak! +${gold}G`;
        } else {
            message = `Welcome back! +${gold}G`;
        }

        return { gold, message };
    }

    /** Returns the YYYY-MM-DD string for the day before the given date string. */
    private getYesterday(dateStr: string): string {
        const d = new Date(dateStr + 'T12:00:00');
        d.setDate(d.getDate() - 1);
        return d.toISOString().slice(0, 10);
    }
}
