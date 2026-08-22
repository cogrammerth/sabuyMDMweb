export type PixelFrame = "idle" | "idle2" | "type1" | "type2" | "sip";

/** Palette keys used in sprite strings. */
export const PIXEL: Record<string, string> = {
  ".": "transparent",
  "#": "#140c08",
  s: "#f3c29a",
  h: "#1a1208",
  H: "#2c1a0c",
  j: "#e23b3b",
  d: "#b01018",
  w: "#f6eed8",
  e: "#fff8ee",
  p: "#24366a",
  o: "#ece4d0",
  c: "#6b3a18",
  k: "#c45a20",
  n: "#3a2418",
};

export const JERSEY: Record<string, { fill: string; dark: string }> = {
  orchestrator: { fill: "#e23b3b", dark: "#b01018" },
  backend: { fill: "#3b6fe2", dark: "#1e3fa8" },
  frontend: { fill: "#3bc46a", dark: "#1d8a42" },
  tester: { fill: "#e28a3b", dark: "#b85a12" },
  security: { fill: "#7b3be2", dark: "#4c1aa0" },
};

const IDLE: string[] = [
  "...h.h.h........",
  "..hhhhhhh.......",
  ".hhhhhhhhh......",
  ".hh#eee#hh......",
  ".h#essse#h......",
  "..#sssss#.......",
  "...#sss#........",
  "...#nnn#........",
  "..#jjjjj#.......",
  ".#jjsssjj#......",
  "#jjjsssjjj#.....",
  "#jjjjdjjjj#.....",
  ".#ppppppp#......",
  "..#oo#oo#.......",
  "...##.##........",
];

const IDLE2: string[] = [
  "....h.h.........",
  "...hhhhh........",
  "..hhhhhhh.......",
  ".hh#eee#hh......",
  ".h#essse#h......",
  "..#sssss#.......",
  "...#sss#........",
  "...#nnn#........",
  "..#jjjjj#.......",
  ".#jjsssjj#......",
  "#jjjsssjjj#.....",
  "#jjjjdjjjj#.....",
  ".#ppppppp#......",
  "..#oo#oo#.......",
  "...##.##........",
];

const TYPE1: string[] = [
  "...h.h.h........",
  "..hhhhhhh.......",
  ".hhhhhhhhh......",
  ".hh#eee#hh......",
  ".h#essse#h......",
  "..#sssss#.......",
  "...#sss#........",
  "...#nnn#........",
  "..#jjjjj#.......",
  "#ssjjsssjj......",
  "#ssjjdjjj#......",
  ".#jjjjjjj#......",
  ".#ppppppp#......",
  "..#oo#oo#.......",
  "...##.##........",
];

const TYPE2: string[] = [
  "...h.h.h........",
  "..hhhhhhh.......",
  ".hhhhhhhhh......",
  ".hh#eee#hh......",
  ".h#essse#h......",
  "..#sssss#.......",
  "...#sss#........",
  "...#nnn#........",
  "..#jjjjj#.......",
  "..#jjsssjjss#...",
  ".#jjjdjjjss#....",
  ".#jjjjjjj#......",
  ".#ppppppp#......",
  "..#oo#oo#.......",
  "...##.##........",
];

const SIP: string[] = [
  "...h.h.h........",
  "..hhhhhhh.......",
  ".hhhhhhhhh......",
  ".hh#eee#hh..#c#.",
  ".h#essse#h.#ckc#",
  "..#sssss#...#c#.",
  "...#sss#...ss...",
  "...#nnn#..ss....",
  "..#jjjjj#ss.....",
  ".#jjsssjj#......",
  "#jjjsssjjj#.....",
  "#jjjjdjjjj#.....",
  ".#ppppppp#......",
  "..#oo#oo#.......",
  "...##.##........",
];

export const FRAMES: Record<PixelFrame, string[]> = {
  idle: IDLE,
  idle2: IDLE2,
  type1: TYPE1,
  type2: TYPE2,
  sip: SIP,
};

export const DESK_LAYOUT: Record<
  string,
  { x: number; y: number; monitor: string }
> = {
  orchestrator: { x: 152, y: 52, monitor: "#e23b3b" },
  backend: { x: 18, y: 108, monitor: "#5aa0ff" },
  frontend: { x: 86, y: 108, monitor: "#7dff9a" },
  tester: { x: 186, y: 108, monitor: "#ffc06a" },
  security: { x: 254, y: 108, monitor: "#c89bff" },
};

export const SCENE = { width: 320, height: 180, scale: 3 };
