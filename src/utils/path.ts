const RE_JS = /\.[cm]?jsx?$/i;

export function hasJsExtension(path: string) {
	return RE_JS.test(path);
}

export function removeQueryString(path: string) {
	const index = path.lastIndexOf('?');
	return index >= 0 ? path.slice(0, index) : path;
}

const RE_RELATIVE = /^\.{1,2}(?:[/\\].*)?$/;

export function isRelative(path: string) {
	return RE_RELATIVE.test(path);
}

const RE_PACKAGE = /^(?:@([^/\\]+?)[/\\])?([^/\\]+?)$/;

export function getTypesPackageName(specifier: string) {
	const match = RE_PACKAGE.exec(specifier);
	if (!match || match[1] === 'types') {
		return null;
	}

	return `@types/${match[1] ? `${match[1]}__` : ''}${match[2]}`;
}
