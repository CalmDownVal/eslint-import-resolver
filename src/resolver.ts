import { dirname } from 'path';

import { isCore, sync, SyncOpts } from 'resolve';

import { getMappedPath } from './mapping';
import type { ResolverResult } from './types';
import { log } from './utils/debug';
import { defaultConfig, defaultExtensions, defaultPackageFilter } from './utils/defaults';
import { getTypesPackageName, hasJSExtension, removeJSExtension, removeQueryString } from './utils/paths';

function tsResolve(originalPath: string, options?: SyncOpts): string {
	try {
		return sync(originalPath, options);
	}
	catch (ex) {
		const pathWithoutExt = removeJSExtension(originalPath);
		if (pathWithoutExt !== originalPath) {
			return sync(pathWithoutExt, options);
		}

		throw ex;
	}
}

export function resolve(source: string, file: string, config = defaultConfig): ResolverResult {
	log('Looking for:', source);

	const originalPath = removeQueryString(source);
	if (isCore(originalPath)) {
		log('Matched as core module:', originalPath);
		return {
			found: true,
			path: null
		};
	}

	const mappedPath = getMappedPath(originalPath, file, config);
	if (mappedPath) {
		log('Mapped TypeScript path:', mappedPath);
	}

	let absolutePath = null;
	try {
		absolutePath = tsResolve(mappedPath ?? originalPath, {
			basedir: dirname(file),
			extensions: config.extensions ?? defaultExtensions,
			packageFilter: config.packageFilter ?? defaultPackageFilter
		});
	}
	catch {
		// intentionally ignored
	}

	// attempt to look for @types/* in case we resolved to a JS file or are forced to by config
	const shouldTryTypes = absolutePath
		? hasJSExtension(absolutePath)
		: config.alwaysTryTypes ?? false;

	if (shouldTryTypes) {
		const typesPackageName = getTypesPackageName(originalPath);
		if (typesPackageName) {
			const definitelyTyped = resolve(typesPackageName, file, config);
			if (definitelyTyped.found) {
				return definitelyTyped;
			}
		}
	}

	if (absolutePath) {
		log('Matched path:', absolutePath);
		return {
			found: true,
			path: absolutePath
		};
	}

	log('Could not find:', originalPath);
	return { found: false };
}