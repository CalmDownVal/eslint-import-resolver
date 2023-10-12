import { resolve } from 'node:path';

import { log } from '~/utils/debug';

import type { TSConfigWithMetadata } from './TSConfig';

export interface PathMapper {
	readonly rootPath: string;
	map(specifier: string): null | readonly string[];
}

interface PathMatcher {
	readonly matching: PathPattern;
	readonly replacing: readonly PathPattern[];
}

export function createPathMapper(tsConfig: TSConfigWithMetadata): PathMapper | null {
	const baseUrl = tsConfig.compilerOptions?.baseUrl;
	const paths = tsConfig.compilerOptions?.paths;

	if (typeof baseUrl !== 'string' || paths === null || typeof paths !== 'object') {
		log('TSConfig at %s does not define any paths mappings.', tsConfig.configPath);
		return null;
	}

	const resolvedBaseUrl = resolve(tsConfig.rootPath, baseUrl);
	const matchers: PathMatcher[] = [];

	for (const matchPatternStr in paths) {
		const matching = patternParse(matchPatternStr);
		const replacing = paths[matchPatternStr]
			.map(patternParse)
			.filter(pattern => !pattern.isWildcard || matching.isWildcard);

		if (replacing.length > 0) {
			matchers.push({
				matching,
				replacing
			});
		}
	}

	return {
		rootPath: tsConfig.rootPath,
		map(specifier) {
			for (let i = 0; i < matchers.length; ++i) {
				const { matching, replacing } = matchers[i];
				const match = patternMatch(matching, specifier);
				if (match.isMatch) {
					return replacing.map(pattern => resolve(resolvedBaseUrl, patternReplace(pattern, match.wildcard)));
				}
			}

			return null;
		}
	};
}

type PathPattern = WildcardPathPattern | StaticPathPattern;

interface WildcardPathPattern {
	readonly isWildcard: true;
	readonly prefix: string;
	readonly suffix: string;
}

interface StaticPathPattern {
	readonly isWildcard: false;
	readonly pattern: string;
}

const RE_WILDCARD = /^(.*)\*(.*)$/;

function patternParse(pattern: string): PathPattern {
	const match = RE_WILDCARD.exec(pattern);
	if (match) {
		return {
			isWildcard: true,
			prefix: match[1],
			suffix: match[2]
		};
	}

	return {
		isWildcard: false,
		pattern
	};
}

function patternMatch(pattern: PathPattern, path: string) {
	const isMatch = pattern.isWildcard
		? path.startsWith(pattern.prefix) && path.endsWith(pattern.suffix)
		: path === pattern.pattern;

	return {
		isMatch,
		wildcard: isMatch && pattern.isWildcard
			? path.slice(pattern.prefix.length, path.length - pattern.suffix.length)
			: ''
	};
}

function patternReplace(pattern: PathPattern, wildcard: string) {
	return pattern.isWildcard
		? pattern.prefix + wildcard + pattern.suffix
		: pattern.pattern;
}
