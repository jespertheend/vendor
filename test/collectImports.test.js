import { parseImportSpecifiers } from "../src/parseImportSpecifiers.js";
import { assertEquals } from "$std/assert/mod.ts";

const source = `
import "foo1.js";
import "foo2.ts";
import a from "foo3.js";
import b from "foo4.ts";
import {c} from "foo5.js";
import {d} from "foo6.ts";
export * from "foo7.js";
export * from "foo8.ts";

{
	import "foo9.js";
	import {e} from "foo10.ts";
}

import f from "./foo11.css" assert {type: "css"};

import type {typeA} from "type1.js";
import type * as typeB from "type2.js";

/** @typedef {import("type3.js").typeC} h */

/**
 * @param {import("type4.js").typeD} i
 */
function myFn(i) {}
`;

const expectedSpecifiers = [
	"foo1.js",
	"foo2.ts",
	"foo3.js",
	"foo4.ts",
	"foo5.js",
	"foo6.ts",
	"foo7.js",
	"foo8.ts",
	"foo9.js",
	"foo10.ts",
	"./foo11.css",
	"type1.js",
	"type2.js",
	"type3.js",
	"type4.js",
];

Deno.test({
	name: "Collects including type imports",
	fn() {
		const result = parseImportSpecifiers(source, true);

		assertEquals(Array.from(result), expectedSpecifiers);
	},
});

Deno.test({
	name: "Collects excluding type imports",
	fn() {
		const result = parseImportSpecifiers(source);

		const expected = expectedSpecifiers.filter((specifier) => !specifier.startsWith("type"));
		assertEquals(Array.from(result), expected);
	},
});
