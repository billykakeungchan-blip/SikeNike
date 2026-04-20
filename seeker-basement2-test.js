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

function loadGameHooks() {
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

  const gamePath = path.join(__dirname, 'js/game.js');
  const source = fs.readFileSync(gamePath, 'utf8');
  const exportSource = `
globalThis.__testHooks = {
  setupBasementTrial(hiderPoint) {
    buildLevels();
    levelSearchPlans = buildLevelSearchPlans();
    createHiders(1);
    resetSeeker();
    const hider = hiders[0];
    hider.level = 0;
    hider.x = hiderPoint.x;
    hider.y = hiderPoint.y;
    hider.vx = 0;
    hider.vy = 0;
    hider.targetX = null;
    hider.targetY = null;
    hider.locked = true;
    hider.found = false;
    gameState = 'playing';
    phase = 'seek';
    phaseTimeLeft = SEEK_PHASE_DURATION;
    seeker.currentSearchLevel = 0;
    seeker.searchIndex = 0;
    seeker.path = [];
    seeker.pathTargetKey = '';
    seeker.stillTimer = 0;
    seeker.prevX = seeker.x;
    seeker.prevY = seeker.y;
    seeker.recoveryIndex = 0;
    seeker.blockedLogCooldown = 0;
    seekerDebug.events.length = 0;
  },
  step(dt) {
    updateSeeker(dt);
    catchVisibleHiders();
    phaseTimeLeft -= dt;
  },
  getBasementSpawnPoints() {
    return levels[0].spawnPoints.map((pt) => ({ x: pt.x, y: pt.y, level: pt.level }));
  },
  getNearestTileForSeeker() {
    return worldToNearestTile(seeker.x, seeker.y);
  },
  getSnapshot() {
    return {
      phaseTimeLeft,
      seeker: {
        x: seeker.x,
        y: seeker.y,
        level: seeker.level,
        currentSearchLevel: seeker.currentSearchLevel,
        searchIndex: seeker.searchIndex,
        stillTimer: seeker.stillTimer
      },
      hider: {
        x: hiders[0].x,
        y: hiders[0].y,
        level: hiders[0].level,
        found: hiders[0].found
      },
      debugEvents: seekerDebug.events.slice()
    };
  }
};
`;

  vm.runInContext(source + '\n' + exportSource, sandbox, { filename: 'game-test-harness.js' });
  return sandbox.__testHooks;
}

function runBasement2StressTest() {
  const hooks = loadGameHooks();
  const spawnPoints = hooks.getBasementSpawnPoints();
  const sampledPoints = [];

  for (let index = 0; index < spawnPoints.length; index += Math.max(1, Math.floor(spawnPoints.length / 18))) {
    sampledPoints.push(spawnPoints[index]);
  }

  const failures = [];
  const summaries = [];

  for (const point of sampledPoints) {
    hooks.setupBasementTrial(point);

    let sameTileFrames = 0;
    let previousTileKey = '';
    let enteredBasement = false;

    for (let stepIndex = 0; stepIndex < 1200; stepIndex++) {
      hooks.step(0.05);
      const snapshot = hooks.getSnapshot();
      const currentTile = hooks.getNearestTileForSeeker();
      const tileKey = `${currentTile.tx},${currentTile.ty}`;

      if (snapshot.seeker.level === 0) {
        enteredBasement = true;
        sameTileFrames = tileKey === previousTileKey ? sameTileFrames + 1 : 0;
      } else {
        sameTileFrames = 0;
      }
      previousTileKey = tileKey;

      if (snapshot.hider.found) {
        summaries.push({
          target: point,
          steps: stepIndex + 1,
          recoveries: snapshot.debugEvents.filter((event) => event.type === 'stuck-recovery' && event.level === 0).length
        });
        break;
      }

      if (sameTileFrames >= 120) {
        failures.push({
          target: point,
          reason: 'seeker remained on same Basement 2 tile for >= 6 seconds',
          snapshot
        });
        break;
      }

      if (stepIndex === 1199) {
        failures.push({
          target: point,
          reason: 'seeker did not catch hider within 60 simulated seconds',
          snapshot
        });
      }
    }

    if (!enteredBasement) {
      failures.push({
        target: point,
        reason: 'seeker never reached Basement 2 during trial',
        snapshot: hooks.getSnapshot()
      });
    }
  }

  return {
    totalTrials: sampledPoints.length,
    passedTrials: summaries.length,
    failedTrials: failures.length,
    maxRecoveriesOnPass: summaries.reduce((max, summary) => Math.max(max, summary.recoveries), 0),
    failures
  };
}

const result = runBasement2StressTest();
console.log(JSON.stringify(result, null, 2));
