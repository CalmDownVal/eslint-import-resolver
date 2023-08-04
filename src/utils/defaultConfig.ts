import type { ResolverConfig } from '~/types';

export const defaultConfig: Required<ResolverConfig> = {
	alwaysTryTypes: false,
	project: './tsconfig.json',
	resolver: {
		conditionNames: [
			'types',
			'import',

			// APF: https://angular.io/guide/angular-package-format
			'esm2020',
			'es2020',
			'es2015',

			'require',
			'node',
			'node-addons',
			'browser',
			'default'
		],
		extensionAlias: {
			'.js': [
				'.ts',
				// `.tsx` can also be compiled as `.js`
				'.tsx',
				'.d.ts',
				'.js'
			],
			'.jsx': [ '.tsx', '.d.ts', '.jsx' ],
			'.cjs': [ '.cts', '.d.cts', '.cjs' ],
			'.mjs': [ '.mts', '.d.mts', '.mjs' ]
		},
		extensions: [
			// `.mts`, `.cts`, `.d.mts`, `.d.cts`, `.mjs`, `.cjs` are not included because `.cjs` and `.mjs` must be used explicitly
			'.ts',
			'.tsx',
			'.d.ts',
			'.js',
			'.jsx',
			'.json',
			'.node'
		],
		mainFields: [
			'types',
			'typings',

			// APF: https://angular.io/guide/angular-package-format
			'fesm2020',
			'fesm2015',
			'esm2020',
			'es2020',

			'module',
			'jsnext:main',

			'main'
		]
	}
};
