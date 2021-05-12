const RE_JS = /\.[cm]?jsx?$/i;

export function getTypesPackageName(name: string) {
	const match = /^(?:@([^/]+?)\/)?([^/]+?)$/.exec(name);
	if (!match || match[1] === 'types') {
		return null;
	}

	return `@types/${match[1] ? `${match[1]}__` : ''}${match[2]}`;
}

export function hasJSExtension(path: string) {
	return RE_JS.test(path);
}

export function removeJSExtension(path: string) {
	const match = RE_JS.exec(path);
	return match ? path.slice(0, match.index) : path;
}

export function removeQueryString(path: string) {
	const index = path.lastIndexOf('?');
	return index >= 0 ? path.slice(0, index) : path;
}
