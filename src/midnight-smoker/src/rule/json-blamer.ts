import {memoize} from '#util/decorator';
import {
  type ArrayNode,
  type DocumentNode,
  type ElementNode,
  evaluate,
  type JSONValue,
  type MemberNode,
  type Node,
  type ObjectNode,
  parse,
} from '@humanwhocodes/momoa';
import chalk from 'chalk';
import {isString, max, toPath} from 'lodash';
import path from 'node:path';
import stringWidth from 'string-width';
import stripAnsi from 'strip-ansi';

import {JSONLocation} from './json-location.js';

type ContainerNode = DocumentNode | ElementNode | MemberNode;

export type JSONBlamerResult = {
  filepath: string;
  keypath: string;
  loc: JSONLocation;
  value: JSONValue;
};
type ValueNode = ArrayNode | ObjectNode;

export class JSONBlamer {
  private node?: DocumentNode;

  constructor(
    public readonly json: string,
    public readonly jsonPath: string,
  ) {}

  @memoize()
  public find(keypath: string): JSONBlamerResult | undefined {
    const path = isString(keypath) ? toPath(keypath) : keypath;

    if (!keypath || !path.length) {
      return;
    }

    const root = (this.node ??= parse(this.json));

    /**
     * This reducer walks down from a root JSON AST Node to the target node
     * specified by the keypath.
     */
    const found = path.reduce<ContainerNode | undefined>((node, pathItem) => {
      if (!node) {
        return;
      }

      // we will have difft behavior depending on whether the keypath item is a
      // number (since that means it's an array index)
      const numericItem = Number.parseInt(pathItem, 10);
      const isNumeric = !Number.isNaN(numericItem);

      // a DocumentNode is the root of the AST, and it's slightly different than
      // the other container node types. but most nodes we're going to see are
      // not DocumentNodes, so we can check those first.
      const valueNode = valueOf(node) ?? valueOfDocument(node);

      if (isNumeric) {
        // if we have an array index, we just grab the item out of the
        // ElementNode[] by the index
        return findElement(numericItem, valueNode);
      }
      // if we have a string key, we have to go looking for it in the
      // MemberNode[] array
      return findMember(pathItem, valueNode);
    }, root);

    if (found) {
      const loc = new JSONLocation(
        this.jsonPath,
        found.loc.start,
        found.loc.end,
      );
      const keypath = toKeypath(path);
      const value = evaluate(getValue(found));

      return {
        filepath: this.jsonPath,
        keypath,
        loc,
        value,
      };
    }
  }

  public async getContext(
    result: JSONBlamerResult,
    options: {before: number} = {before: 2},
  ): Promise<string> {
    const {common, createEmphasize} = await import('emphasize');
    const emphasize = createEmphasize({json: common.json});

    const highlighted = emphasize.highlight('json', this.json).value;

    const {before} = options;
    const lines = highlighted.split('\n');
    const startLine = Math.max(result.loc.start.line - 1 - before, 0);
    const endLine = result.loc.end.line;

    const maxLineNumberLength = `${endLine}`.length;
    let contextLines = lines.slice(startLine, endLine).join('\n');

    if (result.loc.start.line === result.loc.end.line) {
      const line = stripAnsi(lines[result.loc.start.line - 1]);
      const highlightedLine =
        line.slice(0, result.loc.start.column - 1) +
        chalk.bgRed.white(
          line.slice(result.loc.start.column - 1, result.loc.end.column),
        ) +
        line.slice(result.loc.end.column);
      contextLines =
        lines.slice(startLine, result.loc.start.line - 1).join('\n') +
        '\n' +
        highlightedLine;
    }

    contextLines = contextLines
      .split('\n')
      .map((line, idx) => {
        const lineNumber = chalk.dim(
          `${startLine + idx + 1}:`.padStart(maxLineNumberLength),
        );
        return `${lineNumber} ${line}`;
      })
      .join('\n');
    const maxLineLength =
      max(contextLines.split('\n').map((line) => stringWidth(line))) ?? 40;
    const title =
      `— ${path.basename(result.filepath)} `.padEnd(maxLineLength - 1, '—') +
      '✂';
    const titleLength = stringWidth(title);
    console.error(maxLineLength - titleLength);
    contextLines =
      title + '\n' + contextLines + '\n' + '—'.repeat(maxLineLength - 1) + '✂';
    return `\n${contextLines}`;
  }
}

/**
 * Finds an {@link ElementNode} at the given index in an {@link ArrayNode}.
 *
 * @param index Array index
 * @param valueNode {@link ArrayNode} (if successful)
 * @returns The {@link ElementNode} at the given index
 */
function findElement(
  index: number,
  valueNode?: ValueNode,
): ElementNode | undefined {
  if (valueNode?.type === ARRAY) {
    return valueNode.elements[index];
  }
}

/**
 * Finds a member in an "Object"-type {@link ValueNode} by its key.
 *
 * @param key - The key of the member to find.
 * @param valueNode - The value node to search in.
 * @returns The found member node, or undefined if not found.
 */
function findMember(
  key: string,
  valueNode?: ValueNode,
): MemberNode | undefined {
  if (valueNode?.type === OBJECT)
    return valueNode.members.find(
      (member) => member.name.type === STRING && member.name.value === key,
    );
}

/**
 * Gets the value node (in `momoa` parlance; **not** {@link ValueNode}) of a
 * container node.
 *
 * @param node Container Node
 * @returns The value node
 */
function getValue(node: ContainerNode) {
  return node.type === DOCUMENT ? node.body : node.value;
}

/**
 * Checks if a given {@link Node} is a {@link ValueNode}.
 *
 * @param node - The `Node` to check.
 * @returns `true` if it's a `ValueNode`
 */
function isValueNode(node: Node): node is ValueNode {
  return node.type === OBJECT || node.type === ARRAY;
}

/**
 * Converts a keypath array to a keypath string.
 *
 * @param path Components of keypath
 * @returns Normalized keypath
 */
function toKeypath(path: string[]) {
  return path.join('.');
}

/**
 * Retrieves the value node of a non-"Document"-type container node.
 *
 * @param node - The container node to retrieve the value node from.
 * @returns The value node if it exists, otherwise undefined.
 */
function valueOf(node?: ContainerNode): undefined | ValueNode {
  if (
    (node?.type === MEMBER || node?.type === ELEMENT) &&
    isValueNode(node.value)
  ) {
    return node.value;
  }
}

/**
 * Retrieves the value node of a document container node.
 *
 * @param node - The container node to retrieve the value node from.
 * @returns The value node if it exists, otherwise undefined.
 */
function valueOfDocument(node?: ContainerNode): undefined | ValueNode {
  if (node?.type === DOCUMENT && isValueNode(node.body)) {
    return node.body;
  }
}

const DOCUMENT = 'Document';
const ELEMENT = 'Element';
const MEMBER = 'Member';
const STRING = 'String';
const OBJECT = 'Object';
const ARRAY = 'Array';
