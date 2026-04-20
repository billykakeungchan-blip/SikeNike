const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const phaseTextEl = document.getElementById('phase-text');
const timerEl = document.getElementById('timer');
const instructionTextEl = document.getElementById('instruction-text');
const overlayEl = document.getElementById('overlay');
const startScreenEl = document.getElementById('start-screen');
const turnScreenEl = document.getElementById('turn-screen');
const endScreenEl = document.getElementById('end-screen');
const turnTitleEl = document.getElementById('turn-title');
const turnMessageEl = document.getElementById('turn-message');
const continueBtnEl = document.getElementById('continue-btn');
const endTitleEl = document.getElementById('end-title');
const endMessageEl = document.getElementById('end-message');
const lockBtnEl = document.getElementById('lock-btn');
const playerStatusEl = document.getElementById('player-status');
const playerCountEl = document.getElementById('player-count');
const keyboardCaptureEl = document.getElementById('keyboard-capture');
const controlsEl = document.getElementById('controls');
const levelIndicatorEl = document.getElementById('level-indicator');
const isTouchDevice = typeof window !== 'undefined' && (
  'ontouchstart' in window ||
  (navigator.maxTouchPoints || 0) > 0 ||
  window.matchMedia('(pointer: coarse)').matches
);

const TILE_SIZE = 32;
const MAP_WIDTH = 34;
const MAP_HEIGHT = 22;
const CANVAS_WIDTH = MAP_WIDTH * TILE_SIZE;
const CANVAS_HEIGHT = MAP_HEIGHT * TILE_SIZE;

const HIDE_TURN_DURATION = 30;
const SEEK_PHASE_DURATION = 180;
const HIDER_SPEED = 180;
const SEEKER_SPEED = 160;
const CATCH_RANGE = 35;
const HIDER_COLORS = ['#1d4ed8', '#16a34a', '#facc15', '#7e22ce'];
const SEEKER_DEBUG_LOG_LIMIT = 250;

const seekerDebug = {
  enabled: true,
  events: []
};

if (typeof window !== 'undefined') {
  window.sikeNikeDebug = seekerDebug;
  window.clearSikeNikeDebug = () => {
    seekerDebug.events.length = 0;
  };
  window.getSikeNikeDebugNearSeekTime = (secondsRemaining, tolerance = 3) =>
    seekerDebug.events.filter((event) =>
      event.seekSecondsRemaining != null &&
      Math.abs(event.seekSecondsRemaining - secondsRemaining) <= tolerance
    );
}

const DEFAULT_CORRIDORS = [
  { type: 'h', x1: 6, x2: 28, y: 8, width: 2 },
  { type: 'h', x1: 6, x2: 28, y: 16, width: 2 },
  { type: 'v', x: 10, y1: 6, y2: 18, width: 2 },
  { type: 'v', x: 22, y1: 6, y2: 18, width: 2 },
  { type: 'v', x: 28, y1: 6, y2: 18, width: 2 },
  { type: 'h', x1: 2, x2: 10, y: 10, width: 2 },
  { type: 'h', x1: 22, x2: 31, y: 10, width: 2 }
];

const BASEMENT_CORRIDORS = [
  { type: 'h', x1: 6, x2: 28, y: 8, width: 3 },
  { type: 'h', x1: 6, x2: 28, y: 15, width: 3 },
  { type: 'v', x: 10, y1: 6, y2: 18, width: 3 },
  { type: 'v', x: 22, y1: 6, y2: 18, width: 3 },
  { type: 'v', x: 27, y1: 6, y2: 18, width: 3 },
  { type: 'h', x1: 2, x2: 11, y: 10, width: 3 },
  { type: 'h', x1: 21, x2: 31, y: 10, width: 3 }
];

