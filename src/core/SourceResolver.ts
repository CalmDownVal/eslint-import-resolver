import { join } from 'node:path';

import { ResolverFactory } from 'enhanced-resolve';

import type { EnhancedResolveOptions } from '~/types';
import { getFileSystem } from '~/utils/fileSystem';
import { isRelative } from '~/utils/path';

export type SourceResolverOptions = EnhancedResolveOptions;

export interface SourceResolver {
	resolve(path: string, directory: string, file: string): string | undefined;
}

export function createSourceResolver(options: SourceResolverOptions): SourceResolver {
	const resolver = ResolverFactory.createResolver({
		...options,
		fileSystem: getFileSystem(),
		useSyncFileSystemCalls: true
	});

	return {
		resolve(source, directory, file) {
			try {
				// For some reason enhanced-resolve doesn't handle relative paths?
				const preResolvedSource = isRelative(source)
					? join(directory, source)
					: source;

				const result = resolver.resolveSync({}, file, preResolvedSource);
				return result === false ? undefined : result;
			}
			catch {
				return undefined;
			}
		}
	};
}
