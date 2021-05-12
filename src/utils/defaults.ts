import type { PackageFilter, ResolverConfig } from '../types';

// this is needed to have a stable ref as configs are used for memoization
export const defaultConfig: ResolverConfig = {};

export const defaultExtensions = [
	'.ts',
	'.tsx',
	'.d.ts',
	'.js',
	'.jsx',
	'.mjs',
	'.cjs'
];

export const defaultPackageFilter: PackageFilter = pkg => {
	pkg.main = pkg.types || pkg.typings || pkg.module || pkg['jsnext:main'] || pkg.main;
	return pkg;
};