const LEVEL_DEFS = [
  {
    name: 'Basement 2',
    rooms: [
      { x: 2, y: 2, w: 6, h: 5 },
      { x: 9, y: 2, w: 6, h: 5 },
      { x: 16, y: 2, w: 6, h: 5 },
      { x: 24, y: 2, w: 8, h: 5 },
      { x: 3, y: 12, w: 7, h: 5 },
      { x: 13, y: 12, w: 8, h: 5 },
      { x: 24, y: 12, w: 7, h: 5 }
    ],
    obstacles: [
      { x: 5, y: 4, w: 1, h: 2 },
      { x: 3, y: 5, w: 2, h: 1 },
      { x: 12, y: 4, w: 1, h: 2 },
      { x: 10, y: 5, w: 2, h: 1 },
      { x: 19, y: 4, w: 1, h: 2 },
      { x: 17, y: 5, w: 2, h: 1 },
      { x: 28, y: 4, w: 2, h: 1 },
      { x: 25, y: 5, w: 2, h: 1 },
      { x: 6, y: 14, w: 2, h: 1 },
      { x: 4, y: 13, w: 1, h: 2 },
      { x: 17, y: 14, w: 1, h: 2 },
      { x: 15, y: 13, w: 2, h: 1 },
      { x: 27, y: 14, w: 1, h: 2 },
      { x: 25, y: 13, w: 2, h: 1 }
    ],
    corridors: BASEMENT_CORRIDORS,
    stairs: {
      up: { rect: { x: 30, y: 10, w: 2, h: 2 }, targetLevel: 1, targetStair: 'down' }
    },
    secret: {
      roomIndex: 0,
      door: { x: 7, y: 6 },
      key: { x: 16, y: 9 },
      path: [{ type: 'v', x: 7, y1: 7, y2: 8, width: 1 }]
    },
    startRoom: 5
  },
  {
    name: 'Basement 1',
    rooms: [
      { x: 2, y: 2, w: 6, h: 5 },
      { x: 9, y: 2, w: 6, h: 5 },
      { x: 16, y: 2, w: 6, h: 5 },
      { x: 24, y: 2, w: 8, h: 5 },
      { x: 3, y: 12, w: 7, h: 5 },
      { x: 13, y: 12, w: 8, h: 5 },
      { x: 24, y: 12, w: 7, h: 5 }
    ],
    obstacles: [
      { x: 6, y: 4, w: 1, h: 2 },
      { x: 3, y: 4, w: 2, h: 1 },
      { x: 11, y: 4, w: 2, h: 1 },
      { x: 19, y: 5, w: 1, h: 2 },
      { x: 26, y: 4, w: 2, h: 1 },
      { x: 28, y: 13, w: 1, h: 2 },
      { x: 16, y: 13, w: 2, h: 1 },
      { x: 5, y: 14, w: 1, h: 2 }
    ],
    corridors: BASEMENT_CORRIDORS,
    stairs: {
      down: { rect: { x: 2, y: 10, w: 2, h: 2 }, targetLevel: 0, targetStair: 'up' },
      up: { rect: { x: 30, y: 10, w: 2, h: 2 }, targetLevel: 2, targetStair: 'down' }
    },
    secret: {
      roomIndex: 3,
      door: { x: 24, y: 6 },
      key: { x: 16, y: 9 },
      path: [{ type: 'v', x: 24, y1: 7, y2: 8, width: 1 }]
    },
    startRoom: 4
  },
  {
    name: 'Ground',
    rooms: [
      { x: 2, y: 2, w: 7, h: 6 },
      { x: 13, y: 2, w: 8, h: 5 },
      { x: 24, y: 2, w: 8, h: 6 },
      { x: 3, y: 12, w: 7, h: 5 },
      { x: 14, y: 11, w: 8, h: 6 },
      { x: 25, y: 12, w: 6, h: 5 }
    ],
    obstacles: [
      { x: 5, y: 4, w: 2, h: 1 },
      { x: 3, y: 6, w: 2, h: 1 },
      { x: 17, y: 4, w: 1, h: 2 },
      { x: 14, y: 5, w: 2, h: 1 },
      { x: 27, y: 5, w: 2, h: 1 },
      { x: 29, y: 3, w: 1, h: 2 },
      { x: 6, y: 14, w: 2, h: 1 },
      { x: 4, y: 15, w: 2, h: 1 },
      { x: 18, y: 14, w: 1, h: 2 },
      { x: 15, y: 12, w: 2, h: 1 },
      { x: 28, y: 14, w: 1, h: 2 },
      { x: 26, y: 15, w: 2, h: 1 }
    ],
    corridors: DEFAULT_CORRIDORS,
    stairs: {
      down: { rect: { x: 2, y: 10, w: 2, h: 2 }, targetLevel: 1, targetStair: 'up' },
      up: { rect: { x: 30, y: 10, w: 2, h: 2 }, targetLevel: 3, targetStair: 'down' }
    },
    secret: {
      roomIndex: 0,
      door: { x: 7, y: 7 },
      key: { x: 16, y: 9 },
      path: [{ type: 'v', x: 7, y1: 8, y2: 8, width: 1 }]
    },
    startRoom: 4
  },
  {
    name: 'Level 1',
    rooms: [
      { x: 3, y: 2, w: 8, h: 6 },
      { x: 14, y: 2, w: 8, h: 5 },
      { x: 25, y: 3, w: 6, h: 5 },
      { x: 5, y: 12, w: 8, h: 5 },
      { x: 18, y: 11, w: 10, h: 6 }
    ],
    obstacles: [
      { x: 7, y: 4, w: 1, h: 2 },
      { x: 4, y: 6, w: 2, h: 1 },
      { x: 18, y: 4, w: 1, h: 2 },
      { x: 15, y: 5, w: 2, h: 1 },
      { x: 28, y: 5, w: 1, h: 2 },
      { x: 26, y: 4, w: 1, h: 2 },
      { x: 8, y: 14, w: 2, h: 1 },
      { x: 6, y: 13, w: 1, h: 2 },
      { x: 23, y: 14, w: 1, h: 2 },
      { x: 20, y: 12, w: 2, h: 1 },
      { x: 25, y: 15, w: 1, h: 2 }
    ],
    corridors: DEFAULT_CORRIDORS,
    stairs: {
      down: { rect: { x: 2, y: 10, w: 2, h: 2 }, targetLevel: 2, targetStair: 'up' },
      up: { rect: { x: 30, y: 10, w: 2, h: 2 }, targetLevel: 4, targetStair: 'down' }
    },
    secret: {
      roomIndex: 0,
      door: { x: 8, y: 7 },
      key: { x: 16, y: 9 },
      path: [{ type: 'v', x: 8, y1: 8, y2: 8, width: 1 }]
    },
    startRoom: 3
  },
  {
    name: 'Level 2',
    rooms: [
      { x: 2, y: 2, w: 7, h: 6 },
      { x: 13, y: 2, w: 8, h: 5 },
      { x: 24, y: 2, w: 8, h: 6 },
      { x: 3, y: 12, w: 7, h: 5 },
      { x: 14, y: 11, w: 8, h: 6 },
      { x: 25, y: 12, w: 6, h: 5 }
    ],
    obstacles: [
      { x: 6, y: 4, w: 1, h: 2 },
      { x: 4, y: 6, w: 2, h: 1 },
      { x: 18, y: 4, w: 1, h: 2 },
      { x: 15, y: 4, w: 2, h: 1 },
      { x: 26, y: 5, w: 2, h: 1 },
      { x: 28, y: 3, w: 1, h: 2 },
      { x: 7, y: 14, w: 1, h: 2 },
      { x: 17, y: 14, w: 2, h: 1 },
      { x: 27, y: 14, w: 1, h: 2 }
    ],
    corridors: DEFAULT_CORRIDORS,
    stairs: {
      down: { rect: { x: 2, y: 10, w: 2, h: 2 }, targetLevel: 3, targetStair: 'up' },
      up: { rect: { x: 30, y: 10, w: 2, h: 2 }, targetLevel: 5, targetStair: 'down' }
    },
    secret: {
      roomIndex: 2,
      door: { x: 24, y: 7 },
      key: { x: 16, y: 9 },
      path: [{ type: 'v', x: 24, y1: 8, y2: 8, width: 1 }]
    },
    startRoom: 4
  },
  {
    name: 'Level 3',
    rooms: [
      { x: 3, y: 2, w: 8, h: 6 },
      { x: 14, y: 2, w: 8, h: 5 },
      { x: 25, y: 3, w: 6, h: 5 },
      { x: 5, y: 12, w: 8, h: 5 },
      { x: 18, y: 11, w: 10, h: 6 }
    ],
    obstacles: [
      { x: 8, y: 4, w: 1, h: 2 },
      { x: 5, y: 6, w: 2, h: 1 },
      { x: 19, y: 4, w: 1, h: 2 },
      { x: 16, y: 5, w: 2, h: 1 },
      { x: 27, y: 5, w: 1, h: 2 },
      { x: 26, y: 13, w: 1, h: 2 },
      { x: 8, y: 14, w: 2, h: 1 },
      { x: 21, y: 12, w: 2, h: 1 }
    ],
    corridors: DEFAULT_CORRIDORS,
    stairs: {
      down: { rect: { x: 2, y: 10, w: 2, h: 2 }, targetLevel: 4, targetStair: 'up' },
      up: { rect: { x: 30, y: 10, w: 2, h: 2 }, targetLevel: 6, targetStair: 'down' }
    },
    secret: {
      roomIndex: 4,
      door: { x: 18, y: 12 },
      key: { x: 16, y: 9 },
      path: [{ type: 'h', x1: 12, x2: 17, y: 12, width: 1 }]
    },
    startRoom: 3
  },
  {
    name: 'Level 4',
    rooms: [
      { x: 2, y: 2, w: 7, h: 6 },
      { x: 13, y: 2, w: 8, h: 5 },
      { x: 24, y: 2, w: 8, h: 6 },
      { x: 3, y: 12, w: 7, h: 5 },
      { x: 14, y: 11, w: 8, h: 6 },
      { x: 25, y: 12, w: 6, h: 5 }
    ],
    obstacles: [
      { x: 5, y: 4, w: 2, h: 1 },
      { x: 3, y: 5, w: 1, h: 2 },
      { x: 17, y: 4, w: 1, h: 2 },
      { x: 14, y: 5, w: 2, h: 1 },
      { x: 27, y: 4, w: 2, h: 1 },
      { x: 6, y: 14, w: 2, h: 1 },
      { x: 4, y: 13, w: 1, h: 2 },
      { x: 19, y: 14, w: 1, h: 2 },
      { x: 26, y: 14, w: 2, h: 1 }
    ],
    corridors: DEFAULT_CORRIDORS,
    stairs: {
      down: { rect: { x: 2, y: 10, w: 2, h: 2 }, targetLevel: 5, targetStair: 'up' },
      up: { rect: { x: 30, y: 10, w: 2, h: 2 }, targetLevel: 7, targetStair: 'down' }
    },
    secret: {
      roomIndex: 5,
      door: { x: 25, y: 13 },
      key: { x: 16, y: 9 },
      path: [{ type: 'h', x1: 23, x2: 24, y: 13, width: 1 }]
    },
    startRoom: 4
  },
  {
    name: 'Roof',
    rooms: [
      { x: 4, y: 3, w: 8, h: 6 },
      { x: 14, y: 4, w: 8, h: 6 },
      { x: 24, y: 3, w: 7, h: 7 }
    ],
    obstacles: [
      { x: 8, y: 5, w: 1, h: 2 },
      { x: 5, y: 7, w: 2, h: 1 },
      { x: 18, y: 6, w: 1, h: 2 },
      { x: 15, y: 5, w: 2, h: 1 },
      { x: 27, y: 5, w: 1, h: 2 },
      { x: 25, y: 7, w: 2, h: 1 }
    ],
    corridors: DEFAULT_CORRIDORS,
    stairs: {
      down: { rect: { x: 2, y: 10, w: 2, h: 2 }, targetLevel: 6, targetStair: 'up' }
    },
    secret: {
      roomIndex: 2,
      door: { x: 24, y: 8 },
      key: { x: 16, y: 9 },
      path: [{ type: 'h', x1: 22, x2: 23, y: 8, width: 1 }]
    },
    startRoom: 1
  }
];

let gameState = 'menu';
let phase = 'menu';
let phaseTimeLeft = HIDE_TURN_DURATION;
let lastTime = 0;
let keys = {};
let continueAction = null;
let activeHiderIndex = -1;

let levels = [];
let levelSearchPlans = [];
let hiders = [];

const seeker = {
  x: 0,
  y: 0,
  level: 2,
  radius: 9,
  collisionRadius: 7,
  vx: 0,
  vy: 0,
  searchIndex: 0,
  currentSearchLevel: 2,
  stillTimer: 0,
  targetX: 0,
  targetY: 0,
  path: [],
  pathTargetKey: '',
  prevX: 0,
  prevY: 0,
  recoveryIndex: 0,
  blockedLogCooldown: 0
};

function logSeekerEvent(type, details = {}) {
  if (!seekerDebug.enabled) return;

  const event = {
    type,
    atMs: typeof performance !== 'undefined' ? Math.round(performance.now()) : Date.now(),
    phase,
    seekSecondsRemaining: phase === 'seek' ? Math.round(Math.max(0, phaseTimeLeft)) : null,
    searchIndex: seeker.searchIndex,
    currentSearchLevel: seeker.currentSearchLevel,
    currentSearchLevelName: levels[seeker.currentSearchLevel]?.name || null,
    level: seeker.level,
    x: Math.round(seeker.x),
    y: Math.round(seeker.y),
    ...details
  };

  seekerDebug.events.push(event);
  if (seekerDebug.events.length > SEEKER_DEBUG_LOG_LIMIT) {
    seekerDebug.events.shift();
  }

  if (typeof console !== 'undefined' && typeof console.debug === 'function') {
    console.debug('[SikeNike seeker]', event);
  }
}

function initCanvas() {
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
}

function focusKeyboardCapture() {
  // Avoid forcing hidden input focus on touch devices.
  if (isTouchDevice) return;
  keyboardCaptureEl.focus();
}

function createGrid(fillValue) {
  return Array.from({ length: MAP_HEIGHT }, () => Array.from({ length: MAP_WIDTH }, () => fillValue));
}

function cloneRoom(room) {
  return { x: room.x, y: room.y, w: room.w, h: room.h };
}

function carveRect(tiles, floorTypes, rect, floorType) {
  for (let y = rect.y; y < rect.y + rect.h; y++) {
    for (let x = rect.x; x < rect.x + rect.w; x++) {
      if (x <= 0 || x >= MAP_WIDTH - 1 || y <= 0 || y >= MAP_HEIGHT - 1) continue;
      tiles[y][x] = 1;
      floorTypes[y][x] = floorType;
    }
  }
}

