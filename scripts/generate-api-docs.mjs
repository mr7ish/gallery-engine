// @ts-check
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { format } from "prettier";
import * as ts from "typescript";

/**
 * @typedef {object} PackageInfo
 * @property {string} name
 * @property {string} slug
 * @property {string} entry
 */

/**
 * @typedef {object} ApiExport
 * @property {string} name
 * @property {string} kind
 * @property {string} source
 * @property {string} description
 * @property {string} signature
 */

/**
 * @typedef {PackageInfo & {
 *   readonly exports: readonly ApiExport[];
 *   readonly content: string;
 * }} PackagePage
 */

const workspaceRoot = fileURLToPath(new URL("..", import.meta.url));
const generatedDir = path.join(workspaceRoot, "docs", "api", "generated");
/** @type {readonly PackageInfo[]} */
const packages = [
  {
    name: "@gallery-engine/core",
    slug: "core",
    entry: "packages/core/src/index.ts"
  },
  {
    name: "@gallery-engine/layouts",
    slug: "layouts",
    entry: "packages/layouts/src/index.ts"
  },
  {
    name: "@gallery-engine/animations",
    slug: "animations",
    entry: "packages/animations/src/index.ts"
  },
  {
    name: "@gallery-engine/preview",
    slug: "preview",
    entry: "packages/preview/src/index.ts"
  },
  {
    name: "@gallery-engine/plugins",
    slug: "plugins",
    entry: "packages/plugins/src/index.ts"
  },
  {
    name: "@gallery-engine/shared",
    slug: "shared",
    entry: "packages/shared/src/index.ts"
  }
];

const rootNames = packages.map((packageInfo) => path.join(workspaceRoot, packageInfo.entry));
const program = ts.createProgram({
  rootNames,
  options: {
    allowJs: false,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    noEmit: true,
    skipLibCheck: true,
    strict: true,
    target: ts.ScriptTarget.ES2022
  }
});
const checker = program.getTypeChecker();

await rm(generatedDir, {
  recursive: true,
  force: true
});
await mkdir(generatedDir, {
  recursive: true
});

const packagePages = packages.map((packageInfo) => generatePackagePage(packageInfo));
await Promise.all(
  packagePages.map((page) =>
    writeMarkdown(path.join(generatedDir, `${page.slug}.md`), page.content)
  )
);
await writeMarkdown(path.join(generatedDir, "index.md"), generateIndexPage(packagePages));

/**
 * @param {string} filePath
 * @param {string} content
 * @returns {Promise<void>}
 */
async function writeMarkdown(filePath, content) {
  const formattedContent = await format(content, {
    parser: "markdown",
    printWidth: 100,
    semi: true,
    singleQuote: false,
    trailingComma: "none"
  });
  await writeFile(filePath, formattedContent, "utf8");
}

/**
 * @param {PackageInfo} packageInfo
 * @returns {PackagePage}
 */
function generatePackagePage(packageInfo) {
  const sourceFile = program.getSourceFile(path.join(workspaceRoot, packageInfo.entry));

  if (!sourceFile) {
    throw new Error(`Missing source file: ${packageInfo.entry}`);
  }

  const moduleSymbol = checker.getSymbolAtLocation(sourceFile);

  if (!moduleSymbol) {
    throw new Error(`Missing module symbol: ${packageInfo.entry}`);
  }

  const exports = checker
    .getExportsOfModule(moduleSymbol)
    .filter((symbol) => symbol.name !== "default")
    .map((symbol) => describeSymbol(symbol))
    .sort((left, right) => left.name.localeCompare(right.name));

  return {
    ...packageInfo,
    exports,
    content: renderPackagePage(packageInfo, exports)
  };
}

/**
 * @param {ts.Symbol} symbol
 * @returns {ApiExport}
 */
function describeSymbol(symbol) {
  const aliasedSymbol = isAlias(symbol) ? checker.getAliasedSymbol(symbol) : symbol;
  const declarations = aliasedSymbol.getDeclarations() ?? symbol.getDeclarations() ?? [];
  const declaration = declarations[0];

  if (!declaration) {
    return {
      name: symbol.name,
      kind: "Unknown",
      source: "unknown",
      description: "-",
      signature: `export const ${symbol.name}: unknown;`
    };
  }

  const source = toWorkspacePath(declaration.getSourceFile().fileName);
  const aliasedDocs = aliasedSymbol.getDocumentationComment(checker);
  const description = ts.displayPartsToString(
    aliasedDocs.length > 0 ? aliasedDocs : symbol.getDocumentationComment(checker)
  );

  return {
    name: symbol.name,
    kind: resolveDeclarationKind(declaration),
    source,
    description: description || "-",
    signature: renderSignature(aliasedSymbol, declaration)
  };
}

/**
 * @param {ts.Symbol} symbol
 * @returns {boolean}
 */
function isAlias(symbol) {
  return (symbol.flags & ts.SymbolFlags.Alias) !== 0;
}

/**
 * @param {ts.Declaration} declaration
 * @returns {string}
 */
function resolveDeclarationKind(declaration) {
  if (ts.isClassDeclaration(declaration)) {
    return "Class";
  }

  if (ts.isInterfaceDeclaration(declaration)) {
    return "Interface";
  }

  if (ts.isTypeAliasDeclaration(declaration)) {
    return "Type";
  }

  if (ts.isFunctionDeclaration(declaration)) {
    return "Function";
  }

  if (ts.isVariableDeclaration(declaration)) {
    return "Constant";
  }

  if (ts.isEnumDeclaration(declaration)) {
    return "Enum";
  }

  return ts.SyntaxKind[declaration.kind];
}

