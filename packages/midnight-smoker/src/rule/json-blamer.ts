import {InvalidArgError} from '#error/invalid-arg-error';
import {SmokerReferenceError} from '#error/smoker-reference-error';
import {memoize} from '#util/decorator';
import {NL} from '#util/format';
import {isString} from '#util/guard/common';
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
import {max, toPath} from 'lodash';
import path from 'node:path';
import stringWidth from 'string-width';
import stripAnsi from 'strip-ansi';

import {JSONLocation} from './json-location';

/**
 * A {@link Node} which can contain one or more {@link ValueNode ValueNodes}.
 */
type ContainerNode = DocumentNode | ElementNode | MemberNode;

/**
 * The result of a successful call to {@link JSONBlamer.find}.
 */
export type BlameInfo = {
  /**
   * Filepath of JSON file
   */
  filepath: string;

  /**
   * Normalized original keypath
   *
   * @privateRemarks
   * It might be worthwhile to type this using template literal types--at least
   * so a user could discover they are using keypaths incorrectly.
   */
  keypath: string;

  /**
   * Location information of the value in the JSON file
   */
  loc: JSONLocation;

  /**
   * Evaluated value at the keypath (good for cross-checking)
   */
  value: JSONValue;
};

/**
 * A {@link ValueNode} which can contain members or elements
 */
type ValueNode = ArrayNode | ObjectNode;

export class JSONBlamer {
  /**
   * Root {@link DocumentNode} of the AST
   */
  private node?: DocumentNode;

  /**
   * Sets some props
   *
   * @param json Raw JSON
   * @param jsonPath Path to JSON file
   */
  constructor(
    public readonly json: string,

    public readonly jsonPath: string,
  ) {}

  /**
   * Applies ANSI syntax highlighting to {@link JSONBlamer.json}.
   *
   * @privateRemarks
   * I do not like that this is async. Maybe I should find a different dep to
   * help
   * @returns Syntax-highlighted JSON
   */
  @memoize()
  private async highlight() {
    const emphasize = await import('emphasize');
    return emphasize
      .createEmphasize({json: emphasize.common.json!})
      .highlight('json', this.json).value;
  }

  /**
   * Attempts to find the location of a key or element in a JSON file using a
   * keypath.
   *
   * @privateRemarks
   * I'm not sure what {@link evaluate} is doing under the hood, and I should be
   * sure.
   * @param keypath A keypath contains obj keys or array indices delimited by
   *   `.`. Indices can also be expressed using `[n]`
   * @returns If found, a {@link BlameInfo} object containing juicy bits of
   *   information
   */
  @memoize()
  public find(keypath: string): BlameInfo | undefined {
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
      // normalize it
      const keypath = toKeypath(path);
      // get the actual value at the keypath
      const value = evaluate(getValue(found));

      return {
        filepath: this.jsonPath,
        keypath,
        loc,
        value,
      };
    }
  }

  /**
   * Creates a string for presentation in the console that shows the location
   * described by `blameInfo`.
   *
   * The string contains two (2) lines of context above the location. It also
   * contains line numbers.
   *
   * @remarks
   * The `memoize` resolver must consider a missing arg if we want to throw an
   * {@link InvalidArgError}, b/c the resolver is always run before every
   * function call.
   * @param blameInfo A {@link BlameInfo} object returned from
   *   {@link JSONBlamer.find}
   * @returns A nice thing to print to the console
   */
  @memoize((result: BlameInfo) => `${result?.loc}`)
  public async getContext(blameInfo: BlameInfo): Promise<string> {
    if (!blameInfo) {
      throw new InvalidArgError('blameInfo is required', {
        argName: 'blameInfo',
        position: 0,
      });
    }
    const highlighted = await this.highlight();

    /**
     * Number of lines of context to appear before the highlighted line
     */
    const before = 2;
    const lines = highlighted.split('\n');
    const startLine = Math.max(blameInfo.loc.start.line - 1 - before, 0);
    const endLine = blameInfo.loc.end.line;

    const maxLineNumberLength = `${endLine}`.length;

    let contextLines: string[];

    // TODO: Highlighting only works when it's a single line. Determine how to
    // display multi-line highlights in a way that's not ugly or huge (just use
    // the start line?).
    if (blameInfo.loc.start.line === blameInfo.loc.end.line) {
      let line = lines[blameInfo.loc.start.line - 1];
      if (!line) {
        throw new SmokerReferenceError(
          'Unexpected start line not found in BlameInfo',
          blameInfo,
        );
      }
      line = stripAnsi(line);
      const highlightedLine =
        line.slice(0, blameInfo.loc.start.column - 1) +
        chalk.bgRed.white(
          line.slice(blameInfo.loc.start.column - 1, blameInfo.loc.end.column),
        ) +
        line.slice(blameInfo.loc.end.column);
      contextLines = [
        ...lines.slice(startLine, blameInfo.loc.start.line - 1),
        highlightedLine,
      ];
    } else {
      const strippedLines = lines
        .slice(blameInfo.loc.start.line - 1, blameInfo.loc.end.line)
        .map(stripAnsi);
      const maxCol = max(strippedLines.map(stringWidth))!;
      contextLines = [
        ...lines.slice(startLine, blameInfo.loc.start.line - 1),
        ...strippedLines.map((line, idx) => {
          if (idx === 0) {
            return (
              line.slice(0, blameInfo.loc.start.column - 1) +
              chalk.bgRed.white(
                line.slice(blameInfo.loc.start.column - 1, maxCol),
              )
            );
          }
          if (idx === strippedLines.length - 1) {
            return (
              chalk.bgRed.white(line.slice(0, blameInfo.loc.end.column)) +
              line.slice(blameInfo.loc.end.column)
            );
          }
          return chalk.bgRed.white(line);
        }),
      ];
    }

    contextLines = contextLines.map((line, idx) => {
      const lineNumber = chalk.dim(
        `${startLine + idx + 1}:`.padStart(maxLineNumberLength),
      );
      return `${lineNumber} ${line}`;
    });
    const maxLineLength =
      max(contextLines.map((line) => stringWidth(line))) ?? 40;
    contextLines = [
      `${`— ${path.basename(blameInfo.filepath)} `.padEnd(
        maxLineLength - 1,
        '—',
      )}✂`,
      ...contextLines,
      `${'—'.padEnd(maxLineLength - 1, '—')}✂`,
    ];
    return `${contextLines.join(NL)}`;
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
 * This is basically any RHS of an object key or an array element.
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
function toKeypath(path: string[]): string {
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

// constants for fat fingers
const DOCUMENT = 'Document';
const ELEMENT = 'Element';
const MEMBER = 'Member';
const STRING = 'String';
const OBJECT = 'Object';
const ARRAY = 'Array';
