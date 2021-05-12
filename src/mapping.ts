import Glob from 'glob';
import isGlob from 'is-glob';
import { createMatchPath, loadConfig } from 'tsconfig-paths';

import { log } from './utils/debug';
import { defaultExtensions } from './utils/defaults';
import { removeJSExtension } from './utils/paths';
import type { ResolverConfig } from './types';

interface Mapper {
	readonly baseUrl: string;
	(path: string): string | undefined;
}

let mappers: Mapper[] | undefined;
let mappersBuiltForConfig: ResolverConfig;

function createMapper(baseUrl: string, paths: Record<string, string[]>, extensions: string[]): Mapper {
	const matchPath = createMatchPath(baseUrl, paths);
	const mapper = (path: string) => {
		const match = matchPath(path, undefined, undefined, extensions);
		if (match !== null) {
			return match;
		}

		const pathWithoutExt = removeJSExtension(path);
		if (pathWithoutExt !== path) {
			return matchPath(pathWithoutExt, undefined, undefined, extensions);
		}
	};

	mapper.baseUrl = baseUrl;
	return mapper;
}

function getMappers(config: ResolverConfig) {
	if (mappers && mappersBuiltForConfig === config) {
		return mappers;
	}

	const project = typeof config.project === 'string'
		? [ config.project ]
		: Array.isArray(config.project)
			? config.project
			: [ process.cwd() ];

	const paths = [];
	for (let i = 0; i < project.length; ++i) {
		const pathOrGlob = project[i];
		if (isGlob(pathOrGlob)) {
			const match = Glob.sync(pathOrGlob);
			for (let j = 0; j < match.length; ++j) {
				paths.push(match[j]);
			}
		}
		else {
			paths.push(pathOrGlob);
		}
	}

	mappers = [];
	mappersBuiltForConfig = config;

	for (let i = 0; i < paths.length; ++i) {
		const path = paths[i];
		const tsConfig = loadConfig(path);
		if (tsConfig.resultType !== 'success') {
			log('failed to init tsconfig-paths:', tsConfig.message);
			continue;
		}

		mappers.push(createMapper(
			tsConfig.absoluteBaseUrl,
			tsConfig.paths,
			config.extensions || defaultExtensions
		));
	}

	return mappers;
}

export function getMappedPath(originalPath: string, file: string, config: ResolverConfig): string | undefined {
	const mappers = getMappers(config);
	const paths = [];

	for (let i = 0; i < mappers.length; ++i) {
		const mapper = mappers[i];
		if (file.startsWith(mapper.baseUrl)) {
			const path = mapper(originalPath);
			if (path) {
				paths.push(path);
			}
		}
	}

	if (paths.length > 1) {
		log('mapped multiple TypeScript paths:', paths);
	}

	return paths[0];
}
