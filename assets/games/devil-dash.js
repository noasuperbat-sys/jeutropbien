const DevilDash = (() => {
  const WIDTH = 960;
  const HEIGHT = 540;
  const PLAYER_W = 30;
  const PLAYER_H = 36;
  const GRAVITY = 1850;
  const MOVE_SPEED = 250;
  const JUMP_SPEED = 650;
  const PROGRESS_KEY = "devilDashProgress";

  const LEVELS = [
    {
      name: "Ça commence bien",
      start: [70, 420],
      goal: [850, 405],
      platforms: [
        ["ground-a", 0, 470, 410, 70],
        ["ground-b", 470, 470, 490, 70]
      ],
      spikes: [[410, 446, 60, 24]]
    },
    {
      name: "Le sol est timide",
      start: [70, 420],
      goal: [850, 405],
      platforms: [
        ["ground-a", 0, 470, 325, 70],
        ["fall-one", 360, 420, 145, 20],
        ["ground-b", 540, 470, 420, 70]
      ],
      spikes: [[325, 446, 215, 24]],
      traps: [{ type: "fall", id: "fall-one", trigger: 300, delay: 1.1 }]
    },
    {
      name: "Surprise",
      start: [55, 420],
      goal: [850, 405],
      platforms: [["ground", 0, 470, 960, 70]],
      hiddenSpikes: [
        { x: 360, y: 446, w: 72, h: 24, trigger: 305 },
        { x: 650, y: 446, w: 72, h: 24, trigger: 600 }
      ]
    },
    {
      name: "La porte a des jambes",
      start: [55, 420],
      goal: [770, 405],
      platforms: [
        ["ground-a", 0, 470, 300, 70],
        ["step", 350, 410, 160, 20],
        ["ground-b", 560, 470, 400, 70]
      ],
      spikes: [[300, 446, 50, 24], [510, 446, 50, 24]],
      traps: [{ type: "runGoal", trigger: 690, distance: 105 }]
    },
    {
      name: "Ne lève pas les yeux",
      start: [55, 420],
      goal: [850, 405],
      platforms: [["ground", 0, 470, 960, 70]],
      blocks: [["ceiling", 410, 40, 110, 38]],
      traps: [{ type: "drop", id: "ceiling", trigger: 345, delay: 0.18, targetY: 365 }]
    },
    {
      name: "Presque gentil",
      start: [60, 420],
      goal: [850, 405],
      platforms: [
        ["ground-a", 0, 470, 245, 70],
        ["vanish", 290, 415, 180, 20],
        ["middle", 515, 355, 155, 20],
        ["ground-b", 715, 470, 245, 70]
      ],
      spikes: [[245, 446, 470, 24]],
      traps: [{ type: "vanish", id: "vanish", trigger: 315, delay: 1.05 }]
    },
    {
      name: "Le mur veut un câlin",
      start: [70, 420],
      goal: [850, 405],
      platforms: [["ground", 0, 470, 960, 70]],
      blocks: [["wall", -90, 260, 90, 210]],
      traps: [{ type: "chase", id: "wall", trigger: 150, speed: 185 }]
    },
    {
      name: "Elle descend",
      start: [55, 420],
      goal: [850, 405],
      platforms: [
        ["ground-a", 0, 470, 300, 70],
        ["lift", 350, 410, 170, 20],
        ["middle", 565, 355, 170, 20],
        ["ground-b", 780, 470, 180, 70]
      ],
      spikes: [[300, 446, 480, 24]],
      traps: [{ type: "sink", id: "lift", trigger: 370, delay: 1.05, speed: 82 }]
    },
    {
      name: "Le plafond aussi joue",
      start: [60, 420],
      goal: [850, 405],
      platforms: [["ground", 0, 470, 960, 70]],
      blocks: [
        ["crusher-a", 320, 40, 95, 40],
        ["crusher-b", 560, 40, 95, 40]
      ],
      traps: [
        { type: "drop", id: "crusher-a", trigger: 265, delay: 0.08, targetY: 365 },
        { type: "drop", id: "crusher-b", trigger: 505, delay: 0.28, targetY: 365 }
      ]
    },
    {
      name: "Retour interdit",
      start: [60, 420],
      goal: [850, 405],
      platforms: [
        ["ground-a", 0, 470, 360, 70],
        ["bridge", 360, 470, 210, 70],
        ["ground-b", 570, 470, 390, 70]
      ],
      hiddenSpikes: [{ x: 700, y: 446, w: 65, h: 24, trigger: 650 }],
      traps: [{ type: "collapseBehind", id: "bridge", trigger: 600, delay: 0.12 }]
    },
    {
      name: "Tout était faux",
      start: [55, 420],
      goal: [820, 405],
      platforms: [
        ["ground-a", 0, 470, 250, 70],
        ["fake-a", 310, 405, 120, 20],
        ["fake-b", 490, 340, 120, 20],
        ["ground-b", 680, 470, 280, 70]
      ],
      spikes: [[250, 446, 430, 24]],
      traps: [
        { type: "vanish", id: "fake-a", trigger: 280, delay: 0.55 },
        { type: "fall", id: "fake-b", trigger: 455, delay: 0.22 },
        { type: "fakeGoal", trigger: 735 }
      ]
    },
    {
      name: "Premier examen",
      start: [55, 420],
      goal: [855, 405],
      platforms: [
        ["ground-a", 0, 470, 250, 70],
        ["step-a", 315, 410, 115, 20],
        ["step-b", 495, 350, 115, 20],
        ["ground-b", 675, 470, 285, 70]
      ],
      blocks: [["final-block", 535, 40, 105, 38]],
      spikes: [[250, 446, 425, 24]],
      hiddenSpikes: [{ x: 745, y: 446, w: 62, h: 24, trigger: 690 }],
      traps: [
        { type: "fall", id: "step-a", trigger: 280, delay: 0.42 },
        { type: "vanish", id: "step-b", trigger: 465, delay: 0.62 },
        { type: "drop", id: "final-block", trigger: 500, delay: 0.35, targetY: 398 },
        { type: "runGoal", trigger: 785, distance: 55 }
      ]
    },
    {
      name: "Deux petits trous",
      start: [55, 420],
      goal: [855, 405],
      platforms: [
        ["ground-a", 0, 470, 300, 70],
        ["ground-b", 355, 470, 230, 70],
        ["ground-c", 640, 470, 320, 70]
      ],
      spikes: [[300, 446, 55, 24], [585, 446, 55, 24]]
    },
    {
      name: "Un pic de plus",
      start: [55, 420],
      goal: [855, 405],
      platforms: [["ground", 0, 470, 960, 70]],
      hiddenSpikes: [
        { x: 420, y: 446, w: 60, h: 24, trigger: 365 }
      ]
    },
    {
      name: "Le pont fragile",
      start: [55, 420],
      goal: [855, 405],
      platforms: [
        ["ground-a", 0, 470, 315, 70],
        ["fall-bridge", 350, 430, 190, 20],
        ["ground-b", 575, 470, 385, 70]
      ],
      spikes: [[315, 446, 260, 24]],
      traps: [{ type: "fall", id: "fall-bridge", trigger: 315, delay: 1.15 }]
    },
    {
      name: "Reviens ici",
      start: [55, 420],
      goal: [775, 405],
      platforms: [["ground", 0, 470, 960, 70]],
      traps: [{ type: "runGoal", trigger: 700, distance: 95 }]
    },
    {
      name: "Escalier normal",
      start: [55, 420],
      goal: [855, 405],
      platforms: [
        ["ground-a", 0, 470, 260, 70],
        ["step-a", 310, 410, 150, 20],
        ["step-b", 510, 350, 150, 20],
        ["ground-b", 710, 470, 250, 70]
      ],
      spikes: [[260, 446, 450, 24]]
    },
    {
      name: "Il faut repartir",
      start: [55, 420],
      goal: [855, 405],
      platforms: [
        ["ground-a", 0, 470, 270, 70],
        ["vanish-a", 320, 410, 175, 20],
        ["ground-b", 545, 470, 415, 70]
      ],
      spikes: [[270, 446, 275, 24]],
      traps: [{ type: "vanish", id: "vanish-a", trigger: 345, delay: 1.05 }]
    },
    {
      name: "Cours devant lui",
      start: [80, 420],
      goal: [855, 405],
      platforms: [
        ["ground-a", 0, 470, 415, 70],
        ["ground-b", 465, 470, 495, 70]
      ],
      blocks: [["wall", -90, 260, 90, 210]],
      spikes: [[415, 446, 50, 24]],
      traps: [{ type: "chase", id: "wall", trigger: 145, speed: 170 }]
    },
    {
      name: "Ascenseur en panne",
      start: [55, 420],
      goal: [855, 405],
      platforms: [
        ["ground-a", 0, 470, 300, 70],
        ["sink-a", 350, 410, 180, 20],
        ["ground-b", 580, 470, 380, 70]
      ],
      spikes: [[300, 446, 280, 24]],
      traps: [{ type: "sink", id: "sink-a", trigger: 370, delay: 1.1, speed: 78 }]
    },
    {
      name: "Baisse la tête",
      start: [55, 420],
      goal: [855, 405],
      platforms: [["ground", 0, 470, 960, 70]],
      blocks: [["crusher", 455, 45, 105, 38]],
      traps: [{ type: "drop", id: "crusher", trigger: 390, delay: 0.35, targetY: 365 }]
    },
    {
      name: "Encore presque",
      start: [55, 420],
      goal: [805, 405],
      platforms: [["ground", 0, 470, 960, 70]],
      traps: [{ type: "fakeGoal", trigger: 735 }]
    },
    {
      name: "Saute deux fois",
      start: [55, 420],
      goal: [855, 405],
      platforms: [["ground", 0, 470, 960, 70]],
      hiddenSpikes: [
        { x: 330, y: 446, w: 62, h: 24, trigger: 280 },
        { x: 625, y: 446, w: 62, h: 24, trigger: 575 }
      ]
    },
    {
      name: "Deux secondes",
      start: [55, 420],
      goal: [855, 405],
      platforms: [
        ["ground-a", 0, 470, 255, 70],
        ["fall-a", 305, 415, 150, 20],
        ["fall-b", 505, 355, 150, 20],
        ["ground-b", 705, 470, 255, 70]
      ],
      spikes: [[255, 446, 450, 24]],
      traps: [
        { type: "fall", id: "fall-a", trigger: 275, delay: 1.05 },
        { type: "fall", id: "fall-b", trigger: 475, delay: 1.05 }
      ]
    },
    {
      name: "Le mur et le pic",
      start: [75, 420],
      goal: [855, 405],
      platforms: [["ground", 0, 470, 960, 70]],
      blocks: [["wall", -90, 260, 90, 210]],
      hiddenSpikes: [{ x: 610, y: 446, w: 65, h: 24, trigger: 555 }],
      traps: [{ type: "chase", id: "wall", trigger: 140, speed: 180 }]
    },
    {
      name: "Rouge puis descente",
      start: [55, 420],
      goal: [855, 405],
      platforms: [
        ["ground-a", 0, 470, 255, 70],
        ["vanish-a", 305, 415, 160, 20],
        ["sink-a", 515, 355, 160, 20],
        ["ground-b", 725, 470, 235, 70]
      ],
      spikes: [[255, 446, 470, 24]],
      traps: [
        { type: "vanish", id: "vanish-a", trigger: 330, delay: 1.1 },
        { type: "sink", id: "sink-a", trigger: 540, delay: 1.05, speed: 82 }
      ]
    },
    {
      name: "Pluie de blocs",
      start: [55, 420],
      goal: [855, 405],
      platforms: [["ground", 0, 470, 960, 70]],
      blocks: [
        ["crusher-a", 310, 40, 92, 38],
        ["crusher-b", 555, 40, 92, 38]
      ],
      traps: [
        { type: "drop", id: "crusher-a", trigger: 255, delay: 0.3, targetY: 365 },
        { type: "drop", id: "crusher-b", trigger: 500, delay: 0.4, targetY: 365 }
      ]
    },
    {
      name: "Trois mensonges",
      start: [60, 420],
      goal: [820, 405],
      platforms: [
        ["ground-a", 0, 470, 270, 70],
        ["fall-a", 320, 410, 165, 20],
        ["ground-b", 535, 470, 425, 70]
      ],
      spikes: [[270, 446, 265, 24]],
      hiddenSpikes: [{ x: 650, y: 446, w: 62, h: 24, trigger: 600 }],
      traps: [
        { type: "fall", id: "fall-a", trigger: 290, delay: 1 },
        { type: "runGoal", trigger: 750, distance: 60 }
      ]
    },
    {
      name: "Avant-dernier effort",
      start: [55, 420],
      goal: [855, 405],
      platforms: [
        ["ground-a", 0, 470, 245, 70],
        ["vanish-a", 295, 415, 150, 20],
        ["fall-b", 495, 355, 150, 20],
        ["ground-b", 695, 470, 265, 70]
      ],
      blocks: [["crusher", 520, 35, 100, 38]],
      spikes: [[245, 446, 450, 24]],
      traps: [
        { type: "vanish", id: "vanish-a", trigger: 320, delay: 1.05 },
        { type: "fall", id: "fall-b", trigger: 465, delay: 1.05 },
        { type: "drop", id: "crusher", trigger: 470, delay: 0.5, targetY: 250 }
      ]
    },
    {
      name: "Le vrai dernier mensonge",
      start: [70, 420],
      goal: [810, 405],
      platforms: [
        ["ground-a", 0, 470, 260, 70],
        ["sink-a", 310, 410, 155, 20],
        ["vanish-b", 515, 350, 155, 20],
        ["ground-b", 720, 470, 240, 70]
      ],
      blocks: [["wall", -90, 260, 90, 210]],
      spikes: [[260, 446, 460, 24]],
      hiddenSpikes: [{ x: 785, y: 446, w: 55, h: 24, trigger: 740 }],
      traps: [
        { type: "chase", id: "wall", trigger: 145, speed: 165 },
        { type: "sink", id: "sink-a", trigger: 335, delay: 1.05, speed: 78 },
        { type: "vanish", id: "vanish-b", trigger: 540, delay: 1.05 },
        { type: "runGoal", trigger: 750, distance: 70 }
      ]
    }
  ];

  let canvas;
  let ctx;
  let stage;
  let animationId = 0;
  let lastTime = 0;
  let running = false;
  let levelIndex = 0;
  let unlocked = 1;
  let deaths = 0;
  let level;
  let player;
  let solids = [];
  let spikes = [];
  let trapState = [];
  let particles = [];
  let message = "";
  let messageLife = 0;
  let won = false;
  let dead = false;
  let deathTimer = 0;
  let screenShake = 0;
  let pixelRatio = 1;
  let controls = { left: false, right: false, jump: false, jumpPressed: false };

  function start() {
    setup();
    loadProgress();
    levelIndex = Math.min(unlocked - 1, LEVELS.length - 1);
    loadLevel(levelIndex);
    running = true;
    cancelAnimationFrame(animationId);
    lastTime = performance.now();
    animationId = requestAnimationFrame(loop);
  }

  function setup() {
    canvas = document.getElementById("devilCanvas");
    stage = document.getElementById("devilStage");
    if (!canvas || !stage || canvas.dataset.ready) return;
    ctx = canvas.getContext("2d");
    pixelRatio = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
    canvas.width = Math.round(WIDTH * pixelRatio);
    canvas.height = Math.round(HEIGHT * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    canvas.dataset.ready = "1";
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    stage.addEventListener("pointerdown", unlockAudio, { passive: true });
  }

  function loadProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
      unlocked = Math.max(1, Math.min(LEVELS.length, Number(saved.unlocked) || 1));
      deaths = Math.max(0, Number(saved.deaths) || 0);
    } catch (error) {
      unlocked = 1;
      deaths = 0;
    }
  }

  function saveProgress() {
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify({ unlocked, deaths }));
    } catch (error) {}
  }

  function loadLevel(index) {
    levelIndex = Math.max(0, Math.min(index, LEVELS.length - 1));
    level = JSON.parse(JSON.stringify(LEVELS[levelIndex]));
    player = {
      x: level.start[0],
      y: level.start[1],
      vx: 0,
      vy: 0,
      grounded: false,
      face: 1,
      squash: 0,
      coyote: 0
    };
    solids = (level.platforms || []).map(item => makeSolid(item, "platform"));
    solids.push(...(level.blocks || []).map(item => makeSolid(item, "block")));
    spikes = (level.spikes || []).map(item => ({ x: item[0], y: item[1], w: item[2], h: item[3], rise: 1 }));
    spikes.push(...(level.hiddenSpikes || []).map(item => ({
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      rise: 0,
      hidden: true,
      trigger: item.trigger,
      triggered: false
    })));
    trapState = (level.traps || []).map(trap => ({ ...trap, active: false, time: 0, done: false }));
    particles = [];
    dead = false;
    won = false;
    deathTimer = 0;
    screenShake = 0;
    controls.left = false;
    controls.right = false;
    controls.jump = false;
    controls.jumpPressed = false;
    setMessage(level.name, 1.4);
    updateHud();
  }

  function makeSolid(item, kind) {
    return {
      id: item[0],
      x: item[1],
      y: item[2],
      w: item[3],
      h: item[4],
      kind,
      active: true,
      vx: 0,
      vy: 0,
      falling: false,
      warning: 0
    };
  }

  function restart() {
    if (!level) return;
    loadLevel(levelIndex);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(animationId);
    releaseControls();
  }

  function nextLevel() {
    if (!won) return;
    if (levelIndex >= LEVELS.length - 1) {
      loadLevel(0);
      return;
    }
    loadLevel(levelIndex + 1);
  }

  function loop(now) {
    if (!running) return;
    const dt = Math.min(0.025, Math.max(0.001, (now - lastTime) / 1000));
    lastTime = now;
    update(dt);
    draw(now);
    animationId = requestAnimationFrame(loop);
  }

  function update(dt) {
    updateParticles(dt);
    if (messageLife > 0) messageLife -= dt;
    if (screenShake > 0) screenShake = Math.max(0, screenShake - dt * 20);
    if (won) return;
    if (dead) {
      deathTimer -= dt;
      if (deathTimer <= 0) loadLevel(levelIndex);
      return;
    }

    const direction = (controls.right ? 1 : 0) - (controls.left ? 1 : 0);
    player.vx += (direction * MOVE_SPEED - player.vx) * Math.min(1, dt * (player.grounded ? 18 : 9));
    if (!direction) player.vx *= Math.pow(0.0008, dt);
    if (direction) player.face = direction;

    player.coyote = player.grounded ? 0.1 : Math.max(0, player.coyote - dt);
    if (controls.jumpPressed && player.coyote > 0) {
      player.vy = -JUMP_SPEED;
      player.grounded = false;
      player.coyote = 0;
      player.squash = -0.22;
      burst(player.x + PLAYER_W / 2, player.y + PLAYER_H, "#ffffff", 7);
      beep(360, 0.055, "square", 0.035);
    }
    controls.jumpPressed = false;
    if (!controls.jump && player.vy < -220) player.vy += GRAVITY * dt * 1.55;
    player.vy += GRAVITY * dt;
    player.vy = Math.min(player.vy, 900);

    updateTraps(dt);
    movePlayerX(dt);
    movePlayerY(dt);
    player.squash += (0 - player.squash) * Math.min(1, dt * 12);

    for (const spike of spikes) {
      if (spike.hidden && !spike.triggered && player.x + PLAYER_W > spike.trigger) {
        spike.triggered = true;
        beep(115, 0.08, "sawtooth", 0.045);
      }
      if (spike.triggered) spike.rise = Math.min(1, spike.rise + dt * 10);
      if (spike.rise > 0.55 && overlap(player, spikeHitbox(spike))) die("Des pics. Évidemment.");
    }

    const goal = currentGoal();
    if (overlap(player, goal)) complete();
    if (player.y > HEIGHT + 80 || player.x < -100 || player.x > WIDTH + 100) die("Plouf.");
  }

  function movePlayerX(dt) {
    player.x += player.vx * dt;
    for (const solid of solids) {
      if (!solid.active || !overlap(player, solid)) continue;
      if (player.vx > 0) player.x = solid.x - PLAYER_W;
      else if (player.vx < 0) player.x = solid.x + solid.w;
      player.vx = 0;
      if (solid.kind === "block" && Math.abs(solid.vx) > 20) die("Le mur était pressé.");
    }
  }

  function movePlayerY(dt) {
    const oldBottom = player.y + PLAYER_H;
    player.y += player.vy * dt;
    player.grounded = false;
    for (const solid of solids) {
      if (!solid.active || !overlap(player, solid)) continue;
      if (player.vy >= 0 && oldBottom <= solid.y + 9) {
        player.y = solid.y - PLAYER_H;
        if (player.vy > 220) {
          player.squash = 0.2;
          burst(player.x + PLAYER_W / 2, player.y + PLAYER_H, "#d8d8d8", 5);
        }
        player.vy = Math.min(0, solid.vy);
        player.grounded = true;
      } else if (player.vy < 0) {
        player.y = solid.y + solid.h;
        player.vy = 0;
      } else {
        die("Écrasé. C'était rapide.");
      }
    }
  }

  function updateTraps(dt) {
    for (const trap of trapState) {
      const solid = trap.id ? solids.find(item => item.id === trap.id) : null;
      if (!trap.active && player.x + PLAYER_W > trap.trigger) {
        trap.active = true;
        trap.time = 0;
        if ((trap.type === "vanish" || trap.type === "sink") && solid) {
          solid.warning = 0.01;
          setMessage(trap.type === "sink" ? "Elle va descendre !" : "La plateforme va disparaître !", 1);
          beep(210, 0.06, "square", 0.035);
        }
      }
      if (!trap.active || trap.done) continue;
      trap.time += dt;

      if (trap.type === "fall" && solid && trap.time >= trap.delay) {
        solid.falling = true;
        solid.vy += GRAVITY * dt * 0.72;
        solid.y += solid.vy * dt;
      }
      if (trap.type === "vanish" && solid) {
        solid.warning = Math.min(1, trap.time / trap.delay);
        if (trap.time >= trap.delay) {
          solid.active = false;
          trap.done = true;
          burst(solid.x + solid.w / 2, solid.y, "#ef4444", 18);
          beep(105, 0.07, "square", 0.04);
        }
      }
      if (trap.type === "drop" && solid && trap.time >= trap.delay) {
        solid.vy = Math.min(720, solid.vy + GRAVITY * dt * 1.3);
        solid.y = Math.min(trap.targetY, solid.y + solid.vy * dt);
        if (solid.y >= trap.targetY) {
          trap.done = true;
          screenShake = 9;
          burst(solid.x + solid.w / 2, solid.y + solid.h, "#222222", 18);
          beep(70, 0.12, "sawtooth", 0.055);
        }
      }
      if (trap.type === "chase" && solid) {
        solid.vx = trap.speed;
        solid.x += solid.vx * dt;
      }
      if (trap.type === "sink" && solid) {
        solid.warning = Math.min(1, trap.time / trap.delay);
        if (trap.time >= trap.delay) solid.y += trap.speed * dt;
      }
      if (trap.type === "collapseBehind" && solid && trap.time >= trap.delay) {
        solid.active = false;
        trap.done = true;
        burst(solid.x + solid.w / 2, solid.y, "#111111", 20);
      }
      if (trap.type === "runGoal") {
        level.goal[0] = Math.min(WIDTH - 45, level.goal[0] + trap.distance * dt * 2.5);
        if (level.goal[0] >= WIDTH - 45) trap.done = true;
      }
      if (trap.type === "fakeGoal" && trap.time > 0.08) {
        level.goal[0] = 895;
        trap.done = true;
        setMessage("Presque.", 1.1);
      }
    }
  }

  function currentGoal() {
    return { x: level.goal[0], y: level.goal[1], w: 36, h: 65 };
  }

  function spikeHitbox(spike) {
    const visibleH = spike.h * spike.rise;
    return { x: spike.x + 4, y: spike.y + spike.h - visibleH + 4, w: spike.w - 8, h: Math.max(1, visibleH - 4) };
  }

  function overlap(a, b) {
    return a.x < b.x + b.w && a.x + PLAYER_W > b.x && a.y < b.y + b.h && a.y + PLAYER_H > b.y;
  }

  function die(text) {
    if (dead || won) return;
    dead = true;
    deaths += 1;
    deathTimer = 0.72;
    screenShake = 12;
    saveProgress();
    setMessage(text, 0.7);
    burst(player.x + PLAYER_W / 2, player.y + PLAYER_H / 2, "#ef4444", 24);
    beep(90, 0.18, "sawtooth", 0.075);
    updateHud();
  }

  function complete() {
    if (won || dead) return;
    won = true;
    unlocked = Math.max(unlocked, Math.min(LEVELS.length, levelIndex + 2));
    saveProgress();
    burst(level.goal[0] + 18, level.goal[1] + 28, "#facc15", 42);
    beep(540, 0.08, "square", 0.045);
    setTimeout(() => beep(720, 0.12, "square", 0.04), 90);
    updateHud();
  }

  function burst(x, y, color, amount) {
    for (let i = 0; i < amount; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 190;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30,
        life: 0.35 + Math.random() * 0.45,
        maxLife: 0.8,
        color,
        size: 3 + Math.random() * 5
      });
    }
  }

  function updateParticles(dt) {
    for (const particle of particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 520 * dt;
    }
    particles = particles.filter(item => item.life > 0);
  }

  function draw(now) {
    if (!ctx || !level) return;
    ctx.save();
    const shakeX = screenShake ? (Math.random() - 0.5) * screenShake : 0;
    const shakeY = screenShake ? (Math.random() - 0.5) * screenShake : 0;
    ctx.translate(shakeX, shakeY);
    drawBackground();
    drawLevel();
    drawGoal(now);
    if (!dead) drawPlayer(now);
    drawParticles();
    if (messageLife > 0) drawMessage();
    if (won) drawWin();
    ctx.restore();
  }

  function drawBackground() {
    ctx.fillStyle = "#f4f0e6";
    ctx.fillRect(-20, -20, WIDTH + 40, HEIGHT + 40);
    ctx.fillStyle = "rgba(0,0,0,0.035)";
    for (let x = 20; x < WIDTH; x += 55) {
      for (let y = 20; y < HEIGHT; y += 55) {
        ctx.fillRect(x, y, 2, 2);
      }
    }
    ctx.fillStyle = "#171717";
    ctx.font = "900 18px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`NIVEAU ${levelIndex + 1}`, WIDTH / 2, 34);
  }

  function drawLevel() {
    for (const solid of solids) {
      if (!solid.active) continue;
      const warning = solid.warning || 0;
      const shake = warning > 0 ? Math.sin(performance.now() * 0.08) * warning * 4 : 0;
      ctx.fillStyle = warning > 0.15
        ? (Math.floor(warning * 10) % 2 ? "#ef4444" : "#7f1d1d")
        : (solid.kind === "block" ? "#292929" : "#111111");
      ctx.fillRect(solid.x + shake, solid.y, solid.w, solid.h);
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(solid.x + shake, solid.y, solid.w, 5);
    }
    for (const spike of spikes) {
      if (spike.rise <= 0) continue;
      const visibleH = spike.h * spike.rise;
      const count = Math.max(1, Math.round(spike.w / 24));
      const unit = spike.w / count;
      ctx.fillStyle = "#e11d48";
      for (let i = 0; i < count; i += 1) {
        ctx.beginPath();
        ctx.moveTo(spike.x + i * unit, spike.y + spike.h);
        ctx.lineTo(spike.x + i * unit + unit / 2, spike.y + spike.h - visibleH);
        ctx.lineTo(spike.x + (i + 1) * unit, spike.y + spike.h);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  function drawGoal(now) {
    const goal = currentGoal();
    const bob = Math.sin(now * 0.004) * 2;
    ctx.fillStyle = "#111111";
    ctx.fillRect(goal.x, goal.y + bob, goal.w, goal.h);
    ctx.fillStyle = "#facc15";
    ctx.fillRect(goal.x + 6, goal.y + 7 + bob, goal.w - 12, goal.h - 7);
    ctx.fillStyle = "#111111";
    ctx.beginPath();
    ctx.arc(goal.x + 26, goal.y + 37 + bob, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(250,204,21,0.24)";
    ctx.fillRect(goal.x - 9, goal.y - 8 + bob, goal.w + 18, goal.h + 16);
  }

  function drawPlayer(now) {
    const blink = Math.floor(now / 1800) % 5 === 0;
    const stretchX = 1 + player.squash;
    const stretchY = 1 - player.squash;
    ctx.save();
    ctx.translate(player.x + PLAYER_W / 2, player.y + PLAYER_H / 2);
    ctx.scale(stretchX, stretchY);
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 4;
    roundRect(-PLAYER_W / 2, -PLAYER_H / 2, PLAYER_W, PLAYER_H, 7);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#111111";
    if (blink) {
      ctx.fillRect(-8, -5, 5, 2);
      ctx.fillRect(4, -5, 5, 2);
    } else {
      ctx.beginPath();
      ctx.ellipse(-7, -5, 3, 5, 0, 0, Math.PI * 2);
      ctx.ellipse(7, -5, 3, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillRect(player.face > 0 ? 7 : -11, 7, 4, 2);
    ctx.restore();
  }

  function drawParticles() {
    for (const particle of particles) {
      ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawMessage() {
    ctx.font = "900 22px Arial";
    const width = Math.min(520, ctx.measureText(message).width + 44);
    ctx.fillStyle = "rgba(17,17,17,0.9)";
    roundRect(WIDTH / 2 - width / 2, 56, width, 44, 7);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText(message, WIDTH / 2, 85);
  }

  function drawWin() {
    ctx.fillStyle = "rgba(244,240,230,0.86)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "#111111";
    ctx.textAlign = "center";
    ctx.font = "1000 52px Arial";
    ctx.fillText(levelIndex === LEVELS.length - 1 ? "TU AS SURVÉCU !" : "NIVEAU TERMINÉ !", WIDTH / 2, 205);
    ctx.font = "800 22px Arial";
    ctx.fillText(`${deaths} mort${deaths > 1 ? "s" : ""} au total`, WIDTH / 2, 244);
    ctx.fillStyle = "#facc15";
    roundRect(WIDTH / 2 - 140, 285, 280, 74, 8);
    ctx.fill();
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = "#111111";
    ctx.font = "1000 25px Arial";
    ctx.fillText(levelIndex === LEVELS.length - 1 ? "RECOMMENCER" : "NIVEAU SUIVANT", WIDTH / 2, 332);
  }

  function setMessage(text, life) {
    message = text;
    messageLife = life;
  }

  function updateHud() {
    const levelEl = document.getElementById("devilLevel");
    const deathsEl = document.getElementById("devilDeaths");
    if (levelEl) levelEl.textContent = `${levelIndex + 1}/${LEVELS.length}`;
    if (deathsEl) deathsEl.textContent = deaths;
  }

  function keyDown(event) {
    if (!document.getElementById("devildash")?.classList.contains("active")) return;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", " ", "a", "d", "q"].includes(event.key)) event.preventDefault();
    if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a" || event.key.toLowerCase() === "q") controls.left = true;
    if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") controls.right = true;
    if (event.key === "ArrowUp" || event.key === " ") pressJump(true);
    if (event.key.toLowerCase() === "r") restart();
    if (event.key === "Enter" && won) nextLevel();
  }

  function keyUp(event) {
    if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a" || event.key.toLowerCase() === "q") controls.left = false;
    if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") controls.right = false;
    if (event.key === "ArrowUp" || event.key === " ") pressJump(false);
  }

  function pressControl(name, pressed) {
    if (name === "jump") {
      pressJump(pressed);
      return;
    }
    controls[name] = pressed;
  }

  function pressJump(pressed) {
    if (pressed && !controls.jump) controls.jumpPressed = true;
    controls.jump = pressed;
  }

  function releaseControls() {
    controls.left = false;
    controls.right = false;
    controls.jump = false;
    controls.jumpPressed = false;
  }

  function tapCanvas(event) {
    if (!won) return;
    event.preventDefault();
    nextLevel();
  }

  function roundRect(x, y, w, h, radius) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
  }

  let audioCtx;
  function unlockAudio() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
    } catch (error) {}
  }

  function beep(frequency, duration, type, volume) {
    try {
      unlockAudio();
      const oscillator = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gain.gain.value = volume;
      oscillator.connect(gain);
      gain.connect(audioCtx.destination);
      oscillator.start();
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      oscillator.stop(audioCtx.currentTime + duration);
    } catch (error) {}
  }

  return { start, stop, restart, nextLevel, pressControl, releaseControls, tapCanvas };
})();
