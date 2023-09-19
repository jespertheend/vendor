/**
 * @typedef VendorOptions
 * @property {string} entryPoint
 * @property {boolean} [includeTypeImports]
 */

import { fetchDependencies } from "./fetchDependencies.js";

/**
 * @param {VendorOptions} options
 */
export function vendor({
	entryPoint,
	includeTypeImports = false,
}) {
	// TODO
}
