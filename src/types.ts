import type { ResolveOptions } from 'enhanced-resolve';

export type EnhancedResolveOptions = Omit<ResolveOptions, 'fileSystem' | 'useSyncFileSystemCalls'>;

export interface ResolverConfig {
	alwaysTryTypes?: boolean;
	project?: string[] | string;
	resolver?: EnhancedResolveOptions;
}

// the below interfaces conform to the spec defined here:
// https://github.com/benmosher/eslint-plugin-import/blob/main/resolvers/README.md

export interface ResolverFileSystemResult {
	found: true;
	path: string;
}

export interface ResolverBuiltInResult {
	found: true;
	path: null;
}

export interface ResolverNoResult {
	found: false;
	path?: undefined;
}

export type ResolverResult =
	| ResolverFileSystemResult
	| ResolverBuiltInResult
	| ResolverNoResult;
