import nodeFs from 'node:fs';

import { CachedInputFileSystem } from 'enhanced-resolve';

let cachedFs: CachedInputFileSystem | null = null;

export function getFileSystem() {
	return (cachedFs ??= new CachedInputFileSystem(nodeFs, 5_000));
}
