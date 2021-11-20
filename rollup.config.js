import typescript from '@rollup/plugin-typescript';
import del from 'rollup-plugin-delete';
import definitions from 'rollup-plugin-dts';
import externals from 'rollup-plugin-node-externals';
import { terser } from 'rollup-plugin-terser';

const minified = {
	sourcemap: true,
	plugins: [
		terser({
			output: {
				comments: false
			}
		})
	]
};

// eslint-disable-next-line import/no-default-export
export default [
	{
		input: './src/index.ts',
		output: [
			{
				...minified,
				file: './build/index.cjs.min.js',
				format: 'cjs'
			},
			{
				...minified,
				file: './build/index.esm.min.js',
				format: 'esm'
			}
		],
		plugins: [
			del({
				targets: './build/*'
			}),
			typescript(),
			externals({
				deps: true
			})
		]
	},
	{
		input: './src/index.ts',
		output: {
			file: './build/index.d.ts',
			format: 'es'
		},
		plugins: [
			typescript(),
			definitions()
		]
	}
];
