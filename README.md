# Vendor

This module allows you to download a JavaScript file and all of its dependencies to disk.
Each file is parsed and checked for `import` statements. Any imports that are found within the file will be downloaded recursively until the entire module graph is written to disk.

## Usage

```js
import { vendor } from "https://deno.land/x/vendor/mod.js";

// Download the contents of mod.js and all of its dependencies to the 'deps' directory.
await vendor({
	entryPoints: ["https://deno.land/x/renda@v0.1.0/src/mod.js"],
	outDir: "./deps",
});
```

## Why not use `deno vendor` or `npm install`?

This approach is mainly beneficial in cases where you wish to make your application runnable without a build step. Your local server might not be serving the `node_modules` directory, you might not be using `node` and `npm` at all, or maybe the third-party code you are trying to use is not available on npm.

Furthermore, `deno vendor` is mainly meant for vendoring code that is run by Deno. So things like [import attributes](https://github.com/tc39/proposal-import-attributes) are not supported. Deno also vendors everything including type imports. Third-party code may contain a `/** @type {import("thisfiledoesntexist")} */` JSDoc comment, and the entire vendor operation will fail.