function carveCorridor(tiles, floorTypes, corridor) {
  if (corridor.type === 'h') {
    carveRect(tiles, floorTypes, {
      x: Math.min(corridor.x1, corridor.x2),
      y: corridor.y,
      w: Math.abs(corridor.x2 - corridor.x1) + 1,
      h: corridor.width
    }, 1);
    return;
  }

  carveRect(tiles, floorTypes, {
    x: corridor.x,
    y: Math.min(corridor.y1, corridor.y2),
    w: corridor.width,
    h: Math.abs(corridor.y2 - corridor.y1) + 1
  }, 1);
}

function getCorridorAnchors(levelDef) {
  const trunkXs = [];
  const spineYs = [];

  for (const corridor of levelDef.corridors) {
    if (corridor.type === 'v') trunkXs.push(corridor.x);
    if (corridor.type === 'h') spineYs.push(corridor.y);
  }

  return {
    trunkXs: trunkXs.length > 0 ? trunkXs : [10, 22, 28],
    spineYs: spineYs.length > 0 ? spineYs : [8, 10, 16]
  };
}

function connectRoomToNetwork(tiles, floorTypes, room, anchors) {
  const centerTileX = Math.floor(room.x + room.w / 2);
  const centerTileY = Math.floor(room.y + room.h / 2);
  const { trunkXs, spineYs } = anchors;

  const anchorX = trunkXs.reduce((best, candidate) =>
    Math.abs(candidate - centerTileX) < Math.abs(best - centerTileX) ? candidate : best
  );
  const anchorY = spineYs.reduce((best, candidate) =>
    Math.abs(candidate - centerTileY) < Math.abs(best - centerTileY) ? candidate : best
  );

  carveCorridor(tiles, floorTypes, {
    type: 'v',
    x: centerTileX,
    y1: centerTileY,
    y2: anchorY,
    width: 2
  });

  carveCorridor(tiles, floorTypes, {
    type: 'h',
    x1: centerTileX,
    x2: anchorX,
    y: anchorY,
    width: 2
  });
}

function carveSecretRoom(tiles, floorTypes, room, secret) {
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      const isBoundary =
        x === room.x ||
        x === room.x + room.w - 1 ||
        y === room.y ||
        y === room.y + room.h - 1;

      if (!isBoundary) continue;

      if (x === secret.door.x && y === secret.door.y) {
        tiles[y][x] = 1;
        floorTypes[y][x] = 5;
      } else {
        tiles[y][x] = 0;
        floorTypes[y][x] = 0;
      }
    }
  }

  let innerX = secret.door.x;
  let innerY = secret.door.y;
  const primaryPath = secret.path[0];

  // Carve exactly one inward tile so S stays the only room entry cell.
  if (secret.door.x === room.x && secret.door.x + 1 < room.x + room.w - 1) {
    innerX = secret.door.x + 1;
  } else if (secret.door.x === room.x + room.w - 1 && secret.door.x - 1 > room.x) {
    innerX = secret.door.x - 1;
  }

  if (secret.door.y === room.y && secret.door.y + 1 < room.y + room.h - 1) {
    innerY = secret.door.y + 1;
  } else if (secret.door.y === room.y + room.h - 1 && secret.door.y - 1 > room.y) {
    innerY = secret.door.y - 1;
  }

  if (secret.door.x !== innerX && secret.door.y !== innerY) {
    if (primaryPath?.type === 'v') {
      innerX = secret.door.x;
    } else {
      innerY = secret.door.y;
    }
  }

  tiles[innerY][innerX] = 1;
  floorTypes[innerY][innerX] = 2;
  tiles[secret.door.y][secret.door.x] = 1;
  floorTypes[secret.door.y][secret.door.x] = 5;

  for (const segment of secret.path) {
    carveCorridor(tiles, floorTypes, segment);
  }
}

function buildLevel(levelDef, levelIndex) {
  const tiles = createGrid(0);
  const floorTypes = createGrid(0);
  const roomIds = createGrid(-1);
  const rooms = levelDef.rooms.map(cloneRoom);
  const corridorAnchors = getCorridorAnchors(levelDef);
  const roomCenters = rooms.map((room) => ({
    x: (room.x + room.w / 2) * TILE_SIZE,
    y: (room.y + room.h / 2) * TILE_SIZE
  }));

  rooms.forEach((room, roomIndex) => {
    carveRect(tiles, floorTypes, room, 2);
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        if (x <= 0 || x >= MAP_WIDTH - 1 || y <= 0 || y >= MAP_HEIGHT - 1) continue;
        roomIds[y][x] = roomIndex;
      }
    }
  });

  const clearRoomIdsForCorridor = (corridor) => {
    if (corridor.type === 'h') {
      for (let y = corridor.y; y < corridor.y + corridor.width; y++) {
        for (let x = Math.min(corridor.x1, corridor.x2); x <= Math.max(corridor.x1, corridor.x2); x++) {
          if (x <= 0 || x >= MAP_WIDTH - 1 || y <= 0 || y >= MAP_HEIGHT - 1) continue;
          roomIds[y][x] = -1;
        }
      }
      return;
    }

    for (let x = corridor.x; x < corridor.x + corridor.width; x++) {
      for (let y = Math.min(corridor.y1, corridor.y2); y <= Math.max(corridor.y1, corridor.y2); y++) {
        if (x <= 0 || x >= MAP_WIDTH - 1 || y <= 0 || y >= MAP_HEIGHT - 1) continue;
        roomIds[y][x] = -1;
      }
    }
  }

  for (const corridor of levelDef.corridors) {
    carveCorridor(tiles, floorTypes, corridor);
    clearRoomIdsForCorridor(corridor);
  }

  for (const obstacle of levelDef.obstacles) {
    for (let y = obstacle.y; y < obstacle.y + obstacle.h; y++) {
      for (let x = obstacle.x; x < obstacle.x + obstacle.w; x++) {
        if (x <= 0 || x >= MAP_WIDTH - 1 || y <= 0 || y >= MAP_HEIGHT - 1) continue;
        tiles[y][x] = 0;
        floorTypes[y][x] = 0;
        roomIds[y][x] = -1;
      }
    }
  }

  // Guarantee every non-secret room has a carved connection into the corridor network.
  for (let roomIndex = 0; roomIndex < rooms.length; roomIndex++) {
    if (levelDef.secret && levelDef.secret.roomIndex === roomIndex) continue;
    const room = rooms[roomIndex];
    connectRoomToNetwork(tiles, floorTypes, room, corridorAnchors);
    clearRoomIdsForCorridor({
      type: 'v',
      x: Math.floor(room.x + room.w / 2),
      y1: Math.floor(room.y + room.h / 2),
      y2: corridorAnchors.spineYs.reduce((best, candidate) =>
        Math.abs(candidate - Math.floor(room.y + room.h / 2)) < Math.abs(best - Math.floor(room.y + room.h / 2)) ? candidate : best
      ),
      width: 2
    });
    clearRoomIdsForCorridor({
      type: 'h',
      x1: Math.floor(room.x + room.w / 2),
      x2: corridorAnchors.trunkXs.reduce((best, candidate) =>
        Math.abs(candidate - Math.floor(room.x + room.w / 2)) < Math.abs(best - Math.floor(room.x + room.w / 2)) ? candidate : best
      ),
      y: corridorAnchors.spineYs.reduce((best, candidate) =>
        Math.abs(candidate - Math.floor(room.y + room.h / 2)) < Math.abs(best - Math.floor(room.y + room.h / 2)) ? candidate : best
      ),
      width: 2
    });
  }

  if (levelDef.secret) {
    carveSecretRoom(tiles, floorTypes, rooms[levelDef.secret.roomIndex], levelDef.secret);
    for (const segment of levelDef.secret.path) {
      clearRoomIdsForCorridor(segment);
    }
  }

  const stairs = {};
  if (levelDef.stairs.down) {
    const stair = {
      ...levelDef.stairs.down,
      kind: 'down',
      center: {
        x: (levelDef.stairs.down.rect.x + Math.floor(levelDef.stairs.down.rect.w / 2)) * TILE_SIZE + TILE_SIZE / 2,
        y: (levelDef.stairs.down.rect.y + Math.floor(levelDef.stairs.down.rect.h / 2)) * TILE_SIZE + TILE_SIZE / 2
      }
    };
    stairs.down = stair;
    carveRect(tiles, floorTypes, stair.rect, 3);
  }
  if (levelDef.stairs.up) {
    const stair = {
      ...levelDef.stairs.up,
      kind: 'up',
      center: {
        x: (levelDef.stairs.up.rect.x + Math.floor(levelDef.stairs.up.rect.w / 2)) * TILE_SIZE + TILE_SIZE / 2,
        y: (levelDef.stairs.up.rect.y + Math.floor(levelDef.stairs.up.rect.h / 2)) * TILE_SIZE + TILE_SIZE / 2
      }
    };
    stairs.up = stair;
    carveRect(tiles, floorTypes, stair.rect, 4);
  }

  const spawnPoints = [];
  for (let y = 1; y < MAP_HEIGHT - 1; y++) {
    for (let x = 1; x < MAP_WIDTH - 1; x++) {
      if (tiles[y][x] === 1) {
        spawnPoints.push({
          x: x * TILE_SIZE + TILE_SIZE / 2,
          y: y * TILE_SIZE + TILE_SIZE / 2,
          level: levelIndex
        });
      }
    }
  }

  let secretState = null;
  if (levelDef.secret) {
    const stairTiles = new Set();
    for (const stair of Object.values(stairs)) {
      if (!stair) continue;
      for (let y = stair.rect.y; y < stair.rect.y + stair.rect.h; y++) {
        for (let x = stair.rect.x; x < stair.rect.x + stair.rect.w; x++) {
          stairTiles.add(`${x},${y}`);
        }
      }
    }

    const keyCandidates = spawnPoints
      .map((pt) => ({ ...worldToTile(pt.x, pt.y), level: levelIndex }))
      .filter((tile, index, tilesForLevel) =>
        tilesForLevel.findIndex((candidate) => candidate.tx === tile.tx && candidate.ty === tile.ty) === index
      )
      .filter((tile) => roomIds[tile.ty][tile.tx] !== levelDef.secret.roomIndex)
      .filter((tile) => !(tile.tx === levelDef.secret.door.x && tile.ty === levelDef.secret.door.y))
      .filter((tile) => !stairTiles.has(`${tile.tx},${tile.ty}`));

    const chosenKeyTile = keyCandidates[Math.floor(Math.random() * keyCandidates.length)] || null;
    if (chosenKeyTile) {
      floorTypes[chosenKeyTile.ty][chosenKeyTile.tx] = 6;
      roomIds[chosenKeyTile.ty][chosenKeyTile.tx] = -1;
    }

    secretState = {
      roomIndex: levelDef.secret.roomIndex,
      door: { ...levelDef.secret.door },
      key: chosenKeyTile ? { x: chosenKeyTile.tx, y: chosenKeyTile.ty } : null,
      unlocked: false
    };
  }

  return {
    name: levelDef.name,
    levelIndex,
    tiles,
    floorTypes,
    roomIds,
    rooms,
    roomCenters,
    stairs,
    spawnPoints,
    startRoom: levelDef.startRoom,
    secret: secretState
  };
}

