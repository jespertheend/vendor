import { generateTypes } from "https://deno.land/x/deno_tsc_helper@v0.5.0/mod.js";
import { setCwd } from "$chdir-anywhere";
setCwd();
Deno.chdir("..");

await generateTypes({
	include: [
		"./scripts",
		"./src",
		"./test",
	],
	importMap: "importmap.json",
	logLevel: "DEBUG",
});
