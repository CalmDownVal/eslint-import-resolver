import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import deleteBeforeBuild from 'rollup-plugin-delete';
import definitions from 'rollup-plugin-dts';
import { nodeExternals } from 'rollup-plugin-node-externals';

// eslint-disable-next-line import/no-default-export
export default [
	{
		input: './src/index.ts',
		output: [
			{
				file: './build/index.min.cjs',
				format: 'cjs',
				exports: 'named',
				sourcemap: true
			},
			{
				file: './build/index.min.mjs',
				format: 'esm',
				exports: 'named',
				sourcemap: true
			}
		],
		plugins: [
			deleteBeforeBuild({
				targets: './build/*'
			}),
			typescript(),
			nodeExternals(),
			terser({
				output: {
					comments: false
				}
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
			nodeExternals(),
			definitions()
		]
	}
];