function buildLevels() {
  levels = LEVEL_DEFS.map((levelDef, levelIndex) => buildLevel(levelDef, levelIndex));
}

function getRoomCenter(levelIndex, roomIndex) {
  return levels[levelIndex].roomCenters[roomIndex];
}

function getSecretState(levelIndex) {
  return levels[levelIndex]?.secret || null;
}

function isSecretDoorTile(levelIndex, tx, ty) {
  const secret = getSecretState(levelIndex);
  return !!secret && secret.door.x === tx && secret.door.y === ty;
}

function isSecretDoorLocked(levelIndex) {
  const secret = getSecretState(levelIndex);
  return !!secret && !secret.unlocked;
}

function isSecretKeyTile(levelIndex, tx, ty) {
  const secret = getSecretState(levelIndex);
  return !!secret?.key && secret.key.x === tx && secret.key.y === ty;
}

function isSecretRoom(levelIndex, roomIndex) {
  const secret = getSecretState(levelIndex);
  return !!secret && secret.roomIndex === roomIndex;
}

function isPointInSecretRoom(levelIndex, x, y) {
  const secret = getSecretState(levelIndex);
  if (!secret) return false;
  return getRoomIdAt(levelIndex, x, y) === secret.roomIndex;
}

function getSecretKeyWorld(levelIndex) {
  const secret = getSecretState(levelIndex);
  if (!secret?.key) return null;
  return { level: levelIndex, ...tileToWorld(secret.key.x, secret.key.y) };
}

function resetSecretDoors() {
  for (const level of levels) {
    if (level.secret) level.secret.unlocked = false;
  }
}

function unlockSecretDoor(levelIndex, actorType) {
  const secret = getSecretState(levelIndex);
  if (!secret || secret.unlocked) return false;

  secret.unlocked = true;
  logSeekerEvent('secret-door-unlocked', {
    unlockedLevel: levelIndex,
    unlockedLevelName: levels[levelIndex]?.name || 'unknown',
    actorType
  });
  return true;
}

function getSafePointOnLevel(levelIndex, targetX, targetY) {
  const level = levels[levelIndex];
  let bestPoint = null;
  let bestDistance = Infinity;

  for (const pt of level.spawnPoints) {
    const distance = Math.hypot(pt.x - targetX, pt.y - targetY);
    if (distance < bestDistance) {
      bestPoint = pt;
      bestDistance = distance;
    }
  }

  return bestPoint || { x: targetX, y: targetY, level: levelIndex };
}

function getSafeRoomCenter(levelIndex, roomIndex) {
  const center = getRoomCenter(levelIndex, roomIndex);
  return getSafePointOnLevel(levelIndex, center.x, center.y);
}

function getSafeStairExit(levelIndex, stairKey) {
  const destinationStair = levels[levelIndex].stairs[stairKey];
  if (!destinationStair) return getStartPosition(levelIndex);

  const rect = destinationStair.rect;
  const candidateTiles = stairKey === 'down'
    ? [
        { tx: rect.x + rect.w, ty: rect.y },
        { tx: rect.x + rect.w, ty: rect.y + 1 },
        { tx: rect.x + rect.w + 1, ty: rect.y },
        { tx: rect.x + rect.w + 1, ty: rect.y + 1 }
      ]
    : [
        { tx: rect.x - 1, ty: rect.y },
        { tx: rect.x - 1, ty: rect.y + 1 },
        { tx: rect.x - 2, ty: rect.y },
        { tx: rect.x - 2, ty: rect.y + 1 }
      ];

  for (const tile of candidateTiles) {
    if (isWalkableTile(levelIndex, tile.tx, tile.ty)) {
      return tileToWorld(tile.tx, tile.ty);
    }
  }

  return getSafePointOnLevel(levelIndex, destinationStair.center.x, destinationStair.center.y);
}

function buildRoomTargets(levelIndex, roomIndex) {
  const room = levels[levelIndex].rooms[roomIndex];
  const center = getSafeRoomCenter(levelIndex, roomIndex);
  const targets = [{ level: levelIndex, x: center.x, y: center.y }];

  if (room.w >= 7) {
    const leftPoint = getSafePointOnLevel(levelIndex, (room.x + 1.5) * TILE_SIZE, center.y);
    const rightPoint = getSafePointOnLevel(levelIndex, (room.x + room.w - 1.5) * TILE_SIZE, center.y);
    targets.push({ level: levelIndex, x: leftPoint.x, y: leftPoint.y });
    targets.push({ level: levelIndex, x: rightPoint.x, y: rightPoint.y });
  }

  if (room.h >= 6) {
    const topPoint = getSafePointOnLevel(levelIndex, center.x, (room.y + 1.5) * TILE_SIZE);
    targets.push({ level: levelIndex, x: topPoint.x, y: topPoint.y });
  }

  return targets;
}

function buildLevelSearchPlans() {
  return levels.map((level, levelIndex) => {
    const regularRooms = level.rooms.flatMap((_, roomIndex) =>
      isSecretRoom(levelIndex, roomIndex) ? [] : buildRoomTargets(levelIndex, roomIndex)
    );
    const secretKeyTarget = getSecretKeyWorld(levelIndex);
    const secretRoomTargets = level.secret ? buildRoomTargets(levelIndex, level.secret.roomIndex) : [];

    return [
      ...regularRooms,
      ...(secretKeyTarget ? [secretKeyTarget] : []),
      ...secretRoomTargets
    ];
  });
}

function getCurrentLevelSearchPlan() {
  return levelSearchPlans[seeker.currentSearchLevel] || [];
}

function chooseNextSearchLevel() {
  const previousLevel = seeker.currentSearchLevel;
  seeker.currentSearchLevel = Math.floor(Math.random() * levels.length);

  seeker.searchIndex = 0;
  seeker.path = [];
  seeker.pathTargetKey = '';
  logSeekerEvent('search-level-changed', {
    previousLevel,
    currentSearchLevel: seeker.currentSearchLevel,
    levelName: levels[seeker.currentSearchLevel]?.name || 'unknown'
  });
}

function pointInRect(x, y, rect) {
  return (
    x >= rect.x * TILE_SIZE &&
    x < (rect.x + rect.w) * TILE_SIZE &&
    y >= rect.y * TILE_SIZE &&
    y < (rect.y + rect.h) * TILE_SIZE
  );
}

function getStartPosition(levelIndex) {
  const level = levels[levelIndex];
  return getSafeRoomCenter(levelIndex, level.startRoom);
}

function getGroundLongestCorridorSpawn() {
  const groundLevelIndex = 2;
  const groundCorridors = LEVEL_DEFS[groundLevelIndex].corridors;

  let longestCorridor = groundCorridors[0];
  let longestLength = -1;

  for (const corridor of groundCorridors) {
    const corridorLength = corridor.type === 'h'
      ? Math.abs(corridor.x2 - corridor.x1) + corridor.width
      : Math.abs(corridor.y2 - corridor.y1) + corridor.width;

    if (corridorLength > longestLength) {
      longestCorridor = corridor;
      longestLength = corridorLength;
    }
  }

  if (longestCorridor.type === 'h') {
    const midX = ((longestCorridor.x1 + longestCorridor.x2 + 1) / 2) * TILE_SIZE;
    const midY = (longestCorridor.y + longestCorridor.width / 2) * TILE_SIZE;
    return {
      level: groundLevelIndex,
      ...getSafePointOnLevel(groundLevelIndex, midX, midY)
    };
  }

  const midX = (longestCorridor.x + longestCorridor.width / 2) * TILE_SIZE;
  const midY = ((longestCorridor.y1 + longestCorridor.y2 + 1) / 2) * TILE_SIZE;
  return {
    level: groundLevelIndex,
    ...getSafePointOnLevel(groundLevelIndex, midX, midY)
  };
}

