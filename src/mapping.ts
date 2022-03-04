import { dirname } from 'path';

import { isDynamicPattern, sync as globSync } from 'fast-glob';
import { ConfigLoaderSuccessResult, createMatchPath, loadConfig } from 'tsconfig-paths';

import type { ResolverConfig } from './types';
import { log } from './utils/debug';
import { defaultExtensions } from './utils/defaults';
import { removeJSExtension } from './utils/paths';

interface Mapper {
	readonly root: string;
	(path: string): string | undefined;
}

const cache = new WeakMap<ResolverConfig, readonly Mapper[]>();

function createMapper(config: ConfigLoaderSuccessResult, extensions: string[]): Mapper {
	const matchPath = createMatchPath(config.absoluteBaseUrl, config.paths);
	const mapper = (path: string) => {
		const match = matchPath(path, undefined, undefined, extensions);
		if (match) {
			return match;
		}

		const pathWithoutExt = removeJSExtension(path);
		if (pathWithoutExt !== path) {
			return matchPath(pathWithoutExt, undefined, undefined, extensions);
		}

		return undefined;
	};

	mapper.root = dirname(config.configFileAbsolutePath);
	return mapper;
}

function getMappers(config: ResolverConfig) {
	const cached = cache.get(config);
	if (cached) {
		return cached;
	}

	// get the configured list of tsconfig paths
	const patterns = typeof config.project === 'string'
		? [ config.project ]
		: Array.isArray(config.project)
			? config.project
			: [ process.cwd() ];

	if (patterns.length === 0) {
		log('No tsconfig paths were configured!');
		return [];
	}

	log(`Initializing mappers for:\n- ${patterns.join('\n- ')}`);

	// resolve globs
	let paths: string[] = [];
	for (const pattern of patterns) {
		if (isDynamicPattern(pattern)) {
			const match = globSync(pattern);
			paths = paths.concat(match);
		}
		else {
			paths.push(pattern);
		}
	}

	// load TS configs and create mappers
	const mappers: Mapper[] = [];
	for (let i = 0; i < paths.length; ++i) {
		const path = paths[i];
		const tsConfig = loadConfig(path);
		if (tsConfig.resultType !== 'success') {
			log('Failed to init tsconfig-paths:', tsConfig.message);
			continue;
		}

		mappers.push(createMapper(
			tsConfig,
			config.extensions ?? defaultExtensions
		));

		log(`Created mapper for config: '${tsConfig.configFileAbsolutePath}', baseUri: '${tsConfig.absoluteBaseUrl}', patterns: '${Object.keys(tsConfig.paths).join("', '")}'.`);
	}

	// update cache
	cache.set(config, mappers);
	return mappers;
}

export function getMappedPath(originalPath: string, file: string, config: ResolverConfig) {
	const mappers = getMappers(config);

	let mappedPath: string | null = null;
	let bestScore = 0;

	for (let i = 0; i < mappers.length; ++i) {
		const mapper = mappers[i];
		const score = mapper.root.length;

		if (file.startsWith(mapper.root) && score > bestScore) {
			const path = mapper(originalPath);
			if (path) {
				mappedPath = path;
				bestScore = score;
			}
		}
	}

	return mappedPath;
}
