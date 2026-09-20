import { strict as assert } from "node:assert";
import test from "node:test";
import { leaderLine, placeCard, type Box } from "../../../src/components/self-guided/routeLayout.ts";

const frame = { width: 1200, height: 923 };
const card = { width: 246, height: 224 };
/** A diagonal walk across the frame, like the real one. */
const route: [number, number][] = Array.from({ length: 40 }, (_, i) => [200 + i * 18, 800 - i * 16]);
const opts = { frame, card, route };

const covers = (b: Box, pts: [number, number][]) =>
  pts.some(([x, y]) => x >= b.left && x <= b.left + b.width && y >= b.top && y <= b.top + b.height);
const hits = (a: Box, b: Box) =>
  a.left < b.left + b.width && a.left + a.width > b.left && a.top < b.top + b.height && a.top + a.height > b.top;

test("placeCard keeps every card inside the frame", () => {
  const taken: Box[] = [];
  for (const p of [[250, 780], [400, 620], [700, 380], [980, 180]] as [number, number][]) {
    const box = placeCard(p, taken, opts);
    assert.ok(box.left >= 0 && box.left + box.width <= frame.width, `left ${box.left}`);
    assert.ok(box.top >= 0 && box.top + box.height <= frame.height, `top ${box.top}`);
    taken.push(box);
  }
});

test("placeCard never stacks two cards, even for points sitting on top of each other", () => {
  const taken: Box[] = [];
  for (const p of [[300, 700], [320, 710], [340, 690], [310, 720]] as [number, number][]) {
    const box = placeCard(p, taken, opts);
    for (const other of taken) assert.ok(!hits(box, other), "two cards overlap");
    taken.push(box);
  }
});

test("placeCard prefers a spot clear of the walk", () => {
  // a point sitting right on the line: the card has to step off it
  const box = placeCard([560, 480], [], opts);
  assert.ok(!covers(box, route), "the card sits on the route it illustrates");
});

test("leaderLine touches the card and starts at the dot", () => {
  const box: Box = { left: 400, top: 300, width: 246, height: 224 };
  const l = leaderLine([200, 500], box);
  assert.deepEqual([l.x1, l.y1], [200, 500]);
  assert.equal(l.x2, 400);            // clamped onto the near edge
  assert.ok(l.y2 >= 300 && l.y2 <= 524);
});
