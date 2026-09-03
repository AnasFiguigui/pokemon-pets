import type { Pet } from './models';
import { MAX_CANDY_FED } from './models';
import { Consumables } from './game-data';

/**
 * Gift codes let a player share a single Pokémon with a friend without a
 * full save swap: `PKMN-GIFT:<base64 of {v, pet}>`, copied via clipboard.
 */
export const GIFT_CODE_PREFIX = 'PKMN-GIFT:';

/** Gift-code payload version (bump on incompatible format changes). */
export const GIFT_CODE_VERSION = 1;

/** Max friendship value (mirrors extension.ts). */
const MAX_FRIENDSHIP = 255;
/** Max raw HP/stamina accepted from imported data. */
const MAX_IMPORTED_STAT = 250;

/** Stone consumable ids — the only items allowed in an imported held slot. */
const STONE_IDS: ReadonlySet<string> = new Set(
    Consumables.filter(c => c.category === 'stone').map(c => c.id),
);

/**
 * Sanitizes one pet object from untrusted data (save import or gift code).
 * Returns undefined when the object is not a usable pet.
 */
export function sanitizeImportedPet(p: unknown): Pet | undefined {
    if (typeof p !== 'object' || p === null || Array.isArray(p)) { return undefined; }
    const raw = p as Record<string, unknown>;
    if (typeof raw.name !== 'string' || typeof raw.specie !== 'string') { return undefined; }

    return {
        name: raw.name.slice(0, 20),
        specie: raw.specie,
        color: typeof raw.color === 'string' ? raw.color : 'generation 1',
        form: typeof raw.form === 'string' ? raw.form : undefined,
        sprite: typeof raw.sprite === 'string' ? raw.sprite : undefined,
        spriteSize: raw.spriteSize === 48 ? 48 : 32,
        candyFed: typeof raw.candyFed === 'number' && Number.isFinite(raw.candyFed)
            ? Math.min(Math.max(0, Math.floor(raw.candyFed)), MAX_CANDY_FED)
            : 0,
        // Friendship may hold half-points from ball catches — clamp without flooring
        friendship: typeof raw.friendship === 'number' && Number.isFinite(raw.friendship)
            ? Math.min(MAX_FRIENDSHIP, Math.max(0, raw.friendship))
            : undefined,
        hp: typeof raw.hp === 'number' && Number.isFinite(raw.hp)
            ? Math.min(MAX_IMPORTED_STAT, Math.max(0, Math.floor(raw.hp)))
            : undefined,
        stamina: typeof raw.stamina === 'number' && Number.isFinite(raw.stamina)
            ? Math.min(MAX_IMPORTED_STAT, Math.max(0, Math.floor(raw.stamina)))
            : undefined,
        heldItem: typeof raw.heldItem === 'string' && STONE_IDS.has(raw.heldItem)
            ? raw.heldItem
            : undefined,
    };
}

/** Encodes a pet as a shareable gift code. */
export function encodeGiftCode(pet: Pet): string {
    const payload = JSON.stringify({ v: GIFT_CODE_VERSION, pet });
    return GIFT_CODE_PREFIX + Buffer.from(payload, 'utf8').toString('base64');
}

/**
 * Decodes and sanitizes a gift code. Returns undefined when the text is not
 * a valid code (wrong prefix, broken base64/JSON, newer version, bad pet).
 */
export function decodeGiftCode(text: string): Pet | undefined {
    const trimmed = text.trim();
    if (!trimmed.startsWith(GIFT_CODE_PREFIX)) { return undefined; }
    try {
        const json = Buffer.from(trimmed.slice(GIFT_CODE_PREFIX.length), 'base64').toString('utf8');
        const payload = JSON.parse(json);
        if (typeof payload !== 'object' || payload === null) { return undefined; }
        if (typeof payload.v !== 'number' || payload.v > GIFT_CODE_VERSION) { return undefined; }
        return sanitizeImportedPet(payload.pet);
    } catch {
        return undefined;
    }
}
