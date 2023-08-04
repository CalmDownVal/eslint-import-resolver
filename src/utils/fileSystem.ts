import nodeFs from 'node:fs';
// import { join } from 'node:path';

import { CachedInputFileSystem } from 'enhanced-resolve';

let cachedFs: CachedInputFileSystem | null = null;

export function getFileSystem() {
	return (cachedFs ??= new CachedInputFileSystem(nodeFs, 5_000));
}

// export function isModule(path: string) {
// 	return isFile(join(path, 'package.json'));
// }

// export function isFile(path: string) {
// 	const fs = getFileSystem();
// 	return fs.statSync(path, { throwIfNoEntry: false }).isFile();
// }
