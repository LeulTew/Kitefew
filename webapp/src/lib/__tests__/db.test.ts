import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock IndexedDB for Dexie
import 'fake-indexeddb/auto';

// Mock idb-keyval
vi.mock('idb-keyval', () => ({
    get: vi.fn().mockResolvedValue(undefined),
    set: vi.fn().mockResolvedValue(undefined),
    del: vi.fn().mockResolvedValue(undefined)
}));

import {
    Persistence,
    saveLeaderboardEntry,
    getPlayerBest,
    clearLocalLeaderboard,
    db
} from '../db';

describe('Storage Layer (db.ts)', () => {
    beforeEach(async () => {
        // Clear all tables before each test
        await db.leaderboard.clear();
        await db.settings.clear();
        localStorage.clear();
    });

    describe('Persistence API', () => {
        it('should save and load settings correctly', async () => {
            await Persistence.save('testKey', 'testValue');
            const result = await Persistence.load('testKey');
            expect(result).toBe('testValue');
        });

        it('should save and load complex objects', async () => {
            const obj = { name: 'test', score: 100, nested: { a: 1 } };
            await Persistence.save('complexKey', obj);
            const result = await Persistence.load('complexKey');
            expect(result).toEqual(obj);
        });

        it('should return undefined for non-existent keys', async () => {
            const result = await Persistence.load('nonExistent');
            expect(result).toBeUndefined();
        });

        it('should backup to localStorage', async () => {
            await Persistence.save('backupTest', 'value123');
            const lsVal = localStorage.getItem('backupTest');
            expect(lsVal).toBe('"value123"');
        });
    });

    describe('Leaderboard Score Comparisons', () => {
        it('should save first score', async () => {
            await saveLeaderboardEntry('PLAYER1', 100, 'snapshot1');
            const best = await getPlayerBest('PLAYER1');
            expect(best?.score).toBe(100);
        });

        it('should update score when higher', async () => {
            await saveLeaderboardEntry('PLAYER1', 100);
            await saveLeaderboardEntry('PLAYER1', 150);
            const best = await getPlayerBest('PLAYER1');
            expect(best?.score).toBe(150);
        });

        it('should NOT update score when lower', async () => {
            await saveLeaderboardEntry('PLAYER1', 100);
            await saveLeaderboardEntry('PLAYER1', 50);
            const best = await getPlayerBest('PLAYER1');
            expect(best?.score).toBe(100);
        });

        it('should NOT update score when equal', async () => {
            await saveLeaderboardEntry('PLAYER1', 100, 'original-snapshot');
            await saveLeaderboardEntry('PLAYER1', 100, 'new-snapshot');
            const best = await getPlayerBest('PLAYER1');
            expect(best?.score).toBe(100);
            // Original snapshot should be preserved
            expect(best?.snapshot).toBe('original-snapshot');
        });

        it('should handle repeated lower scores (simulating try again)', async () => {
            await saveLeaderboardEntry('PLAYER1', 100);
            // Simulate multiple "try again" with lower scores
            await saveLeaderboardEntry('PLAYER1', 30);
            await saveLeaderboardEntry('PLAYER1', 50);
            await saveLeaderboardEntry('PLAYER1', 20);
            const best = await getPlayerBest('PLAYER1');
            expect(best?.score).toBe(100); // Original high should be preserved
        });

        it('should handle different players independently', async () => {
            await saveLeaderboardEntry('PLAYER1', 100);
            await saveLeaderboardEntry('PLAYER2', 200);
            await saveLeaderboardEntry('PLAYER1', 50); // Lower, should not update

            const best1 = await getPlayerBest('PLAYER1');
            const best2 = await getPlayerBest('PLAYER2');

            expect(best1?.score).toBe(100);
            expect(best2?.score).toBe(200);
        });

        it('should be case-insensitive for player names', async () => {
            await saveLeaderboardEntry('Player1', 100);
            await saveLeaderboardEntry('PLAYER1', 150); // Higher
            await saveLeaderboardEntry('player1', 50);  // Lower

            const best = await getPlayerBest('pLaYeR1');
            expect(best?.score).toBe(150);
        });
    });

    describe('Clear Local Leaderboard', () => {
        it('should clear all local scores', async () => {
            await saveLeaderboardEntry('PLAYER1', 100);
            await saveLeaderboardEntry('PLAYER2', 200);
            await Persistence.save('highScore', 200);

            await clearLocalLeaderboard();

            const best1 = await getPlayerBest('PLAYER1');
            const best2 = await getPlayerBest('PLAYER2');
            const highScore = await Persistence.load('highScore');

            expect(best1).toBeUndefined();
            expect(best2).toBeUndefined();
            expect(highScore).toBeUndefined();
        });

        it('should clear localStorage as well', async () => {
            localStorage.setItem('leaderboard', '[{"name":"TEST","score":100}]');
            localStorage.setItem('highScore', '100');

            await clearLocalLeaderboard();

            expect(localStorage.getItem('leaderboard')).toBeNull();
            expect(localStorage.getItem('highScore')).toBeNull();
        });

        it('should allow new high score after clearing', async () => {
            // Set initial high score
            await saveLeaderboardEntry('PLAYER1', 100);
            await Persistence.save('highScore', 100);

            // Clear
            await clearLocalLeaderboard();

            // New score should be saved (even if lower than old)
            await saveLeaderboardEntry('PLAYER1', 50);
            await Persistence.save('highScore', 50);

            const best = await getPlayerBest('PLAYER1');
            const highScore = await Persistence.load('highScore');

            expect(best?.score).toBe(50);
            expect(highScore).toBe(50);
        });
    });

    describe('Leaderboard Array Operations', () => {
        it('should load leaderboard array via Persistence', async () => {
            await saveLeaderboardEntry('A', 100);
            await saveLeaderboardEntry('B', 200);
            await saveLeaderboardEntry('C', 150);

            const list = await Persistence.load('leaderboard') as Array<{ name: string; score: number }>;

            expect(list).toHaveLength(3);
            // Should be sorted by score descending
            expect(list[0].name).toBe('B');
            expect(list[0].score).toBe(200);
            expect(list[1].name).toBe('C');
            expect(list[2].name).toBe('A');
        });

        it('should limit to 50 entries', async () => {
            // Add 60 entries
            for (let i = 0; i < 60; i++) {
                await saveLeaderboardEntry(`PLAYER${i}`, i * 10);
            }

            const list = await Persistence.load('leaderboard') as Array<{ score: number }>;
            expect(list.length).toBeLessThanOrEqual(50);
            // Highest scores should be kept
            expect(list[0].score).toBe(590);
        });
    });
});
