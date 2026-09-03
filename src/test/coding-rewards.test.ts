import { describe, it, expect, beforeEach } from 'vitest';
import { CodingRewardsTracker, type CodingRewardsConfig } from '../coding-rewards';

function defaultConfig(overrides?: Partial<CodingRewardsConfig>): CodingRewardsConfig {
    return {
        enabled: true,
        saveGold: 2,
        savesPerFriendship: 10,
        saveCooldownSeconds: 120,
        commitGold: 100,
        pushGold: 200,
        pushCandy: 1,
        pushFriendship: 5,
        ...overrides,
    };
}

describe('CodingRewardsTracker', () => {
    let tracker: CodingRewardsTracker;

    beforeEach(() => {
        tracker = new CodingRewardsTracker();
    });

    // ── File Save Rewards ───────────────────────────────────────────────

    describe('onFileSave', () => {
        it('returns gold on save', () => {
            const reward = tracker.onFileSave('file:///a.ts', 2, defaultConfig());
            expect(reward).toBeDefined();
            expect(reward?.gold).toBe(2);
            expect(reward?.candyPetIndex).toBe(-1);
        });

        it('returns undefined when disabled', () => {
            const reward = tracker.onFileSave('file:///a.ts', 2, defaultConfig({ enabled: false }));
            expect(reward).toBeUndefined();
        });

        it('returns undefined when no pets', () => {
            const reward = tracker.onFileSave('file:///a.ts', 0, defaultConfig());
            expect(reward).toBeUndefined();
        });

        it('respects per-file cooldown', () => {
            const cfg = defaultConfig({ saveCooldownSeconds: 9999 });
            const r1 = tracker.onFileSave('file:///a.ts', 2, cfg);
            expect(r1).toBeDefined();

            // Same file within cooldown → ignored
            const r2 = tracker.onFileSave('file:///a.ts', 2, cfg);
            expect(r2).toBeUndefined();

            // Different file → rewarded
            const r3 = tracker.onFileSave('file:///b.ts', 2, cfg);
            expect(r3).toBeDefined();
        });

        it('grants friendship every N saves', () => {
            const cfg = defaultConfig({ savesPerFriendship: 3 });
            let friendshipGranted = false;

            for (let i = 0; i < 3; i++) {
                const reward = tracker.onFileSave(`file:///f${i}.ts`, 4, cfg);
                if (reward && reward.friendship.size > 0) {
                    friendshipGranted = true;
                }
            }

            expect(friendshipGranted).toBe(true);
        });

        it('does not grant friendship before threshold', () => {
            const cfg = defaultConfig({ savesPerFriendship: 10 });

            for (let i = 0; i < 9; i++) {
                const reward = tracker.onFileSave(`file:///f${i}.ts`, 4, cfg);
                expect(reward?.friendship.size).toBe(0);
            }
        });

        it('uses custom saveGold value', () => {
            const reward = tracker.onFileSave('file:///a.ts', 1, defaultConfig({ saveGold: 50 }));
            expect(reward?.gold).toBe(50);
        });
    });

    // ── Git Commit Rewards ──────────────────────────────────────────────

    describe('onGitCommit', () => {
        it('returns gold only (no friendship, no candy)', () => {
            const reward = tracker.onGitCommit(3, defaultConfig());
            expect(reward).toBeDefined();
            expect(reward?.gold).toBe(100);
            expect(reward?.friendship.size).toBe(0);
            expect(reward?.candyPetIndex).toBe(-1);
        });

        it('returns undefined when disabled', () => {
            expect(tracker.onGitCommit(3, defaultConfig({ enabled: false }))).toBeUndefined();
        });

        it('returns undefined when no pets', () => {
            expect(tracker.onGitCommit(0, defaultConfig())).toBeUndefined();
        });

        it('returns undefined when commitGold is 0', () => {
            expect(tracker.onGitCommit(3, defaultConfig({ commitGold: 0 }))).toBeUndefined();
        });

        it('uses custom commitGold value', () => {
            expect(tracker.onGitCommit(1, defaultConfig({ commitGold: 250 }))?.gold).toBe(250);
        });
    });

    // ── Git Push Rewards ────────────────────────────────────────────────

    describe('onGitPush', () => {
        it('returns gold, friendship for all pets, and candy for one', () => {
            const reward = tracker.onGitPush(3, defaultConfig());
            expect(reward).toBeDefined();
            expect(reward?.gold).toBe(200);
            expect(reward?.friendship.size).toBe(3);
            for (const [, amount] of reward!.friendship) {
                expect(amount).toBe(5);
            }
            expect(reward?.candyPetIndex).toBeGreaterThanOrEqual(0);
            expect(reward?.candyPetIndex).toBeLessThan(3);
        });

        it('returns undefined when disabled', () => {
            const reward = tracker.onGitPush(3, defaultConfig({ enabled: false }));
            expect(reward).toBeUndefined();
        });

        it('returns undefined when no pets', () => {
            const reward = tracker.onGitPush(0, defaultConfig());
            expect(reward).toBeUndefined();
        });

        it('skips candy when pushCandy is 0', () => {
            const reward = tracker.onGitPush(3, defaultConfig({ pushCandy: 0 }));
            expect(reward?.candyPetIndex).toBe(-1);
        });

        it('skips friendship when pushFriendship is 0', () => {
            const reward = tracker.onGitPush(3, defaultConfig({ pushFriendship: 0 }));
            expect(reward?.friendship.size).toBe(0);
        });

        it('uses custom pushGold value', () => {
            const reward = tracker.onGitPush(1, defaultConfig({ pushGold: 500 }));
            expect(reward?.gold).toBe(500);
        });
    });
});
