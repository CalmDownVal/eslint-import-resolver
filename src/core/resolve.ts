import { dirname, resolve as pathResolve } from 'node:path';

import isCore from 'is-core-module';

import type { ResolverConfig, ResolverResult } from '~/types';
import { createCache, type CacheOptions } from '~/utils/cache';
import { log } from '~/utils/debug';
import { defaultConfig } from '~/utils/defaultConfig';
import { getTypesPackageName, hasJsExtension, removeQueryString } from '~/utils/path';

import { createPathMappers, type PathMapper, type PathMapperOptions } from './PathMapper';
import { createSourceResolver, type SourceResolver, type SourceResolverOptions } from './SourceResolver';

const cacheOptions: CacheOptions = { maxSize: 32 };
const pathMapperCache = createCache<PathMapperOptions, readonly PathMapper[]>(cacheOptions);
const sourceResolverCache = createCache<SourceResolverOptions, SourceResolver>(cacheOptions);

export function resolve(
	incomingSpecifier: string,
	incomingFile: string,
	incomingConfig?: ResolverConfig | null
): ResolverResult {
	log('Resolving %s in %s...', incomingSpecifier, incomingFile);

	// check for core modules first, as it is the cheapest test
	const specifier = removeQueryString(incomingSpecifier);
	if (isCore(specifier)) {
		log('Matched %s as a core module.', specifier);
		return {
			found: true,
			path: null
		};
	}

	// normalize resolver configuration
	const config: Required<ResolverConfig> = {
		...defaultConfig,
		...incomingConfig,
		resolver: {
			...defaultConfig.resolver,
			...incomingConfig?.resolver
		}
	};

	// normalize file path
	const cwd = process.cwd();
	const sourceFile = pathResolve(cwd, incomingFile);
	const sourceDirectory = dirname(sourceFile);

	// apply path mapping and attempt to resolve
	const sourceResolver = sourceResolverCache.getOrCreate(config.resolver, createSourceResolver);
	const pathMappers = pathMapperCache.getOrCreate({
		cwd,
		project: config.project
	}, createPathMappers);

	const mappedPaths = applyPathMapping(pathMappers, specifier, sourceDirectory);

	// call the internal routine
	return resolveInternal(
		sourceResolver,
		mappedPaths,
		sourceDirectory,
		sourceFile,
		config
	);
}

function applyPathMapping(pathMappers: readonly PathMapper[], specifier: string, sourceDirectory: string) {
	let bestMapper: PathMapper | null = null;
	let bestScore = 0;
	for (const mapper of pathMappers) {
		const score = mapper.root.length;
		if (sourceDirectory.startsWith(mapper.root) && score > bestScore) {
			bestMapper = mapper;
			bestScore = score;
		}
	}

	if (bestMapper) {
		const paths = bestMapper.map(specifier);
		if (paths && paths.length > 0) {
			log('Mapped %s to: %o', specifier, paths);
			return paths;
		}
	}

	return [ specifier ];
}

function resolveInternal(
	sourceResolver: SourceResolver,
	specifiers: readonly string[],
	sourceDirectory: string,
	sourceFile: string,
	config: Required<ResolverConfig>
): ResolverResult {
	// try until the first specifier that resolves
	let resolvedSpecifier: string | undefined;
	let resolvedPath: string | undefined;
	for (const specifier of specifiers) {
		if ((resolvedPath ??= sourceResolver.resolve(specifier, sourceDirectory, sourceFile)) !== undefined) {
			resolvedSpecifier = specifier;
			break;
		}
	}

	// try look for a @types/ package
	const shouldTryTypes = resolvedPath === undefined
		? config.alwaysTryTypes
		: hasJsExtension(resolvedPath);

	if (shouldTryTypes) {
		const typesSpecifiers = resolvedPath === undefined
			? specifiers
			: [ resolvedSpecifier! ];

		for (const specifier of typesSpecifiers) {
			const typesSpecifier = getTypesPackageName(specifier);
			if (typesSpecifier) {
				const result = sourceResolver.resolve(typesSpecifier, sourceDirectory, sourceFile);
				if (result !== undefined) {
					resolvedPath = result;
					break;
				}
			}
		}
	}

	// convert the final result
	if (resolvedPath === undefined) {
		log('In file %s Could not resolve any of: %o', sourceFile, specifiers);
		return { found: false };
	}

	log('Resolved %s to %s.', resolvedSpecifier, resolvedPath);
	return {
		found: true,
		path: resolvedPath
	};
}
