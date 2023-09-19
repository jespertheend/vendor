import { assertEquals } from "$std/assert/mod.ts";
import { fetchDependencies } from "../src/fetchDependencies.js";
import { installMockFetch, uninstallMockFetch } from "./shared/mockFetch.js";

/**
 * @param  {Parameters<typeof fetchDependencies>} args
 */
async function fetchAll(...args) {
	const results = [];
	const iterable = fetchDependencies(...args);
	for await (const entry of iterable) {
		results.push(entry);
	}
	return results;
}

Deno.test({
	name: "Single file",
	async fn() {
		installMockFetch([
			{
				url: "https://example.com/foo.js",
				response: `//empty`,
			},
		]);

		try {
			const results = await fetchAll({
				baseUrl: "https://example.com",
				entryPoints: ["/foo.js"],
			});
			assertEquals(results, [
				{
					url: "https://example.com/foo.js",
					content: `//empty`,
				},
			]);
		} finally {
			uninstallMockFetch();
		}
	},
});

Deno.test({
	name: "File imports other file",
	async fn() {
		installMockFetch([
			{
				url: "https://example.com/foo.js",
				response: `import "./bar.js";`,
			},
			{
				url: "https://example.com/bar.js",
				response: `//empty`,
			},
		]);

		try {
			const results = await fetchAll({
				baseUrl: "https://example.com",
				entryPoints: ["/foo.js"],
			});
			assertEquals(results, [
				{
					url: "https://example.com/foo.js",
					content: `import "./bar.js";`,
				},
				{
					url: "https://example.com/bar.js",
					content: `//empty`,
				},
			]);
		} finally {
			uninstallMockFetch();
		}
	},
});

Deno.test({
	name: "Basic import tree",
	async fn() {
		installMockFetch([
			{
				url: "https://example.com/main.js",
				response: `
				import "./subA.js";
				import "./subB.js";
				`,
			},
			{
				url: "https://example.com/subA.js",
				response: `
				import "./subSubA.js";
				`,
			},
			{
				url: "https://example.com/subB.js",
				response: `//empty`,
			},
			{
				url: "https://example.com/subSubA.js",
				response: `//empty`,
			},
		]);

		try {
			const results = await fetchAll({
				baseUrl: "https://example.com",
				entryPoints: ["/main.js"],
			});
			assertEquals(results.map((r) => r.url), [
				"https://example.com/main.js",
				"https://example.com/subA.js",
				"https://example.com/subB.js",
				"https://example.com/subSubA.js",
			]);
		} finally {
			uninstallMockFetch();
		}
	},
});

Deno.test({
	name: "Circular import is only fetched once",
	async fn() {
		installMockFetch([
			{
				url: "https://example.com/main.js",
				response: `import "./subA.js";`,
			},
			{
				url: "https://example.com/subA.js",
				response: `import "./subB.js";`,
			},
			{
				url: "https://example.com/subB.js",
				response: `import "./subA.js";`,
			},
		]);

		try {
			const results = await fetchAll({
				baseUrl: "https://example.com",
				entryPoints: ["/main.js"],
			});
			assertEquals(results.map((r) => r.url), [
				"https://example.com/main.js",
				"https://example.com/subA.js",
				"https://example.com/subB.js",
			]);
		} finally {
			uninstallMockFetch();
		}
	},
});