function getActiveHider() {
  if (phase !== 'hide') return null;
  return hiders[activeHiderIndex] || null;
}

function getDisplayedLevelIndex() {
  if (phase === 'seek') return seeker.level;
  const hider = getActiveHider();
  if (hider) return hider.level;
  return 2;
}

function updateLevelIndicator() {
  levelIndicatorEl.textContent = levels[getDisplayedLevelIndex()]?.name || 'Ground';
}

function getTileAt(levelIndex, x, y) {
  const tx = Math.floor(x / TILE_SIZE);
  const ty = Math.floor(y / TILE_SIZE);
  if (tx < 0 || tx >= MAP_WIDTH || ty < 0 || ty >= MAP_HEIGHT) return 0;
  if (isSecretDoorTile(levelIndex, tx, ty) && isSecretDoorLocked(levelIndex)) return 0;
  return levels[levelIndex].tiles[ty][tx];
}

function getFloorTypeAt(levelIndex, x, y) {
  const tx = Math.floor(x / TILE_SIZE);
  const ty = Math.floor(y / TILE_SIZE);
  if (tx < 0 || tx >= MAP_WIDTH || ty < 0 || ty >= MAP_HEIGHT) return 0;
  return levels[levelIndex].floorTypes[ty][tx];
}

function getRoomIdAt(levelIndex, x, y) {
  const tx = Math.floor(x / TILE_SIZE);
  const ty = Math.floor(y / TILE_SIZE);
  if (tx < 0 || tx >= MAP_WIDTH || ty < 0 || ty >= MAP_HEIGHT) return -1;
  return levels[levelIndex].roomIds[ty][tx];
}

function worldToTile(x, y) {
  return {
    tx: Math.max(0, Math.min(MAP_WIDTH - 1, Math.floor(x / TILE_SIZE))),
    ty: Math.max(0, Math.min(MAP_HEIGHT - 1, Math.floor(y / TILE_SIZE)))
  };
}

function worldToNearestTile(x, y) {
  return {
    tx: Math.max(0, Math.min(MAP_WIDTH - 1, Math.round((x - TILE_SIZE / 2) / TILE_SIZE))),
    ty: Math.max(0, Math.min(MAP_HEIGHT - 1, Math.round((y - TILE_SIZE / 2) / TILE_SIZE)))
  };
}

function tileToWorld(tx, ty) {
  return {
    x: tx * TILE_SIZE + TILE_SIZE / 2,
    y: ty * TILE_SIZE + TILE_SIZE / 2
  };
}

function isWalkableTile(levelIndex, tx, ty) {
  if (tx < 0 || tx >= MAP_WIDTH || ty < 0 || ty >= MAP_HEIGHT) return false;
  if (isSecretDoorTile(levelIndex, tx, ty) && isSecretDoorLocked(levelIndex)) return false;
  return levels[levelIndex].tiles[ty][tx] !== 0;
}

function getNearestWalkableTile(levelIndex, tx, ty) {
  if (isWalkableTile(levelIndex, tx, ty)) return { tx, ty };

  let best = null;
  let bestDistance = Infinity;
  for (const pt of levels[levelIndex].spawnPoints) {
    const tile = worldToTile(pt.x, pt.y);
    const distance = Math.abs(tile.tx - tx) + Math.abs(tile.ty - ty);
    if (distance < bestDistance) {
      best = tile;
      bestDistance = distance;
    }
  }
  return best || { tx, ty };
}

function snapEntityToNearestWalkableTile(entity) {
  const currentTile = worldToNearestTile(entity.x, entity.y);
  const nearestTile = getNearestWalkableTile(entity.level, currentTile.tx, currentTile.ty);
  const snapPoint = tileToWorld(nearestTile.tx, nearestTile.ty);
  const collisionRadius = entity.collisionRadius ?? Math.max(4, entity.radius - 2);

  if (!checkCollision(entity.level, snapPoint.x, snapPoint.y, collisionRadius)) {
    entity.x = snapPoint.x;
    entity.y = snapPoint.y;
    return true;
  }

  return false;
}

function isWall(levelIndex, x, y) {
  return getTileAt(levelIndex, x, y) === 0;
}

function checkCollision(levelIndex, x, y, collisionRadius) {
  const points = [
    [x - collisionRadius, y - collisionRadius],
    [x + collisionRadius, y - collisionRadius],
    [x - collisionRadius, y + collisionRadius],
    [x + collisionRadius, y + collisionRadius],
    [x, y - collisionRadius],
    [x, y + collisionRadius],
    [x - collisionRadius, y],
    [x + collisionRadius, y]
  ];

  for (const [px, py] of points) {
    if (isWall(levelIndex, px, py)) return true;
  }
  return false;
}

function isWallBetween(levelIndex, x1, y1, x2, y2) {
  if (levelIndex == null) return true;
  const steps = Math.max(20, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 8));
  for (let i = 1; i < steps; i++) {
    const x = x1 + (x2 - x1) * i / steps;
    const y = y1 + (y2 - y1) * i / steps;
    if (isWall(levelIndex, x, y)) return true;
  }
  return false;
}

function isCorridorLikeFloor(floorType) {
  return floorType === 1 || floorType === 3 || floorType === 4 || floorType === 5 || floorType === 6;
}

function tryActivateSecretKey(entity) {
  const tile = worldToTile(entity.x, entity.y);
  if (!isSecretKeyTile(entity.level, tile.tx, tile.ty)) return false;

  return unlockSecretDoor(entity.level, entity === seeker ? 'seeker' : 'hider');
}

function hasRestrictedLineOfSight(levelIndex, x1, y1, x2, y2) {
  if (levelIndex == null) return false;

  const startFloorType = getFloorTypeAt(levelIndex, x1, y1);
  const endFloorType = getFloorTypeAt(levelIndex, x2, y2);

  if (startFloorType === 2 && endFloorType === 2) {
    const startRoomId = getRoomIdAt(levelIndex, x1, y1);
    const endRoomId = getRoomIdAt(levelIndex, x2, y2);
    if (startRoomId < 0 || startRoomId !== endRoomId) return false;

    const steps = Math.max(20, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 8));
    for (let i = 1; i < steps; i++) {
      const x = x1 + (x2 - x1) * i / steps;
      const y = y1 + (y2 - y1) * i / steps;
      if (getFloorTypeAt(levelIndex, x, y) !== 2) return false;
      if (getRoomIdAt(levelIndex, x, y) !== startRoomId) return false;
      if (isWall(levelIndex, x, y)) return false;
    }
    return true;
  }

  if (isCorridorLikeFloor(startFloorType) && isCorridorLikeFloor(endFloorType)) {
    const steps = Math.max(20, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 8));
    for (let i = 1; i < steps; i++) {
      const x = x1 + (x2 - x1) * i / steps;
      const y = y1 + (y2 - y1) * i / steps;
      if (!isCorridorLikeFloor(getFloorTypeAt(levelIndex, x, y))) return false;
      if (isWall(levelIndex, x, y)) return false;
    }
    return true;
  }

  return false;
}

function tryUseStairs(entity) {
  const level = levels[entity.level];
  for (const stair of Object.values(level.stairs)) {
    if (!stair) continue;
    if (!pointInRect(entity.x, entity.y, stair.rect)) continue;

    const fromLevel = entity.level;
    const destination = getSafeStairExit(stair.targetLevel, stair.targetStair);
    entity.level = stair.targetLevel;
    entity.x = destination.x;
    entity.y = destination.y;
    entity.vx = 0;
    entity.vy = 0;
    if ('targetX' in entity) {
      entity.targetX = null;
      entity.targetY = null;
    }
    if ('stillTimer' in entity) entity.stillTimer = 0;
    if ('path' in entity) {
      entity.path = [];
      entity.pathTargetKey = '';
    }
    if ('prevX' in entity) {
      entity.prevX = entity.x;
      entity.prevY = entity.y;
    }
    if (entity === seeker) {
      logSeekerEvent('stair-transition', {
        stair: stair.kind,
        fromLevel,
        toLevel: stair.targetLevel,
        destinationX: Math.round(destination.x),
        destinationY: Math.round(destination.y)
      });
    }
    updateLevelIndicator();
    return true;
  }
  return false;
}

function moveEntity(entity, dt, speed) {
  const nextX = entity.x + entity.vx * dt;
  const nextY = entity.y + entity.vy * dt;
  const collisionRadius = entity.collisionRadius ?? Math.max(4, entity.radius - 2);
  let moved = false;

  if (!checkCollision(entity.level, nextX, entity.y, collisionRadius)) {
    entity.x = nextX;
    moved = true;
  }
  if (!checkCollision(entity.level, entity.x, nextY, collisionRadius)) {
    entity.y = nextY;
    moved = true;
  }

  if (moved) {
    tryActivateSecretKey(entity);
    tryUseStairs(entity);
  }

  return moved;
}

