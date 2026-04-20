const fs = require('fs');
const vm = require('vm');
const path = require('path');

function makeClassList() {
  return {
    add() {},
    remove() {},
    toggle() {},
    contains() {
      return false;
    }
  };
}

function makeElement(overrides = {}) {
  return {
    value: '1',
    textContent: '',
    innerHTML: '',
    style: {},
    dataset: {},
    classList: makeClassList(),
    appendChild() {},
    addEventListener() {},
    removeEventListener() {},
    focus() {},
    blur() {},
    getContext() {
      return null;
    },
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 1088, height: 704 };
    },
    ...overrides
  };
}

function makeCanvasContext() {
  const noop = () => {};
  return {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    textAlign: '',
    textBaseline: '',
    globalAlpha: 1,
    beginPath: noop,
    fillRect: noop,
    arc: noop,
    fill: noop,
    ellipse: noop,
    stroke: noop,
    moveTo: noop,
    lineTo: noop,
    save: noop,
    restore: noop,
    translate: noop,
    fillText: noop
  };
}

function loadHooks() {
  const ctx = makeCanvasContext();
  const elements = new Map();

  const getElementById = (id) => {
    if (!elements.has(id)) {
      const base = id === 'game-canvas'
        ? makeElement({
            width: 1088,
            height: 704,
            getContext: () => ctx
          })
        : makeElement();
      elements.set(id, base);
    }
    return elements.get(id);
  };

  const sandbox = {
    console,
    Math,
    Date,
    setTimeout,
    clearTimeout,
    performance: { now: () => 0 },
    requestAnimationFrame() {},
    window: {
      addEventListener() {},
      removeEventListener() {}
    },
    document: {
      getElementById,
      querySelectorAll() {
        return [];
      },
      createElement() {
        return makeElement();
      },
      addEventListener() {},
      removeEventListener() {}
    }
  };

  sandbox.window.window = sandbox.window;
  sandbox.window.document = sandbox.document;
  sandbox.window.console = console;
  sandbox.window.performance = sandbox.performance;
  sandbox.window.requestAnimationFrame = sandbox.requestAnimationFrame;

  vm.createContext(sandbox);

  const source = fs.readFileSync(path.join(__dirname, 'js/game.js'), 'utf8');
  const exportSource = `
globalThis.__mapHooks = {
  initLevels() {
    buildLevels();
    resetSecretDoors();
  },
  getLevelCount() {
    return levels.length;
  },
  getLevelData(levelIndex) {
    return {
      name: levels[levelIndex].name,
      rooms: levels[levelIndex].rooms.map((room, roomIndex) => ({ ...room, roomIndex })),
      roomIds: levels[levelIndex].roomIds,
      secret: levels[levelIndex].secret
    };
  },
  getStartTile(levelIndex) {
    const start = getStartPosition(levelIndex);
    return worldToNearestTile(start.x, start.y);
  },
  isWalkable(levelIndex, tx, ty) {
    return isWalkableTile(levelIndex, tx, ty);
  },
  unlockSecret(levelIndex) {
    return unlockSecretDoor(levelIndex, 'test');
  }
};
`;

  vm.runInContext(source + '\n' + exportSource, sandbox, { filename: 'map-accessibility-harness.js' });
  return sandbox.__mapHooks;
}

function bfs(levelIndex, startTile, isWalkable) {
  const visited = new Set([`${startTile.tx},${startTile.ty}`]);
  const queue = [startTile];
  const deltas = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1]
  ];

  while (queue.length > 0) {
    const current = queue.shift();
    for (const [dx, dy] of deltas) {
      const next = { tx: current.tx + dx, ty: current.ty + dy };
      const key = `${next.tx},${next.ty}`;
      if (visited.has(key) || !isWalkable(levelIndex, next.tx, next.ty)) continue;
      visited.add(key);
      queue.push(next);
    }
  }

  return visited;
}

function roomHasReachableTile(room, roomIds, visited) {
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      if (roomIds[y][x] !== room.roomIndex) continue;
      if (visited.has(`${x},${y}`)) return true;
    }
  }
  return false;
}

function runAccessibilityCheck() {
  const hooks = loadHooks();
  hooks.initLevels();

  const report = [];

  for (let levelIndex = 0; levelIndex < hooks.getLevelCount(); levelIndex++) {
    const level = hooks.getLevelData(levelIndex);
    const startTile = hooks.getStartTile(levelIndex);
    const lockedVisited = bfs(levelIndex, startTile, hooks.isWalkable);
    const secretRoomIndex = level.secret?.roomIndex ?? -1;

    const inaccessibleRooms = level.rooms
      .filter((room) => room.roomIndex !== secretRoomIndex)
      .filter((room) => !roomHasReachableTile(room, level.roomIds, lockedVisited))
      .map((room) => room.roomIndex);

    let secretRoomAccessibleAfterUnlock = true;
    let keyAccessible = true;

    if (level.secret?.key) {
      keyAccessible = lockedVisited.has(`${level.secret.key.x},${level.secret.key.y}`);
    }

    if (level.secret) {
      hooks.unlockSecret(levelIndex);
      const unlockedVisited = bfs(levelIndex, startTile, hooks.isWalkable);
      const secretRoom = level.rooms[level.secret.roomIndex];
      secretRoomAccessibleAfterUnlock = roomHasReachableTile(secretRoom, level.roomIds, unlockedVisited);
    }

    report.push({
      levelIndex,
      levelName: level.name,
      inaccessibleRooms,
      keyAccessible,
      secretRoomAccessibleAfterUnlock
    });
  }

  const failures = report.filter((entry) =>
    entry.inaccessibleRooms.length > 0 ||
    !entry.keyAccessible ||
    !entry.secretRoomAccessibleAfterUnlock
  );

  return {
    levelsChecked: report.length,
    failedLevels: failures.length,
    report,
    failures
  };
}

console.log(JSON.stringify(runAccessibilityCheck(), null, 2));
