import { assertEquals, AssertionError } from "$std/assert/mod.ts";

const originalFetch = globalThis.fetch;

/**
 * @typedef ExpectedFetchRequest
 * @property {string} url
 * @property {string | (() => Response)} response
 */

let installed = false;
/** @type {ExpectedFetchRequest[]} */
let currentExpectedRequests = [];

/**
 * @param {ExpectedFetchRequest[]} expectedRequests
 */
export function installMockFetch(expectedRequests) {
	if (installed) {
		throw new AssertionError("Mock fetch is already installed");
	}
	installed = true;
	currentExpectedRequests = expectedRequests;

	/**
	 * @param {RequestInfo} url
	 */
	// deno-lint-ignore require-await
	const mockFetch = async (url) => {
		const response = currentExpectedRequests.shift();
		let urlStr;
		if (typeof url == "string") {
			urlStr = url;
		} else {
			urlStr = url.url;
		}
		if (!response) {
			throw new Error(`Mock fetch ran out of responses while attempting to fetch "${urlStr}"`);
		}

		assertEquals(urlStr, response.url);

		if (typeof response.response == "function") {
			return response.response();
		} else {
			return new Response(response.response, {
				headers: {
					"content-type": "text/javascript",
				},
			});
		}
	};
	globalThis.fetch = /** @type {typeof fetch} */ (mockFetch);
}

export function uninstallMockFetch() {
	if (!installed) {
		throw new AssertionError("Mock fetch isn't currently installed");
	}
	installed = false;

	globalThis.fetch = originalFetch;

	if (currentExpectedRequests.length != 0) {
		throw new AssertionError("Not all expected fetch calls have been made.");
	}
}
