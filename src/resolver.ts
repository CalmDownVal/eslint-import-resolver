import { dirname } from 'path';

import { isCore, sync as resolveSync, SyncOpts } from 'resolve';

import { getMappedPath } from './mapping';
import type { ResolverConfig, ResolverResult } from './types';
import { log } from './utils/debug';
import { defaultConfig, defaultExtensions, defaultPackageFilter } from './utils/defaults';
import { getTypesPackageName, hasJSExtension, removeJSExtension, removeQueryString } from './utils/paths';

function nodeResolve(originalPath: string, options?: SyncOpts): string {
	try {
		return resolveSync(originalPath, options);
	}
	catch (ex) {
		const pathWithoutExt = removeJSExtension(originalPath);
		if (pathWithoutExt !== originalPath) {
			return resolveSync(pathWithoutExt, options);
		}

		throw ex;
	}
}

function resolveOne(originalPath: string, file: string, config: ResolverConfig): ResolverResult {
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

	try {
		const absolutePath = nodeResolve(mappedPath ?? originalPath, {
			basedir: dirname(file),
			extensions: config.extensions ?? defaultExtensions,
			includeCoreModules: false,
			packageFilter: config.packageFilter ?? defaultPackageFilter,
			preserveSymlinks: true
		});

		log('Matched path:', absolutePath);
		return {
			found: true,
			path: absolutePath
		};
	}
	catch {
		log('Could not find:', originalPath);
		return { found: false };
	}
}

export function resolve(source: string, file: string, config = defaultConfig): ResolverResult {
	log('Looking for:', source);
	const originalPath = removeQueryString(source);
	const result = resolveOne(originalPath, file, config);

	// attempt to look for @types/* in case we resolved to a JS file or are forced to by config
	const shouldTryTypes = result.path
		? hasJSExtension(result.path)
		: config.alwaysTryTypes ?? false;

	if (shouldTryTypes) {
		const typesPackageName = getTypesPackageName(originalPath);
		if (typesPackageName) {
			const definitelyTyped = resolveOne(typesPackageName, file, config);
			if (definitelyTyped.found) {
				return definitelyTyped;
			}
		}
	}

	return result;
}
