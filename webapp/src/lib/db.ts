import Dexie, { type EntityTable } from 'dexie';

// --- Types ---
export interface LeaderboardEntry {
    id?: number;
    name: string;
    score: number;
    snapshot?: string;
    lastSyncedScore?: number;
    createdAt?: Date;
}

export interface SettingsEntry {
    key: string;
    value: unknown;
}

// --- Database ---
class GameDatabase extends Dexie {
    leaderboard!: EntityTable<LeaderboardEntry, 'id'>;
    settings!: EntityTable<SettingsEntry, 'key'>;

    constructor() {
        super('BoldSliceDB');
        this.version(1).stores({
            leaderboard: '++id, name, score',
            settings: 'key'
        });
    }
}

export const db = new GameDatabase();

// --- Persistence API (drop-in replacement for old idb-keyval based helper) ---

/**
 * Drop-in replacement for the old Persistence helper
 * Uses Dexie for all storage with localStorage backup
 */
export const Persistence = {
    async save(key: string, value: unknown): Promise<void> {
        // Handle leaderboard specially - store in table
        if (key === 'leaderboard' && Array.isArray(value)) {
            await saveLeaderboardArray(value as LeaderboardEntry[]);
        } else {
            // Regular settings go to settings table
            try {
                await db.settings.put({ key, value });
            } catch (e) {
                console.warn('Dexie save failed', e);
            }
        }

        // Also backup to localStorage
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch { /* quota exceeded or unavailable */ }
    },

    async load(key: string): Promise<unknown> {
        // Handle leaderboard specially - load from table
        if (key === 'leaderboard') {
            return loadLeaderboardArray();
        }

        // Try Dexie first
        try {
            const entry = await db.settings.get(key);
            if (entry !== undefined) {
                return entry.value;
            }
        } catch { /* silent */ }

        // Fallback to localStorage
        try {
            const lsVal = localStorage.getItem(key);
            if (lsVal !== null) {
                const parsed = JSON.parse(lsVal);
                // Heal: save to Dexie for next time
                db.settings.put({ key, value: parsed }).catch(() => { });
                return parsed;
            }
        } catch { /* parse error */ }

        // Final fallback: try idb-keyval (migration)
        try {
            const { get } = await import('idb-keyval');
            const oldVal = await get(key);
            if (oldVal !== undefined) {
                // Migrate to Dexie
                db.settings.put({ key, value: oldVal }).catch(() => { });
                return oldVal;
            }
        } catch { /* idb-keyval not available or failed */ }

        return undefined;
    }
};

// --- Leaderboard Table Operations ---

async function saveLeaderboardArray(entries: LeaderboardEntry[]): Promise<void> {
    try {
        // Clear and replace entire leaderboard
        await db.transaction('rw', db.leaderboard, async () => {
            await db.leaderboard.clear();
            for (const entry of entries) {
                if (entry.name && typeof entry.score === 'number') {
                    await db.leaderboard.add({
                        name: entry.name,
                        score: entry.score,
                        snapshot: entry.snapshot,
                        lastSyncedScore: entry.lastSyncedScore,
                        createdAt: new Date()
                    });
                }
            }
        });
    } catch (e) {
        console.warn('Leaderboard save failed', e);
    }
}

async function loadLeaderboardArray(): Promise<LeaderboardEntry[]> {
    try {
        const entries = await db.leaderboard.orderBy('score').reverse().toArray();
        if (entries.length > 0) {
            // Return in the format expected by GameCanvas
            return entries.map(e => ({
                name: e.name,
                score: e.score,
                snapshot: e.snapshot,
                lastSyncedScore: e.lastSyncedScore
            }));
        }
    } catch { /* Dexie failed */ }

    // Fallback to localStorage
    try {
        const lsVal = localStorage.getItem('leaderboard');
        if (lsVal) {
            const parsed = JSON.parse(lsVal);
            if (Array.isArray(parsed) && parsed.length > 0) {
                // Migrate to Dexie
                saveLeaderboardArray(parsed).catch(() => { });
                return parsed;
            }
        }
    } catch { /* parse error */ }

    // Final fallback: try idb-keyval
    try {
        const { get } = await import('idb-keyval');
        const oldVal = await get('leaderboard');
        if (Array.isArray(oldVal) && oldVal.length > 0) {
            // Migrate to Dexie
            saveLeaderboardArray(oldVal).catch(() => { });
            return oldVal;
        }
    } catch { /* idb-keyval not available */ }

    return [];
}

// --- Direct table access for specialized operations  ---

export async function getLocalLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
    const all = await loadLeaderboardArray();
    return all.slice(0, limit);
}

export async function saveLeaderboardEntry(
    name: string,
    score: number,
    snapshot?: string,
    lastSyncedScore?: number
): Promise<void> {
    const existing = await loadLeaderboardArray();
    const lowerName = name.toLowerCase();

    // Filter out existing entry for this name
    const filtered = existing.filter(e => e.name.toLowerCase() !== lowerName);

    // Find if there was a previous entry
    const prev = existing.find(e => e.name.toLowerCase() === lowerName);

    // Only add if score is higher or no previous entry
    if (!prev || score > prev.score) {
        filtered.push({ name, score, snapshot, lastSyncedScore });
    } else if (prev) {
        // Keep the old entry but update lastSyncedScore if provided
        filtered.push({
            ...prev,
            lastSyncedScore: lastSyncedScore ?? prev.lastSyncedScore
        });
    }

    // Sort and save
    const sorted = filtered.sort((a, b) => b.score - a.score).slice(0, 50);
    await saveLeaderboardArray(sorted);
}

export async function getPlayerBest(name: string): Promise<LeaderboardEntry | undefined> {
    const all = await loadLeaderboardArray();
    return all.find(e => e.name.toLowerCase() === name.toLowerCase());
}

export async function markSynced(name: string, syncedScore: number): Promise<void> {
    const all = await loadLeaderboardArray();
    const lowerName = name.toLowerCase();
    const updated = all.map(e =>
        e.name.toLowerCase() === lowerName
            ? { ...e, lastSyncedScore: syncedScore }
            : e
    );
    await saveLeaderboardArray(updated);
}

// Helper exports for settings
export const saveSetting = (key: string, value: unknown) => Persistence.save(key, value);
export const loadSetting = <T>(key: string) => Persistence.load(key) as Promise<T | undefined>;

// Clear local leaderboard (does NOT affect global leaderboard which is server-side)
export async function clearLocalLeaderboard(): Promise<void> {
    try {
        // Clear Dexie tables
        await db.leaderboard.clear();
        await db.settings.delete('highScore');

        // Clear localStorage
        localStorage.removeItem('leaderboard');
        localStorage.removeItem('highScore');

        // CRITICAL: Also clear idb-keyval to prevent old data from migrating back
        try {
            const { del } = await import('idb-keyval');
            await del('leaderboard');
            await del('highScore');
        } catch { /* idb-keyval not available */ }

        console.log('Local leaderboard cleared from all storage locations');
    } catch (e) {
        console.warn('Failed to clear local leaderboard:', e);
    }
}

// Migration function (called on app init)
export async function migrateFromOldStorage(): Promise<void> {
    // The load functions already handle migration from idb-keyval and localStorage
    // Just trigger a load to initiate migration if needed
    try {
        await Persistence.load('_migration_check');
        await Persistence.load('leaderboard');
        console.log('Storage migration check complete');
    } catch (e) {
        console.warn('Migration check failed:', e);
    }
}

