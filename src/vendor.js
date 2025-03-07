import { fetchDependencies } from "./fetchDependencies.js";
import { dirname, resolve, toFileUrl } from "https://deno.land/std@0.202.0/path/mod.ts";
import { ensureDir } from "https://deno.land/std@0.202.0/fs/mod.ts";

/**
 * @template T
 * @template {keyof T} K
 * @typedef {Pick<Partial<T>, K> & Omit<T, K>} Optional
 */

/**
 * @typedef VendorOptions
 * @property {string} outDir The directory to write the files to.
 */

/**
 * @typedef VendoredFile
 * @property {string} url The url of the resource that was downloaded.
 * @property {string} path The absolute path to the file where the resource was saved.
 */

/**
 * Downloads a list of entry points and all dependencies and writes them to disk.
 * Any import statements found in the downloaded files will be downloaded as well
 * until the entire module graph has been downloaded.
 * @param {VendorOptions & Optional<import("./fetchDependencies.js").FetchDependenciesOptions, "baseUrl">} options
 * @returns {Promise<VendoredFile[]>}
 */
export async function vendor(options) {
	/** @type {import("./fetchDependencies.js").FetchDependenciesOptions} */
	const fetchOptions = {
		baseUrl: "",
		...options,
	};
	if (!fetchOptions.baseUrl) {
		fetchOptions.baseUrl = toFileUrl(Deno.cwd()).href;
	}
	/** @type {VendoredFile[]} */
	const results = [];
	for await (const entry of fetchDependencies(fetchOptions)) {
		const outPath = urlToPathName(entry.url, options.outDir);
		await ensureDir(dirname(outPath));
		await Deno.writeTextFile(outPath, entry.content);
		results.push({
			url: entry.url,
			path: outPath,
		});
	}
	return results;
}

/**
 * @param {string} name
 */
function sanitizePathName(name) {
	return name.replaceAll(/[<>:"|?*]/g, "_");
}

/**
 * Returns a sanitized path that a file would get written to depending on its url.
 * @param {string} url The url of the file that was downloaded.
 * @param {string} outDir The root directory that all vendored files will get downloaded to.
 */
export function urlToPathName(url, outDir) {
	const urlObj = new URL(url);
	const urlHost = sanitizePathName(urlObj.host);
	let urlPath = sanitizePathName(urlObj.pathname);
	// The first character is always a '/', which we should remove.
	// Otherwise it is used as an absolute path.
	urlPath = urlPath.slice(1);
	const outPath = resolve(outDir, urlHost, urlPath);
	return outPath;
}