function buildPath(levelIndex, startX, startY, endX, endY) {
  const startGridTile = worldToNearestTile(startX, startY);
  const endGridTile = worldToNearestTile(endX, endY);
  const startTile = getNearestWalkableTile(levelIndex, startGridTile.tx, startGridTile.ty);
  const endTile = getNearestWalkableTile(levelIndex, endGridTile.tx, endGridTile.ty);
  const startKey = `${startTile.tx},${startTile.ty}`;
  const endKey = `${endTile.tx},${endTile.ty}`;

  if (startKey === endKey) return [tileToWorld(endTile.tx, endTile.ty)];

  const queue = [startTile];
  const cameFrom = new Map();
  const visited = new Set([startKey]);
  const deltas = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1]
  ];

  while (queue.length > 0) {
    const current = queue.shift();
    const currentKey = `${current.tx},${current.ty}`;
    if (currentKey === endKey) break;

    for (const [dx, dy] of deltas) {
      const next = { tx: current.tx + dx, ty: current.ty + dy };
      const nextKey = `${next.tx},${next.ty}`;
      if (visited.has(nextKey) || !isWalkableTile(levelIndex, next.tx, next.ty)) continue;
      visited.add(nextKey);
      cameFrom.set(nextKey, currentKey);
      queue.push(next);
    }
  }

  if (!visited.has(endKey)) return [];

  const tiles = [];
  let currentKey = endKey;
  while (currentKey && currentKey !== startKey) {
    const [tx, ty] = currentKey.split(',').map(Number);
    tiles.push(tileToWorld(tx, ty));
    currentKey = cameFrom.get(currentKey);
  }

  tiles.reverse();
  return tiles;
}

function getReachableTileTargets(levelIndex, startX, startY) {
  const startGridTile = worldToNearestTile(startX, startY);
  const startTile = getNearestWalkableTile(levelIndex, startGridTile.tx, startGridTile.ty);
  const startKey = `${startTile.tx},${startTile.ty}`;
  const queue = [startTile];
  const visited = new Set([startKey]);
  const deltas = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1]
  ];
  const reachable = [];

  while (queue.length > 0) {
    const current = queue.shift();
    reachable.push(current);

    for (const [dx, dy] of deltas) {
      const next = { tx: current.tx + dx, ty: current.ty + dy };
      const nextKey = `${next.tx},${next.ty}`;
      if (visited.has(nextKey) || !isWalkableTile(levelIndex, next.tx, next.ty)) continue;
      visited.add(nextKey);
      queue.push(next);
    }
  }

  return reachable;
}

