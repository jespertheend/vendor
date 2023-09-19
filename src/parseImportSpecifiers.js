import ts from "npm:typescript@5.2.2";

/**
 * @param {ts.Node} node
 */
function* traverseAst(node) {
	/** @type {ts.Node[]} */
	let foundNodes = [];
	// @ts-ignore
	ts.forEachChildRecursively(node, (node) => {
		foundNodes.push(node);
	});

	yield* foundNodes;
}

/**
 * Parses file content and returns all import specifiers.
 * @param {string} fileContent
 * @param {boolean} [includeTypeImports]
 */
export function* parseImportSpecifiers(fileContent, includeTypeImports = false) {
	const sourceFile = ts.createSourceFile("filename.js", fileContent, ts.ScriptTarget.Latest);

	for (const statement of traverseAst(sourceFile)) {
		if (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) {
			if (!includeTypeImports) {
				if (ts.isImportDeclaration(statement) && statement.importClause) {
					if (statement.importClause.isTypeOnly) continue;
				}
			}
			const specifierNode = statement.moduleSpecifier;
			if (specifierNode && ts.isStringLiteral(specifierNode)) {
				yield specifierNode.text;
			}
		}
	}

	if (includeTypeImports) {
		for (const statement of sourceFile.statements) {
			if ("jsDoc" in statement && statement.jsDoc) {
				// @ts-ignore
				const jsDocArray = /** @type {ts.JSDocArray} */ (statement.jsDoc);
				for (const item of jsDocArray) {
					for (const node of traverseAst(item)) {
						if (ts.isImportTypeNode(node)) {
							const { argument } = node;
							if (ts.isLiteralTypeNode(argument)) {
								const { literal } = argument;
								if (ts.isLiteralExpression(literal)) {
									yield literal.text;
								}
							}
						}
					}
				}
			}
		}
	}
}
