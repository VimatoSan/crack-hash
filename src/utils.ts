import {XMLParser} from "fast-xml-parser";

export function parseXML(xml: string): any {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    parseAttributeValue: true,
    parseTagValue: true
  });
  const obj = parser.parse(xml);
  return obj;
}

export function* permutations<T>(
  arr: readonly T[],
  k: number
): IterableIterator<readonly T[]> {
  if (!Number.isInteger(k)) throw new TypeError('k must be an integer');
  if (k < 0) throw new RangeError('k must be >= 0');

  const n = arr.length;
  if (k === 0) {
    yield [] as readonly T[];
    return;
  }
  if (n === 0) {
    return;
  }

  const buffer: T[] = [];

  function* backtrack(): IterableIterator<readonly T[]> {
    if (buffer.length === k) {
      yield buffer.slice() as readonly T[];
      return;
    }
    for (let i = 0; i < n; i++) {
      const val = arr[i]!;
      buffer.push(val);
      yield* backtrack();
      buffer.pop();
    }
  }

  yield* backtrack();
}
