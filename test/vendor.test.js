import { assertEquals } from "$std/assert/mod.ts";
import { resolve } from "$std/path/mod.ts";
import { vendor } from "../src/vendor.js";
import { installMockFetch, uninstallMockFetch } from "./shared/mockFetch.js";

/**
 * @param {(dirPath: string) => Promise<void>} fn
 */
async function tmpDirTest(fn) {
	const oldCwd = Deno.cwd();
	const dirPath = await Deno.makeTempDir();
	try {
		Deno.chdir(dirPath);
		await fn(dirPath);
	} finally {
		Deno.chdir(oldCwd);
		await Deno.remove(dirPath, { recursive: true });
	}
}

/**
 * @param {string} path
 */
async function getDirChildren(path) {
	const children = [];
	for await (const entry of Deno.readDir(path)) {
		children.push(entry.name);
	}
	return children;
}

Deno.test({
	name: "fetches files and writes them to disk",
	async fn() {
		await tmpDirTest(async (dirPath) => {
			console.log(dirPath);
			try {
				installMockFetch([
					{
						url: "https://example.com/foo.js",
						response: `import "./bar.js";`,
					},
					{
						url: "https://example.com/bar.js",
						response: "//empty",
					},
				]);
				await vendor({
					entryPoints: ["https://example.com/foo.js"],
					outDir: "./out",
				});
			} finally {
				uninstallMockFetch();
			}

			const children = await getDirChildren(dirPath);
			assertEquals(children, ["out"]);

			const outChildren = await getDirChildren(resolve(dirPath, "out"));
			assertEquals(outChildren, ["example.com"]);

			const exampleChildren = await getDirChildren(resolve(dirPath, "out", "example.com"));
			assertEquals(exampleChildren, ["foo.js", "bar.js"]);
		});
	},
});
