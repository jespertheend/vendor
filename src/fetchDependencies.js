import { parseImportSpecifiers } from "./parseImportSpecifiers.js";
import { parseImportMap, resolveModuleSpecifier } from "https://deno.land/x/import_maps@v0.1.1/mod.js";

/**
 * @typedef FetchDependenciesOptions
 * @property {string[]} options.entryPoints
 * @property {string} options.baseUrl
 * @property {boolean} [options.includeTypeImports]
 * @property {import("https://deno.land/x/import_maps@v0.1.1/mod.js").ImportMapData} [options.importMap]
 */

/**
 * @typedef FetchedDependency
 * @property {string} content
 * @property {string} url
 */

/**
 * Fetches all dependencies from the provided entry points.
 * This returns an async iterable which can be iterated over to yield all the results.
 * @param {FetchDependenciesOptions} options
 * @returns {AsyncIterable<FetchedDependency>}
 */
export function fetchDependencies({
	entryPoints,
	baseUrl,
	includeTypeImports = false,
	importMap = {},
}) {
	const baseUrlObj = new URL(baseUrl);
	const parsedImportMap = parseImportMap(importMap, new URL(baseUrl));
	/** @type {Set<string>} */
	const fetchedUrls = new Set();

	// In order to make this function return an async iterable, we need to do some work
	// to make sure the calls to `next()` are resolved in the correct order.
	// Whenever we obtain a new fetched dependency result, there are two scenarios:
	// - `next()` has already been called, and it has returned a pending promise,
	//   we need to resolve this promise with our result.
	// - `next()` hasn't been called yet, so we add our result to a buffer of results,
	//   once `next()` gets called again, we take an item from the buffer and return that immediately.
	/**
	 * @type {IteratorResult<FetchedDependency>[]}
	 */
	const iteratorResults = [];
	/** @type {Promise<IteratorResult<FetchedDependency>>?} */
	let pendingNextPromise = null;
	/** @type {((result: IteratorResult<FetchedDependency>) => void)?} */
	let resolvePendingNextPromise = null;

	/**
	 * Passes an iterator result on to the caller of `next()`.
	 * @param {IteratorResult<FetchedDependency>} iteratorResult
	 */
	function triggerNext(iteratorResult) {
		if (resolvePendingNextPromise) {
			resolvePendingNextPromise(iteratorResult);
			resolvePendingNextPromise = null;
			pendingNextPromise = null;
		} else {
			iteratorResults.push(iteratorResult);
		}
	}

	/**
	 * Recursively fetches a dependency based on the import statements it contains.
	 * @param {string} url
	 */
	async function fetchDependency(url) {
		if (fetchedUrls.has(url)) return;
		fetchedUrls.add(url);

		const response = await fetch(url);
		const text = await response.text();
		triggerNext({
			value: {
				url,
				content: text,
			},
		});
		const imports = Array.from(parseImportSpecifiers(text, includeTypeImports));

		const baseurl = new URL(url);
		const promises = [];
		for (const specifier of imports) {
			const resolvedUrl = resolveModuleSpecifier(parsedImportMap, baseurl, specifier);
			// TODO: Right now this function just keeps on going until all modules have been fetched.
			// But the caller may have stopped iterating over the async iterator.
			// There are a few things we can do here:
			// - Wait with calling `fetchDependency` until we notice that `next()` is called again.
			//   The downside is that this might slow down the process a bit, because it has to wait
			//   for `next()` to be called before it can start fetching the next request.
			// - Only fetch when `iteratorResults.length` falls below a certain threshold.
			// - Implement `return()` of the iterator protocol.
			const promise = fetchDependency(resolvedUrl.href);
			promises.push(promise);
		}
		await Promise.all(promises);
	}

	// Now we can start fetching all the dependencies, we don't await the promises
	// because we want to return the iterable synchronously.
	// Instead, the `next()` function of the iterator will return a promise.
	const promises = [];
	for (const entryPoint of entryPoints) {
		const resolvedUrl = resolveModuleSpecifier(parsedImportMap, baseUrlObj, entryPoint);
		const promise = fetchDependency(resolvedUrl.href);
		promises.push(promise);
	}

	// However, we do want to make sure the iterator returns. So we wait for all the created promises.
	// Once all of them have been resolved we can be sure that no more dependencies will be fetched.
	(async () => {
		await Promise.all(promises);
		triggerNext({
			value: null,
			done: true,
		});
	})();

	return {
		[Symbol.asyncIterator]() {
			return {
				/**
				 * @returns {Promise<IteratorResult<FetchedDependency>>}
				 */
				async next() {
					const queuedResult = iteratorResults.shift();
					if (queuedResult) return queuedResult;

					if (!pendingNextPromise) {
						pendingNextPromise = new Promise((resolve) => {
							resolvePendingNextPromise = resolve;
						});
					}
					const result = await pendingNextPromise;
					return result;
				},
			};
		},
	};
}
