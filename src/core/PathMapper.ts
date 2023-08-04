import { dirname, join, resolve } from 'node:path';

import { isDynamicPattern as isGlob, sync as globSync, type Options as GlobOptions } from 'fast-glob';
import { parse } from 'jsonc-parser';

import { log } from '~/utils/debug';
import { getFileSystem } from '~/utils/fileSystem';


export interface PathMapperOptions {
	readonly cwd: string;
	readonly project: string | readonly string[];
}

export interface PathMapper {
	readonly root: string;
	map(specifier: string): null | readonly string[];
}

export function createPathMappers(options: PathMapperOptions): readonly PathMapper[] {
	const projects = locateProjects(options);
	const mappers = [];

	for (const project of projects) {
		const mapper = getPathsMapper(project);
		if (mapper) {
			mappers.push(mapper);
		}
	}

	return mappers;
}


function locateProjects({ cwd, project }: PathMapperOptions): Iterable<string> {
	// get the configured list of project paths
	const patterns: string[] = typeof project === 'string'
		? [ project ]
		: Array.isArray(project)
			? project
			: [ cwd ];

	if (patterns.length === 0) {
		log('No TSConfig paths were configured.');
		return [];
	}

	// resolve globs
	const paths = new Set<string>();
	const globOptions: GlobOptions = {
		absolute: true,
		cwd,
		ignore: [ '**/node_modules/**' ]
	};

	for (const pattern of patterns) {
		if (isGlob(pattern)) {
			const matches = globSync(pattern, globOptions);
			matches.forEach(match => paths.add(match));
		}
		else {
			paths.add(resolve(cwd, pattern));
		}
	}

	return paths;
}


const RE_TSCONFIG = /[/\\]tsconfig.json$/i;

function getPathsMapper(absoluteProjectPath: string): PathMapper | null {
	const project = RE_TSCONFIG.test(absoluteProjectPath)
		? absoluteProjectPath
		: join(absoluteProjectPath, 'tsconfig.json');

	try {
		const tsConfigRaw = getFileSystem().readFileSync(project, { encoding: 'utf8' }) as string;
		const tsConfig: TSConfig = parse(tsConfigRaw);
		return createPathMapper(tsConfig, project);
	}
	catch {
		log('Could not read TSConfig at %s.', project);
		return null;
	}
}


interface TSConfigPaths {
	[pattern: string]: readonly string[];
}

interface TSConfigCompilerOptions {
	readonly baseUrl?: string;
	readonly paths?: TSConfigPaths | null;
}

interface TSConfig {
	readonly compilerOptions?: TSConfigCompilerOptions;
}

interface PathMatcher {
	readonly matching: PathPattern;
	readonly replacing: readonly PathPattern[];
}

function createPathMapper(tsConfig: TSConfig, path: string): PathMapper | null {
	const baseUrl = tsConfig.compilerOptions?.baseUrl;
	const paths = tsConfig.compilerOptions?.paths;

	if (typeof baseUrl !== 'string' || paths === null || typeof paths !== 'object') {
		log('TSConfig at %s does not define any paths mappings.', path);
		return null;
	}

	const root = dirname(path);
	const resolvedBaseUrl = resolve(root, baseUrl);
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
		root,
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


interface WildcardPathPattern {
	readonly isWildcard: true;
	readonly prefix: string;
	readonly suffix: string;
}

interface StaticPathPattern {
	readonly isWildcard: false;
	readonly pattern: string;
}

type PathPattern = WildcardPathPattern | StaticPathPattern;

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
