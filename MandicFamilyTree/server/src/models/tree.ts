import { getChildIds, getPerson } from "./people";
import type { PersonApiShape } from "./people";

export interface PersonNode {
  name: string;
  attributes: PersonApiShape;
  children?: PersonNode[];
}

/**
 * Walks the relationships table from `rootId` down through offspring,
 * matching the shape the frontend already builds client-side in
 * src/data/mockDatabase.tsx (buildPersonNode). `visited` guards against
 * cycles in the data (e.g. a bad remarriage loop) and `maxDepth` is a
 * hard safety cap.
 */
export function buildTree(rootId: number, maxDepth = 30): PersonNode | undefined {
  const visited = new Set<number>();

  function build(id: number, depth: number): PersonNode | undefined {
    if (visited.has(id) || depth > maxDepth) return undefined;
    visited.add(id);

    const person = getPerson(id);
    if (!person) return undefined;

    const node: PersonNode = {
      name: `${person.firstName} ${person.lastName}`.trim(),
      attributes: person,
    };

    const children = getChildIds(id)
      .map((childId) => build(childId, depth + 1))
      .filter((child): child is PersonNode => Boolean(child));

    if (children.length > 0) node.children = children;
    return node;
  }

  return build(rootId, 0);
}