/**
 * @param {ts.Symbol} symbol
 * @param {ts.Declaration} declaration
 * @returns {string}
 */
function renderSignature(symbol, declaration) {
  if (ts.isClassDeclaration(declaration)) {
    return renderClassSignature(declaration);
  }

  if (ts.isInterfaceDeclaration(declaration) || ts.isTypeAliasDeclaration(declaration)) {
    return declaration.getText(declaration.getSourceFile());
  }

  if (ts.isFunctionDeclaration(declaration)) {
    const signature = checker.getSignatureFromDeclaration(declaration);
    const returnType = signature
      ? checker.typeToString(checker.getReturnTypeOfSignature(signature))
      : "unknown";
    return `export function ${symbol.name}(${renderParameters(declaration.parameters)}): ${returnType};`;
  }

  if (ts.isVariableDeclaration(declaration)) {
    const type = checker.typeToString(checker.getTypeOfSymbolAtLocation(symbol, declaration));
    return `export const ${symbol.name}: ${type};`;
  }

  if (ts.isEnumDeclaration(declaration)) {
    return declaration.getText(declaration.getSourceFile());
  }

  return declaration.getText(declaration.getSourceFile());
}

/**
 * @param {ts.ClassDeclaration} declaration
 * @returns {string}
 */
function renderClassSignature(declaration) {
  const name = declaration.name?.getText(declaration.getSourceFile()) ?? "AnonymousClass";
  const members = declaration.members
    .filter((member) => isPublicMember(member))
    .map((member) => renderClassMember(member))
    .filter((member) => member.length > 0);

  if (members.length === 0) {
    return `export class ${name} {}`;
  }

  return [`export class ${name} {`, ...members.map((member) => `  ${member}`), "}"].join("\n");
}

/**
 * @param {ts.ClassElement} member
 * @returns {boolean}
 */
function isPublicMember(member) {
  const modifiers = ts.canHaveModifiers(member) ? ts.getModifiers(member) : undefined;
  return !modifiers?.some(
    (modifier) =>
      modifier.kind === ts.SyntaxKind.PrivateKeyword ||
      modifier.kind === ts.SyntaxKind.ProtectedKeyword
  );
}

/**
 * @param {ts.ClassElement} member
 * @returns {string}
 */
function renderClassMember(member) {
  if (ts.isConstructorDeclaration(member)) {
    return `constructor(${renderParameters(member.parameters)});`;
  }

  if (ts.isMethodDeclaration(member)) {
    const name = member.name.getText(member.getSourceFile());
    const signature = checker.getSignatureFromDeclaration(member);
    const returnType = signature
      ? checker.typeToString(checker.getReturnTypeOfSignature(signature))
      : "unknown";
    return `${name}(${renderParameters(member.parameters)}): ${returnType};`;
  }

  if (ts.isPropertyDeclaration(member)) {
    const modifiers = ts.canHaveModifiers(member) ? ts.getModifiers(member) : undefined;
    const readonlyPrefix = modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.ReadonlyKeyword
    )
      ? "readonly "
      : "";
    const name = member.name.getText(member.getSourceFile());
    const type = checker.typeToString(checker.getTypeAtLocation(member));
    return `${readonlyPrefix}${name}: ${type};`;
  }

  return "";
}

/**
 * @param {readonly ts.ParameterDeclaration[]} parameters
 * @returns {string}
 */
function renderParameters(parameters) {
  return parameters
    .map((parameter) => {
      const name = parameter.name.getText(parameter.getSourceFile());
      const optional = parameter.questionToken ? "?" : "";
      const type = checker.typeToString(checker.getTypeAtLocation(parameter));
      return `${name}${optional}: ${type}`;
    })
    .join(", ");
}

/**
 * @param {PackageInfo} packageInfo
 * @param {readonly ApiExport[]} exports
 * @returns {string}
 */
function renderPackagePage(packageInfo, exports) {
  const tableRows = exports
    .map(
      (item) =>
        `| \`${item.name}\` | ${item.kind} | \`${item.source}\` | ${escapeTableCell(item.description)} |`
    )
    .join("\n");
  const signatures = exports
    .map((item) =>
      [
        `### ${item.name}`,
        "",
        `Source: \`${item.source}\``,
        "",
        "```ts",
        item.signature,
        "```"
      ].join("\n")
    )
    .join("\n\n");

  return [
    `# ${packageInfo.name} API`,
    "",
    "This file is generated by `pnpm docs:api`. Do not edit it by hand.",
    "",
    "## Export Summary",
    "",
    "| Export | Kind | Source | Description |",
    "| --- | --- | --- | --- |",
    tableRows,
    "",
    "## Signatures",
    "",
    signatures,
    ""
  ].join("\n");
}

/**
 * @param {readonly PackagePage[]} packagePages
 * @returns {string}
 */
function generateIndexPage(packagePages) {
  const links = packagePages
    .map(
      (page) => `- [${page.name}](./${page.slug}.md): ${String(page.exports.length)} named exports`
    )
    .join("\n");

  return [
    "# Generated API Reference",
    "",
    "This directory is generated by `pnpm docs:api` from package entrypoints.",
    "",
    links,
    ""
  ].join("\n");
}

/**
 * @param {string} value
 * @returns {string}
 */
function escapeTableCell(value) {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

/**
 * @param {string} fileName
 * @returns {string}
 */
function toWorkspacePath(fileName) {
  return path.relative(workspaceRoot, fileName).replace(/\\/g, "/");
}
