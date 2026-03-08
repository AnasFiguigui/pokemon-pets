import { describe, it, expect, beforeEach } from 'vitest';
import { StreakService } from '../streak';
import type { SaveManager } from '../save-manager';
import { Save } from '../models';

/** Creates a minimal SaveManager stub for testing. */
function makeSaveManager(): SaveManager {
    const save = new Save();
    return {
        save,
        saveGame: () => {},
        scheduleSave: () => {},
        flushSave: () => {},
    } as unknown as SaveManager;
}

describe('StreakService', () => {
    let sm: SaveManager;
    let service: StreakService;

    beforeEach(() => {
        sm = makeSaveManager();
        service = new StreakService(sm);
    });

    // ── today ───────────────────────────────────────────────────────────

    describe('today', () => {
        it('returns YYYY-MM-DD format', () => {
            const result = StreakService.today(new Date('2025-03-15T10:30:00Z'));
            expect(result).toBe('2025-03-15');
        });
    });

    // ── claimDaily ──────────────────────────────────────────────────────

    describe('claimDaily', () => {
        it('returns a reward on first claim', () => {
            const reward = service.claimDaily('2025-06-01');

            expect(reward).toBeDefined();
            expect(reward?.gold).toBe(50); // Base reward for streak day 1
            expect(reward?.message).toContain('+50G');
        });

        it('sets streak to 1 on first claim', () => {
            service.claimDaily('2025-06-01');

            const data = service.getData();
            expect(data.currentStreak).toBe(1);
            expect(data.lastClaimDate).toBe('2025-06-01');
            expect(data.longestStreak).toBe(1);
            expect(data.totalRewardsClaimed).toBe(1);
        });

        it('returns undefined when claiming same day twice', () => {
            service.claimDaily('2025-06-01');
            const second = service.claimDaily('2025-06-01');

            expect(second).toBeUndefined();
        });

        it('continues streak for consecutive days', () => {
            service.claimDaily('2025-06-01');
            const day2 = service.claimDaily('2025-06-02');

            expect(day2).toBeDefined();
            expect(day2?.gold).toBe(75); // 50 + (2-1)*25

            const data = service.getData();
            expect(data.currentStreak).toBe(2);
            expect(data.longestStreak).toBe(2);
        });

        it('resets streak after a gap of more than one day', () => {
            service.claimDaily('2025-06-01');
            service.claimDaily('2025-06-02');
            const day4 = service.claimDaily('2025-06-04'); // Skipped June 3

            expect(day4).toBeDefined();
            expect(day4?.gold).toBe(50); // Reset to day 1

            const data = service.getData();
            expect(data.currentStreak).toBe(1);
            expect(data.longestStreak).toBe(2); // Previous best preserved
        });

        it('caps reward at 500G', () => {
            // Build up to a 20-day streak: 50 + (20-1)*25 = 525, capped to 500
            let dateStr = '2025-06-01';
            for (let i = 0; i < 19; i++) {
                service.claimDaily(dateStr);
                const d = new Date(dateStr + 'T12:00:00');
                d.setDate(d.getDate() + 1);
                dateStr = d.toISOString().slice(0, 10);
            }
            const reward = service.claimDaily(dateStr);

            expect(reward).toBeDefined();
            expect(reward?.gold).toBe(500);
        });

        it('tracks total rewards claimed', () => {
            service.claimDaily('2025-06-01');
            service.claimDaily('2025-06-02');
            service.claimDaily('2025-06-03');

            expect(service.getData().totalRewardsClaimed).toBe(3);
        });

        it('message changes based on streak length', () => {
            // Day 1: "Welcome back"
            const day1 = service.claimDaily('2025-06-01');
            expect(day1?.message).toContain('Welcome back');

            // Day 2-6: lightning emoji
            const day2 = service.claimDaily('2025-06-02');
            expect(day2?.message).toContain('⚡');

            // Build to day 7: fire emoji
            service.claimDaily('2025-06-03');
            service.claimDaily('2025-06-04');
            service.claimDaily('2025-06-05');
            service.claimDaily('2025-06-06');
            const day7 = service.claimDaily('2025-06-07');
            expect(day7?.message).toContain('🔥');
            expect(day7?.message).toContain('Keep it up');
        });
    });
});
