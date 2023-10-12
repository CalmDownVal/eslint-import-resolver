import { dirname, join, resolve } from 'node:path';

import { isDynamicPattern as isGlob, sync as globSync, type Options as GlobOptions } from 'fast-glob';
import { parse as parseJSONC } from 'jsonc-parser';

import { log } from '~/utils/debug';
import { getFileSystem } from '~/utils/fileSystem';
import { mergeObjectsDeep } from '~/utils/object';

export interface LocateProjectsOptions {
	readonly cwd: string;
	readonly project: string | readonly string[];
}

export function locateProjects({ cwd, project }: LocateProjectsOptions) {
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

	return Array.from(paths);
}

export interface TSConfigWithMetadata extends TSConfig {
	readonly configPath: string;
	readonly rootPath: string;
}

export interface TSConfig {
	readonly compilerOptions?: TSConfigCompilerOptions;
	readonly extends?: string;
}

export interface TSConfigCompilerOptions {
	readonly baseUrl?: string;
	readonly paths?: TSConfigPaths | null;
}

export interface TSConfigPaths {
	[pattern: string]: readonly string[];
}

export function readTsConfig(projectPath: string): TSConfigWithMetadata | null {
	const configPath = appendTsConfigPath(projectPath);

	let config = readJsonSync(configPath);
	if (!config) {
		return null;
	}

	const rootPath = dirname(configPath);
	if (config.extends) {
		const basePath = join(rootPath, config.extends);
		const baseConfig = readTsConfig(basePath);
		config = mergeObjectsDeep(baseConfig, config) as TSConfig;
	}

	return {
		...config,
		configPath,
		rootPath
	};
}

const RE_DIRECTORY = /\/?$/i;
const RE_JSON_FILE = /.jsonc?$/i;

function appendTsConfigPath(projectPath: string) {
	let tsConfigPath = projectPath;
	if (RE_DIRECTORY.test(projectPath)) {
		tsConfigPath += 'tsconfig.json';
	}
	else if (!RE_JSON_FILE.test(projectPath)) {
		tsConfigPath += '.json';
	}

	return tsConfigPath;
}

function readJsonSync(configPath: string) {
	try {
		const fs = getFileSystem();
		const tsConfigRaw = fs.readFileSync(configPath, { encoding: 'utf8' }) as string;
		return parseJSONC(tsConfigRaw) as TSConfig;
	}
	catch {
		log('Could not read JSON from %s.', configPath);
		return null;
	}
}
