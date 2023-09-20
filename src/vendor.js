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
 * @property {string} outDir
 */

/**
 * @param {VendorOptions & Optional<import("./fetchDependencies.js").FetchDependenciesOptions, "baseUrl">} options
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
	const outDir = resolve(options.outDir);
	for await (const entry of fetchDependencies(fetchOptions)) {
		const url = new URL(entry.url);
		const urlHost = sanitizePathName(url.host);
		let urlPath = sanitizePathName(url.pathname);
		// The first character is always a '/', which we should remove.
		// Otherwise it is used as an absolute path.
		urlPath = urlPath.slice(1);
		const outPath = resolve(outDir, urlHost, urlPath);
		await ensureDir(dirname(outPath));
		await Deno.writeTextFile(outPath, entry.content);
	}
}

/**
 * @param {string} name
 */
function sanitizePathName(name) {
	return name.replaceAll(/[<>:"|?*]/g, "_");
}