function drawHider(hider) {
  ctx.save();
  ctx.translate(hider.x, hider.y);
  if (hider.found) ctx.globalAlpha = 0.35;

  const r = hider.radius;
  ctx.fillStyle = hider.color;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.2, r, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.ellipse(-4, -6, 5, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  ctx.ellipse(-4, -6, 3, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  if (hider.found) {
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-8, -8);
    ctx.lineTo(8, 8);
    ctx.moveTo(8, -8);
    ctx.lineTo(-8, 8);
    ctx.stroke();
  }

  ctx.restore();
}

function drawSeeker() {
  ctx.save();
  ctx.translate(seeker.x, seeker.y);

  const r = seeker.radius;
  ctx.fillStyle = '#ff4757';
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.2, r, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#cc3344';
  ctx.lineWidth = 2;
  ctx.stroke();

  const eyeX = r * 0.5;
  const eyeY = -r * 0.85;
  const eyeOuterX = r * 0.65;
  const eyeOuterY = r * 0.85;
  const eyeInnerX = r * 0.32;
  const eyeInnerY = r * 0.42;

  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  ctx.ellipse(-eyeX, eyeY, eyeOuterX, eyeOuterY, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(eyeX, eyeY, eyeOuterX, eyeOuterY, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ff0000';
  ctx.beginPath();
  ctx.ellipse(-eyeX, eyeY, eyeInnerX, eyeInnerY, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(eyeX, eyeY, eyeInnerX, eyeInnerY, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ff6666';
  ctx.beginPath();
  ctx.ellipse(-eyeX, eyeY, Math.max(1.5, r * 0.16), Math.max(1.5, r * 0.16), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(eyeX, eyeY, Math.max(1.5, r * 0.16), Math.max(1.5, r * 0.16), 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#2d1b0e';
  for (let i = -2; i <= 2; i++) {
    ctx.fillRect(i * (r * 0.5) - 1.5, r * 0.7, 3, 5);
  }

  ctx.restore();
}

function drawMap() {
  const level = levels[getDisplayedLevelIndex()];
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      const floorType = level.floorTypes[y][x];

      if (floorType === 0) {
        ctx.fillStyle = '#05070a';
        ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#101418';
        ctx.fillRect(x * TILE_SIZE + 2, y * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        continue;
      }

      if (floorType === 1) {
        ctx.fillStyle = '#353c44';
        ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#4d5660';
        ctx.fillRect(x * TILE_SIZE + 1, y * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2);
        continue;
      }

      if (floorType === 2) {
        ctx.fillStyle = '#8f98a1';
        ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#b3bcc4';
        ctx.fillRect(x * TILE_SIZE + 1, y * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2);
        continue;
      }

      if (floorType === 5) {
        const unlocked = !isSecretDoorLocked(level.levelIndex);
        ctx.fillStyle = unlocked ? '#10b981' : '#7f1d1d';
        ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = unlocked ? '#34d399' : '#ef4444';
        ctx.fillRect(x * TILE_SIZE + 2, y * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        ctx.fillStyle = unlocked ? '#052e16' : '#fee2e2';
        ctx.font = '12px Silkscreen';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(unlocked ? 'O' : 'S', x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2);
        continue;
      }

      if (floorType === 6) {
        ctx.fillStyle = '#d97706';
        ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(x * TILE_SIZE + 2, y * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        ctx.fillStyle = '#422006';
        ctx.font = '12px Silkscreen';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('K', x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2);
        continue;
      }

      ctx.fillStyle = floorType === 3 ? '#2563eb' : '#f59e0b';
      ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      ctx.fillStyle = floorType === 3 ? '#60a5fa' : '#fbbf24';
      ctx.fillRect(x * TILE_SIZE + 2, y * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);

      ctx.fillStyle = '#0f172a';
      ctx.font = '12px Silkscreen';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(floorType === 3 ? 'D' : 'U', x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2);
    }
  }
}

function openOverlay(screenEl) {
  [startScreenEl, turnScreenEl, endScreenEl].forEach((el) => el.classList.add('hidden'));
  screenEl.classList.remove('hidden');
  overlayEl.classList.remove('hidden-overlay');
  overlayEl.classList.add('active');
}

function hideOverlay() {
  overlayEl.classList.remove('active');
  overlayEl.classList.add('hidden-overlay');
}

function showTurnOverlay(title, message, buttonLabel, action) {
  continueAction = action;
  turnTitleEl.textContent = title;
  turnMessageEl.textContent = message;
  continueBtnEl.textContent = buttonLabel;
  openOverlay(turnScreenEl);
}

function setControlsEnabled(enabled) {
  controlsEl.classList.toggle('active', enabled);
  lockBtnEl.classList.toggle('visible', enabled);
}

function clearMovementKeys() {
  keys = {};
}

function updatePlayerStatus() {
  playerStatusEl.innerHTML = '';
  hiders.forEach((hider, index) => {
    const chip = document.createElement('span');
    chip.className = 'player-chip';

    let state = 'Waiting';
    if (hider.found) state = 'Found';
    else if (phase === 'seek') state = 'Hidden';
    else if (index === activeHiderIndex && gameState === 'playing') state = levels[hider.level].name;
    else if (hider.locked) state = levels[hider.level].name;

    if (phase === 'hide' && gameState === 'playing' && index === activeHiderIndex) {
      chip.classList.add('active');
    }
    if (hider.found) chip.classList.add('found');

    chip.textContent = `Hider ${index + 1}: ${state}`;
    chip.style.borderColor = hider.color;
    playerStatusEl.appendChild(chip);
  });
}

function createHiders(count) {
  const startLevel = 2;
  const start = getStartPosition(startLevel);
  hiders = Array.from({ length: count }, (_, index) => ({
    x: start.x,
    y: start.y,
    level: startLevel,
    radius: 14,
    color: HIDER_COLORS[index],
    vx: 0,
    vy: 0,
    targetX: null,
    targetY: null,
    locked: false,
    found: false
  }));
}

function getSeekerSpawn() {
  return getGroundLongestCorridorSpawn();
}

function resetSeeker() {
  const spawn = getSeekerSpawn();
  resetSecretDoors();
  seeker.level = spawn.level;
  seeker.x = spawn.x;
  seeker.y = spawn.y;
  seeker.vx = 0;
  seeker.vy = 0;
  seeker.searchIndex = 0;
  seeker.stillTimer = 0;
  seeker.targetX = seeker.x;
  seeker.targetY = seeker.y;
  seeker.path = [];
  seeker.pathTargetKey = '';
  seeker.prevX = seeker.x;
  seeker.prevY = seeker.y;
  seeker.recoveryIndex = 0;
  seeker.blockedLogCooldown = 0;
  seekerDebug.events.length = 0;
  chooseNextSearchLevel();
  logSeekerEvent('spawn', {
    spawnLevel: spawn.level,
    spawnX: Math.round(spawn.x),
    spawnY: Math.round(spawn.y),
    speed: SEEKER_SPEED
  });
}

function beginHideTurn(index) {
  const hider = hiders[index];
  const startLevel = 2;
  const start = getStartPosition(startLevel);
  resetSecretDoors();

  hider.level = startLevel;
  hider.x = start.x;
  hider.y = start.y;
  hider.vx = 0;
  hider.vy = 0;
  hider.targetX = null;
  hider.targetY = null;
  hider.locked = false;

  activeHiderIndex = index;
  gameState = 'playing';
  phase = 'hide';
  phaseTimeLeft = HIDE_TURN_DURATION;
  phaseTextEl.textContent = `HIDE ${index + 1}`;
  instructionTextEl.textContent = `Hider ${index + 1}: use arrows or tap the map to move. Touch K to unlock S into O on this turn. Right stairs go up, left stairs go down.`;
  setControlsEnabled(true);
  updatePlayerStatus();
  updateLevelIndicator();
  hideOverlay();
  focusKeyboardCapture();
}

function beginSeekPhase() {
  gameState = 'playing';
  phase = 'seek';
  phaseTimeLeft = SEEK_PHASE_DURATION;
  activeHiderIndex = -1;
  phaseTextEl.textContent = 'SEEK!';
  instructionTextEl.textContent = 'The seeker starts on ground, searches random levels, and must touch K to open any locked S door.';
  setControlsEnabled(false);
  updatePlayerStatus();
  updateLevelIndicator();
  logSeekerEvent('seek-phase-start');
  hideOverlay();
}

function prepareSeekPhase() {
  resetSeeker();
  showTurnOverlay(
    'Seek Phase',
    'All hiders are locked in place. Every secret S door is locked again, and the seeker must touch K on that floor to open it.',
    'Release Seeker',
    beginSeekPhase
  );
}

function lockCurrentHider(autoLocked = false) {
  const hider = getActiveHider();
  if (!hider) return;

  hider.locked = true;
  hider.vx = 0;
  hider.vy = 0;
  hider.targetX = null;
  hider.targetY = null;
  clearMovementKeys();

  if (activeHiderIndex < hiders.length - 1) {
    const nextIndex = activeHiderIndex + 1;
    gameState = 'transition';
    setControlsEnabled(false);
    updatePlayerStatus();
    showTurnOverlay(
      `Hider ${nextIndex + 1}`,
      autoLocked
        ? `Time is up. Hider ${nextIndex + 1}, take your turn and choose a hiding place.`
        : `Hider ${nextIndex + 1}, it is your turn to hide. Everyone else look away.`,
      'Start Turn',
      () => beginHideTurn(nextIndex)
    );
    return;
  }

  gameState = 'transition';
  setControlsEnabled(false);
  updatePlayerStatus();
  prepareSeekPhase();
}

function startGame() {
  buildLevels();
  levelSearchPlans = buildLevelSearchPlans();
  createHiders(Number.parseInt(playerCountEl.value, 10));
  activeHiderIndex = -1;
  gameState = 'transition';
  phase = 'hide';
  phaseTimeLeft = HIDE_TURN_DURATION;
  updatePlayerStatus();
  updateLevelIndicator();
  timerEl.textContent = `${HIDE_TURN_DURATION}`;
  endScreenEl.classList.add('hidden');
  startScreenEl.classList.add('hidden');
  showTurnOverlay(
    'Hider 1',
    'Hider 1 has 30 seconds to hide. Step onto the right stairs to go up and the left stairs to go down.',
    'Start Turn',
    () => beginHideTurn(0)
  );
}

function gameOver(hidersWin) {
  gameState = 'menu';
  phase = 'menu';
  setControlsEnabled(false);
  updatePlayerStatus();
  updateLevelIndicator();

  const survivors = hiders.filter((hider) => !hider.found).length;
  endScreenEl.classList.toggle('win', hidersWin);
  endTitleEl.textContent = hidersWin ? 'Hiders Survived!' : 'Seeker Wins!';
  endMessageEl.textContent = hidersWin
    ? `${survivors} of ${hiders.length} hiders survived the 3-minute search.`
    : 'The seeker found every locked hider in the building.';
  openOverlay(endScreenEl);
}

function updateActiveHider(dt) {
  const hider = getActiveHider();
  if (!hider || hider.locked) return;

  hider.vx = 0;
  hider.vy = 0;

  if (keys.KeyW || keys.ArrowUp) hider.vy = -HIDER_SPEED;
  if (keys.KeyS || keys.ArrowDown) hider.vy = HIDER_SPEED;
  if (keys.KeyA || keys.ArrowLeft) hider.vx = -HIDER_SPEED;
  if (keys.KeyD || keys.ArrowRight) hider.vx = HIDER_SPEED;

  if (hider.vx === 0 && hider.vy === 0 && hider.targetX != null && hider.targetY != null) {
    const dx = hider.targetX - hider.x;
    const dy = hider.targetY - hider.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 8) {
      hider.vx = (dx / dist) * HIDER_SPEED;
      hider.vy = (dy / dist) * HIDER_SPEED;
    } else {
      hider.targetX = null;
      hider.targetY = null;
    }
  }

  if (hider.vx !== 0 && hider.vy !== 0) {
    const norm = Math.sqrt(2);
    hider.vx /= norm;
    hider.vy /= norm;
  }

  moveEntity(hider, dt, HIDER_SPEED);
  updateLevelIndicator();
}

function getClosestUnfoundHider() {
  let bestHider = null;
  let bestDistance = Infinity;

  for (const hider of hiders) {
    if (hider.found || !hider.locked) continue;
    if (hider.level !== seeker.currentSearchLevel) continue;

    const levelPenalty = hider.level === seeker.level ? 0 : CANVAS_WIDTH * 2;
    const distance = Math.hypot(hider.x - seeker.x, hider.y - seeker.y) + levelPenalty;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestHider = hider;
    }
  }

  return bestHider;
}

function getSecretAwareTarget(levelIndex, target) {
  if (!target || !isSecretDoorLocked(levelIndex)) return target;
  if (!isPointInSecretRoom(levelIndex, target.x, target.y)) return target;

  return getSecretKeyWorld(levelIndex) || target;
}

function getSeekerTarget() {
  const closestHider = getClosestUnfoundHider();
  if (closestHider) {
    if (closestHider.level === seeker.level) {
      const target = getSecretAwareTarget(seeker.level, closestHider) || closestHider;
      return { level: seeker.level, x: target.x, y: target.y, pursuingHider: true };
    }

    const stair =
      seeker.level < closestHider.level
        ? levels[seeker.level].stairs.up
        : levels[seeker.level].stairs.down;

    if (stair) {
      return {
        level: seeker.level,
        x: stair.center.x,
        y: stair.center.y,
        pursuingHider: true
      };
    }
  }

  const levelPlan = getCurrentLevelSearchPlan();
  if (levelPlan.length === 0) {
    return { level: seeker.level, x: seeker.x, y: seeker.y };
  }

  const waypoint = levelPlan[seeker.searchIndex % levelPlan.length];
  return getLocalTargetForWaypoint(waypoint);
}

function getEmergencySeekerTarget() {
  const candidates = getReachableTileTargets(seeker.level, seeker.x, seeker.y)
    .map((tile) => tileToWorld(tile.tx, tile.ty))
    .filter((pt) => Math.hypot(pt.x - seeker.x, pt.y - seeker.y) > TILE_SIZE * 4);

  if (candidates.length === 0) {
    return {
      level: seeker.level,
      x: seeker.x,
      y: seeker.y
    };
  }

  const candidate = candidates[seeker.recoveryIndex % candidates.length];
  seeker.recoveryIndex = (seeker.recoveryIndex + 7) % candidates.length;
  return {
    level: seeker.level,
    x: candidate.x,
    y: candidate.y
  };
}

function getLocalTargetForWaypoint(waypoint) {
  if (seeker.level === waypoint.level) {
    return getSecretAwareTarget(seeker.level, waypoint) || waypoint;
  }

  const stair =
    seeker.level < waypoint.level
      ? levels[seeker.level].stairs.up
      : levels[seeker.level].stairs.down;

  return stair ? { level: seeker.level, x: stair.center.x, y: stair.center.y } : waypoint;
}

function updateSeeker(dt) {
  const levelPlan = getCurrentLevelSearchPlan();
  if (phase !== 'seek' || levelPlan.length === 0) return;
  seeker.blockedLogCooldown = Math.max(0, seeker.blockedLogCooldown - dt);

  let waypoint = levelPlan[seeker.searchIndex % levelPlan.length];
  if (seeker.level === waypoint.level && Math.hypot(waypoint.x - seeker.x, waypoint.y - seeker.y) < 14) {
    seeker.searchIndex += 1;
    if (seeker.searchIndex >= levelPlan.length) {
      chooseNextSearchLevel();
    }
  }

  const target = getSeekerTarget();
  seeker.targetX = target.x;
  seeker.targetY = target.y;
  const targetKey = `${seeker.level}:${Math.round(target.x)}:${Math.round(target.y)}`;

  if (seeker.pathTargetKey !== targetKey || seeker.path.length === 0) {
    seeker.path = buildPath(seeker.level, seeker.x, seeker.y, target.x, target.y);
    seeker.pathTargetKey = targetKey;
    logSeekerEvent('path-updated', {
      targetLevel: target.level ?? seeker.level,
      targetX: Math.round(target.x),
      targetY: Math.round(target.y),
      pathLength: seeker.path.length
    });
  }

  if (seeker.path.length === 0 && Math.hypot(target.x - seeker.x, target.y - seeker.y) > TILE_SIZE) {
    const emergencyTarget = getEmergencySeekerTarget();
    seeker.path = buildPath(seeker.level, seeker.x, seeker.y, emergencyTarget.x, emergencyTarget.y);
    seeker.pathTargetKey = `recovery:${seeker.level}:${Math.round(emergencyTarget.x)}:${Math.round(emergencyTarget.y)}`;
    seeker.targetX = emergencyTarget.x;
    seeker.targetY = emergencyTarget.y;
    logSeekerEvent('path-empty-recovery', {
      emergencyX: Math.round(emergencyTarget.x),
      emergencyY: Math.round(emergencyTarget.y),
      pathLength: seeker.path.length
    });
  }

  while (seeker.path.length > 0 && Math.hypot(seeker.path[0].x - seeker.x, seeker.path[0].y - seeker.y) < 10) {
    seeker.x = seeker.path[0].x;
    seeker.y = seeker.path[0].y;
    seeker.path.shift();
  }

  const stepTarget = seeker.path[0] || { x: target.x, y: target.y };
  if (Math.abs(stepTarget.x - seeker.x) < 4) seeker.x = stepTarget.x;
  if (Math.abs(stepTarget.y - seeker.y) < 4) seeker.y = stepTarget.y;

  const dx = stepTarget.x - seeker.x;
  const dy = stepTarget.y - seeker.y;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  if (absDx > 1 || absDy > 1) {
    // Re-center to the waypoint's lane before advancing to the next tile.
    if (absDx > 1 && absDy > 1) {
      if (absDx < absDy) {
        seeker.vx = Math.sign(dx) * Math.min(SEEKER_SPEED * 0.6, absDx / Math.max(dt, 0.016));
        seeker.vy = 0;
      } else {
        seeker.vy = Math.sign(dy) * Math.min(SEEKER_SPEED * 0.6, absDy / Math.max(dt, 0.016));
        seeker.vx = 0;
      }
    } else if (absDx > absDy) {
      seeker.vx = Math.sign(dx) * SEEKER_SPEED;
      seeker.vy = 0;
    } else {
      seeker.vy = Math.sign(dy) * SEEKER_SPEED;
      seeker.vx = 0;
    }
  } else {
    seeker.vx = 0;
    seeker.vy = 0;
  }

  const moved = moveEntity(seeker, dt, SEEKER_SPEED);

  const movementDelta = Math.hypot(seeker.x - seeker.prevX, seeker.y - seeker.prevY);
  if (!moved && (absDx > 1 || absDy > 1) && seeker.blockedLogCooldown === 0) {
    logSeekerEvent('movement-blocked', {
      stepTargetX: Math.round(stepTarget.x),
      stepTargetY: Math.round(stepTarget.y),
      dx: Math.round(dx),
      dy: Math.round(dy),
      stillTimerMs: Math.round(seeker.stillTimer * 1000)
    });
    seeker.blockedLogCooldown = 0.25;
  }

  if (movementDelta < 1 || (!moved && (absDx > 1 || absDy > 1))) {
    seeker.stillTimer += dt;
  } else {
    seeker.stillTimer = 0;
  }

  if (seeker.stillTimer >= 0.75) {
    const snapped = snapEntityToNearestWalkableTile(seeker);
    const emergencyTarget = getEmergencySeekerTarget();
    seeker.searchIndex = (seeker.searchIndex + 1) % levelPlan.length;
    seeker.path = buildPath(seeker.level, seeker.x, seeker.y, emergencyTarget.x, emergencyTarget.y);
    seeker.pathTargetKey = `recovery:${seeker.level}:${Math.round(emergencyTarget.x)}:${Math.round(emergencyTarget.y)}`;
    seeker.targetX = emergencyTarget.x;
    seeker.targetY = emergencyTarget.y;
    logSeekerEvent('stuck-recovery', {
      snapped,
      emergencyX: Math.round(emergencyTarget.x),
      emergencyY: Math.round(emergencyTarget.y),
      pathLength: seeker.path.length,
      movementDelta: Math.round(movementDelta * 100) / 100
    });
    seeker.stillTimer = 0;
  }

  seeker.prevX = seeker.x;
  seeker.prevY = seeker.y;

  updateLevelIndicator();
}

function catchVisibleHiders() {
  let foundAny = false;

  for (const hider of hiders) {
    if (hider.found || !hider.locked || hider.level !== seeker.level) continue;

    const touching = Math.hypot(hider.x - seeker.x, hider.y - seeker.y) < CATCH_RANGE;
    const hasLineOfSight = hasRestrictedLineOfSight(seeker.level, seeker.x, seeker.y, hider.x, hider.y);

    if (touching || hasLineOfSight) {
      hider.found = true;
      foundAny = true;
      logSeekerEvent('hider-found', {
        hiderLevel: hider.level,
        hiderX: Math.round(hider.x),
        hiderY: Math.round(hider.y),
        touching,
        hasLineOfSight
      });
    }
  }

  if (foundAny) updatePlayerStatus();
}

function updateTimerDisplay() {
  if (phase === 'seek') {
    const mins = Math.floor(Math.max(0, phaseTimeLeft) / 60);
    const secs = Math.floor(Math.max(0, phaseTimeLeft) % 60);
    timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    return;
  }

  timerEl.textContent = `${Math.max(0, Math.ceil(phaseTimeLeft))}`;
}

function drawScene() {
  ctx.fillStyle = '#1a1f2e';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  drawMap();

  for (let i = 0; i < hiders.length; i++) {
    const hider = hiders[i];
    let shouldDraw = false;

    if (phase === 'seek') {
      shouldDraw = hider.level === seeker.level;
    } else if (phase === 'hide') {
      shouldDraw = i === activeHiderIndex;
    }

    if (shouldDraw) drawHider(hider);
  }

  if (phase === 'seek') {
    drawSeeker();
  }

  const hasKeyInput = keys.KeyW || keys.KeyA || keys.KeyS || keys.KeyD ||
    keys.ArrowUp || keys.ArrowDown || keys.ArrowLeft || keys.ArrowRight;
  ctx.fillStyle = hasKeyInput ? '#22c55e' : '#ef4444';
  ctx.beginPath();
  ctx.arc(CANVAS_WIDTH - 20, 20, 8, 0, Math.PI * 2);
  ctx.fill();
}

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
  lastTime = timestamp;

  if (gameState === 'playing') {
    if (phase === 'hide') {
      updateActiveHider(dt);
      phaseTimeLeft -= dt;
      if (phaseTimeLeft <= 0) {
        lockCurrentHider(true);
      }
    } else if (phase === 'seek') {
      phaseTimeLeft -= dt;
      updateSeeker(dt);
      catchVisibleHiders();

      if (hiders.every((hider) => hider.found)) {
        gameOver(false);
      } else if (phaseTimeLeft <= 0) {
        gameOver(true);
      }
    }

    updateTimerDisplay();
  }

  drawScene();
  requestAnimationFrame(gameLoop);
}

function init() {
  initCanvas();
  buildLevels();
  levelSearchPlans = buildLevelSearchPlans();
  updateTimerDisplay();
  updateLevelIndicator();

  document.getElementById('start-btn').addEventListener('click', startGame);
  document.getElementById('restart-btn').addEventListener('click', startGame);
  continueBtnEl.addEventListener('click', () => {
    if (typeof continueAction === 'function') {
      const action = continueAction;
      continueAction = null;
      action();
    }
  });
  lockBtnEl.addEventListener('click', () => lockCurrentHider(false));

  const movementKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  const keyHandler = (event, pressed) => {
    if (movementKeys.includes(event.code)) {
      keys[event.code] = pressed;
      event.preventDefault();
      event.stopPropagation();
    }
  };

  [keyboardCaptureEl, window, document].forEach((target) => {
    target.addEventListener('keydown', (event) => keyHandler(event, true), true);
    target.addEventListener('keyup', (event) => keyHandler(event, false), true);
  });

  keyboardCaptureEl.addEventListener('blur', () => {
    if (gameState === 'playing') focusKeyboardCapture();
  });

  document.querySelectorAll('.ctrl-btn').forEach((btn) => {
    const key = btn.dataset.key;
    const setPressed = (pressed, event) => {
      if (event) event.preventDefault();
      keys[key] = pressed;
    };

    btn.addEventListener('mousedown', (event) => setPressed(true, event));
    btn.addEventListener('mouseup', (event) => setPressed(false, event));
    btn.addEventListener('mouseleave', (event) => setPressed(false, event));
    btn.addEventListener('touchstart', (event) => {
      setPressed(true, event);
      event.preventDefault();
    }, { passive: false });
    btn.addEventListener('touchend', (event) => {
      setPressed(false, event);
      event.preventDefault();
    }, { passive: false });
    btn.addEventListener('touchcancel', (event) => {
      setPressed(false, event);
      event.preventDefault();
    }, { passive: false });
  });

  const setHiderTapTarget = (clientX, clientY) => {
    const hider = getActiveHider();
    if (!hider || gameState !== 'playing') return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    if (!isWall(hider.level, x, y)) {
      hider.targetX = x;
      hider.targetY = y;
      focusKeyboardCapture();
    }
  };

  canvas.addEventListener('click', (event) => {
    setHiderTapTarget(event.clientX, event.clientY);
  });

  canvas.addEventListener('touchstart', (event) => {
    const touch = event.touches[0];
    if (!touch) return;
    setHiderTapTarget(touch.clientX, touch.clientY);
    event.preventDefault();
  }, { passive: false });

  canvas.addEventListener('touchmove', (event) => {
    const touch = event.touches[0];
    if (!touch) return;
    setHiderTapTarget(touch.clientX, touch.clientY);
    event.preventDefault();
  }, { passive: false });

  keyboardCaptureEl.readOnly = isTouchDevice;

  requestAnimationFrame(gameLoop);
}

init();
