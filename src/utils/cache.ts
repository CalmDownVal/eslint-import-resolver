import { createHash } from 'node:crypto';

export interface CacheHit<TValue> {
	readonly hit: true;
	readonly value: TValue;
}

export interface CacheMiss {
	readonly hit: false;
}

export type CacheResult<T> = CacheHit<T> | CacheMiss;

export interface Cache<TKey, TValue> {
	get(key: TKey): CacheResult<TValue>;
	getOrCreate(key: TKey, factory: (newKey: TKey) => TValue): TValue;
	set(key: TKey, value: TValue): void;
}

export interface CacheOptions {
	readonly maxSize?: number;
}

interface CacheEntry<TKey, TValue> {
	readonly key: TKey;
	readonly value: TValue;
	hits: number;
}

const EmptyCache: Cache<any, any> = {
	get() {
		return { hit: false };
	},
	getOrCreate(key, factory) {
		return factory(key);
	},
	set() {
		// no-op
	}
};

export function createCache<TKey, TValue>({ maxSize = Number.POSITIVE_INFINITY }: CacheOptions = {}): Cache<TKey, TValue> {
	if (maxSize < 1) {
		return EmptyCache;
	}

	const cache = new Map<string, CacheEntry<TKey, TValue>>();

	// accelerate the hottest entry in the cache by referential comparisons
	let hottestEntry: CacheEntry<TKey, TValue> | null = null;

	return {
		get(key) {
			if (key === hottestEntry?.key) {
				++hottestEntry.hits;
				return {
					hit: true,
					value: hottestEntry.value
				};
			}

			const hash = hashStruct(key);
			const entry = cache.get(hash);
			if (entry && structEqual(entry.key, key)) {
				++entry.hits;
				if (!hottestEntry || hottestEntry.hits < entry.hits) {
					hottestEntry = entry;
				}

				return {
					hit: true,
					value: entry.value
				};
			}

			return { hit: false };
		},
		getOrCreate(key, factory) {
			const result = this.get(key);
			if (result.hit) {
				return result.value;
			}

			const value = factory(key);
			this.set(key, value);
			return value;
		},
		set(key, value) {
			const hash = hashStruct(key);
			cache.set(hash, {
				key,
				value,
				hits: 0
			});

			const removeCount = Math.max(cache.size - maxSize, 0);
			if (removeCount > 0) {
				const entries = Array.from(cache.entries()).sort((a, b) => a[1].hits - b[1].hits);
				for (let i = 0; i < removeCount; ++i) {
					cache.delete(entries[i][0]);
				}
			}
		}
	};
}

function hashStruct(struct: unknown) {
	const hash = createHash('md5');
	for (const chunk of serializeStableOrder(struct)) {
		hash.update(chunk);
	}

	return hash.digest('base64');
}

function structEqual(struct0: unknown, struct1: unknown) {
	if (struct0 === struct1) {
		return true;
	}

	const it0 = serializeStableOrder(struct0);
	const it1 = serializeStableOrder(struct1);

	while (true) {
		const a = it0.next();
		const b = it1.next();

		if (a.done !== b.done) {
			return false;
		}

		if (a.done) {
			return true;
		}

		if (a.value !== b.value) {
			return false;
		}
	}
}

function* serializeStableOrder(struct: unknown): Generator<string, void, void> {
	switch (typeof struct) {
		case 'object':
			if (struct !== null) {
				if (struct instanceof Date) {
					yield `Date(${struct.getTime()})`;
				}
				else if (struct instanceof RegExp) {
					yield `/${struct.source}/${struct.flags}`;
				}
				else if (Array.isArray(struct)) {
					yield '[';
					for (let i = 0; i < struct.length; ++i) {
						yield* serializeStableOrder(struct[i]);
					}

					yield ']';
				}
				else {
					yield '{';
					const keys = Object.keys(struct).sort();
					for (let i = 0; i < keys.length; ++i) {
						yield keys[i];
						yield '=';
						yield* serializeStableOrder((struct as Record<string, unknown>)[keys[i]]);
					}

					yield '}';
				}

				break;
			}

		// fall through for nulls
		case 'undefined':
		case 'boolean':
		case 'number':
			yield '' + struct;
			break;

		case 'string':
			yield JSON.stringify(struct);
			break;

		case 'bigint':
			yield `${struct}n`;
			break;

		case 'function':
		case 'symbol':
			// throw new Error(`Type '${type}' cannot be serialized.`);
			break;
	}
}
