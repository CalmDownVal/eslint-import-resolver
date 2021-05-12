export interface PackageFilter {
	(pkg: Record<string, unknown>): Record<string, unknown>;
}

export interface ResolverConfig {
	alwaysTryTypes?: boolean;
	extensions?: string[];
	packageFilter?: PackageFilter;
	project?: string[] | string;
}

// the below interfaces conform to the spec defined here:
// https://github.com/benmosher/eslint-plugin-import/blob/master/resolvers/README.md

export interface ResolverPathResult {
	found: true;
	path: string;
}

export interface ResolverCoreResult {
	found: true;
	path: null;
}

export interface ResolverNoResult {
	found: false;
	path?: undefined;
}

export type ResolverResult =
	| ResolverPathResult
	| ResolverCoreResult
	| ResolverNoResult;
