export function mergeObjectsDeep(object: any, patch: any): any {
	if (Array.isArray(patch)) {
		return Array.isArray(object)
			? object.concat(patch)
			: patch;
	}

	if (!isPlainObject(patch)) {
		return patch;
	}

	const result = { ...object };
	for (const key of Object.getOwnPropertyNames(patch)) {
		result[key] = mergeObjectsDeep(object[key], patch[key]);
	}

	return result;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}
