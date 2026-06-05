const MatchFactory = (() => {
  const LEVEL_KEY = "matchFactoryLevel";
  const SLOT_COUNT = 7;
  const MAX_LEVEL = 10;
  const PILE_WORLD = { x: 2.55, z: 3.28 };
  const PILE_FLOOR_Y = -0.18;
  const PILE_SUPPORT_STEP = 0.31;
  const COLOR_FILTER = { saturation: 1.18, brightness: 1.06 };
  const TYPES = {
    duck: { icon: "🐥", color: "#f2bf18", label: "Canard" },
    donut: { icon: "🍩", color: "#f062ad", label: "Donut" },
    juice: { icon: "🧃", color: "#e83f35", label: "Jus" },
    grape: { icon: "🍇", color: "#9b5cf6", label: "Raisin" },
    pumpkin: { icon: "🎃", color: "#f27a1f", label: "Citrouille" },
    apple: { icon: "🍏", color: "#8bdc32", label: "Pomme" },
    orange: { icon: "🍊", color: "#ff922e", label: "Orange" },
    melon: { icon: "🍉", color: "#2fd36b", label: "Pasteque" },
    carrot: { icon: "🥕", color: "#ff7a1d", label: "Carotte" },
    mushroom: { icon: "🍄", color: "#ee4ca1", label: "Champignon" },
    light: { icon: "🔦", color: "#36bdf4", label: "Lampe" },
    box: { icon: "📦", color: "#f0aa1c", label: "Boite" }
  };
  const typeKeys = Object.keys(TYPES);
  let canvas;
  let threeCanvas;
  let uiCanvas;
  let ctx;
  let uiCtx;
  let stage;
  let THREE3D = null;
  let threePromise = null;
  let renderer3D = null;
  let scene3D = null;
  let camera3D = null;
  let raycaster3D = null;
  let objectMeshes3D = new Map();
  let objectGroup3D = null;
  let floor3D = null;
  let materialCache3D = new Map();
  let width = 0;
  let height = 0;
  let dpr = 1;
  let initialized = false;
  let animationId = 0;
  let lastTime = 0;
  let mode = "lobby";
  let level = 1;
  let timeLeft = 90;
  let levelTimeLimit = 90;
  let objects = [];
  let slots = [];
  let targets = [];
  let flying = [];
  let particles = [];
  let shockwaves = [];

  function init() {
    if (initialized) return;
    canvas = document.getElementById("factoryCanvas");
    threeCanvas = document.getElementById("factoryThreeCanvas");
    uiCanvas = document.getElementById("factoryUiCanvas");
    stage = document.getElementById("factoryStage");
    ctx = canvas.getContext("2d");
    uiCtx = uiCanvas ? uiCanvas.getContext("2d") : null;
    stage.addEventListener("pointerdown", handlePointer);
    window.addEventListener("resize", resize);
    initThreeScene();
    initialized = true;
  }

  function initThreeScene() {
    if (!threeCanvas || threePromise) return;
    const sources = [
      "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
      "https://unpkg.com/three@0.160.0/build/three.module.js",
      "https://esm.sh/three@0.160.0"
    ];
    threePromise = loadThreeModule(sources)
      .then(module => {
        THREE3D = module;
        setupThreeRenderer();
        syncThreeObjects();
      })
      .catch(() => {
        THREE3D = null;
      });
  }

  async function loadThreeModule(sources) {
    let lastError = null;
    for (const source of sources) {
      try {
        return await import(source);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("Three.js indisponible");
  }

  function setupThreeRenderer() {
    if (!THREE3D || renderer3D || !threeCanvas) return;
    try {
      renderer3D = new THREE3D.WebGLRenderer({
        canvas: threeCanvas,
        alpha: true,
        antialias: true,
        powerPreference: "high-performance"
      });
    } catch (error) {
      renderer3D = null;
      THREE3D = null;
      return;
    }
    renderer3D.setClearColor(0x000000, 0);
    if ("outputColorSpace" in renderer3D && THREE3D.SRGBColorSpace) renderer3D.outputColorSpace = THREE3D.SRGBColorSpace;
    if ("toneMapping" in renderer3D && THREE3D.ACESFilmicToneMapping) renderer3D.toneMapping = THREE3D.ACESFilmicToneMapping;
    renderer3D.toneMappingExposure = 1.38;
    renderer3D.shadowMap.enabled = true;
    renderer3D.shadowMap.type = THREE3D.PCFSoftShadowMap;
    scene3D = new THREE3D.Scene();
    camera3D = new THREE3D.PerspectiveCamera(34, 1, 0.1, 100);
    raycaster3D = new THREE3D.Raycaster();
    objectGroup3D = new THREE3D.Group();
    scene3D.add(objectGroup3D);
    const ambient = new THREE3D.HemisphereLight(0xffffff, 0x29384a, 2.15);
    scene3D.add(ambient);
    const key = new THREE3D.DirectionalLight(0xffffff, 3.4);
    key.position.set(-4.5, 10.5, 5.5);
    key.castShadow = true;
    key.shadow.mapSize.width = 2048;
    key.shadow.mapSize.height = 2048;
    key.shadow.camera.left = -6;
    key.shadow.camera.right = 6;
    key.shadow.camera.top = 7;
    key.shadow.camera.bottom = -7;
    scene3D.add(key);
    const fill = new THREE3D.PointLight(0x8bd3ff, 2.1, 18);
    fill.position.set(4.8, 4.8, 4.2);
    scene3D.add(fill);
    const rim = new THREE3D.PointLight(0xffc27a, 1.25, 14);
    rim.position.set(-3.8, 3.2, -4);
    scene3D.add(rim);
    floor3D = new THREE3D.Mesh(
      new THREE3D.PlaneGeometry(7.2, 8.8),
      new THREE3D.ShadowMaterial({ color: 0x050b14, opacity: 0.34 })
    );
    floor3D.rotation.x = -Math.PI / 2;
    floor3D.position.y = -0.72;
    floor3D.receiveShadow = true;
    scene3D.add(floor3D);
    resizeThreeRenderer();
  }

  function resizeThreeRenderer() {
    if (!renderer3D || !camera3D || !threeCanvas) return;
    renderer3D.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer3D.setSize(width, height, false);
    camera3D.aspect = Math.max(0.1, width / height);
    const isMobile = width <= 700;
    camera3D.fov = isMobile ? 40 : 33;
    camera3D.position.set(0, isMobile ? 9.65 : 8.65, isMobile ? 8.6 : 7.45);
    camera3D.lookAt(0, 0.35, -0.08);
    camera3D.updateProjectionMatrix();
  }

  function start() {
    init();
    resize();
    level = Math.min(MAX_LEVEL, Math.max(1, Number(readStorage(LEVEL_KEY, 1)) || 1));
    showLobby();
    cancelAnimationFrame(animationId);
    lastTime = performance.now();
    animationId = requestAnimationFrame(loop);
  }

  function stop() {
    cancelAnimationFrame(animationId);
    if (threeCanvas) threeCanvas.style.display = "none";
  }

  function showLobby() {
    mode = "lobby";
    if (threeCanvas) threeCanvas.style.display = "none";
    const lobby = document.getElementById("factoryLobby");
    if (lobby) lobby.hidden = false;
    updateLobby();
    setMessage("Appuie sur Play.");
  }

  function play() {
    level = Math.min(MAX_LEVEL, level);
    const lobby = document.getElementById("factoryLobby");
    if (lobby) lobby.hidden = true;
    if (threeCanvas) threeCanvas.style.display = "block";
    buildLevel();
    mode = "play";
  }

  function pause() {
    if (mode === "play") {
      mode = "pause";
      setMessage("Pause. Appuie encore pour reprendre.");
      return;
    }
    if (mode === "pause") {
      mode = "play";
      setMessage("Trouve 3 objets identiques.");
    }
  }

  function buildLevel() {
    slots = Array(SLOT_COUNT).fill(null);
    flying = [];
    particles = [];
    shockwaves = [];
    levelTimeLimit = Math.max(70, 112 - level * 4);
    timeLeft = levelTimeLimit;
    const typeCount = Math.min(typeKeys.length, 4 + Math.floor(level * 0.65));
    const usableTypes = typeKeys.slice(0, typeCount);
    const targetCount = Math.min(4, 2 + Math.floor(level / 4));
    const shuffled = shuffle([...usableTypes]);
    targets = shuffled.slice(0, targetCount).map((type, index) => ({
      type,
      needed: 3 * (1 + Math.floor(level / 3) + (index % 2)),
      collected: 0
    }));
    objects = [];
    for (const target of targets) {
      for (let i = 0; i < target.needed; i += 1) addFactoryObject(target.type);
    }
    const targetTypes = new Set(targets.map(target => target.type));
    const fillerTypes = usableTypes.filter(type => !targetTypes.has(type));
    const fillerPool = fillerTypes.length ? fillerTypes : usableTypes;
    const fillerCount = 18 + level * 6;
    for (let i = 0; i < fillerCount; i += 1) {
      addFactoryObject(fillerPool[i % fillerPool.length]);
    }
    objects = arrangeFactoryPile(shuffle(objects));
    setMessage("Trouve 3 objets identiques.");
    updateHud();
    syncThreeObjects();
  }

  function addFactoryObject(type) {
    const bounds = playBounds();
    const margin = width <= 700 ? 54 : 68;
    const x = bounds.x + margin + Math.random() * Math.max(1, bounds.w - margin * 2);
    const y = bounds.y + margin + Math.random() * Math.max(1, bounds.h - margin * 2 - 20);
    const scale = (width <= 700 ? 0.66 : 0.76) + Math.random() * 0.22;
    objects.push({ id: `${type}-${Date.now()}-${Math.random()}`, type, x, y, scale, picked: false });
  }

  function arrangeFactoryPile(list) {
    const arranged = [];
    const count = Math.max(1, list.length);
    for (let i = 0; i < list.length; i += 1) {
      const object = list[i];
      const ring = Math.sqrt((i + 0.5) / count);
      const angle = i * 2.399963 + Math.random() * 0.28;
      const noiseX = (Math.random() - 0.5) * 0.34;
      const noiseZ = (Math.random() - 0.5) * 0.44;
      const layer = Math.floor(i / 11);
      let worldX = Math.cos(angle) * ring * PILE_WORLD.x + noiseX;
      let worldZ = Math.sin(angle) * ring * PILE_WORLD.z + noiseZ;
      const ellipseDistance = Math.sqrt((worldX / PILE_WORLD.x) ** 2 + (worldZ / PILE_WORLD.z) ** 2);
      if (ellipseDistance > 0.94) {
        const clamp = 0.94 / ellipseDistance;
        worldX *= clamp;
        worldZ *= clamp;
      }
      const worldY = PILE_FLOOR_Y + Math.min(1.45, layer * 0.18 + Math.random() * 0.22);
      const scale = 0.86 + Math.random() * 0.26;
      const arrangedObject = {
        ...object,
        z: i,
        depth: Math.max(0.08, Math.min(0.98, 0.5 + worldZ / (PILE_WORLD.z * 2))),
        worldX,
        worldY,
        worldZ,
        scale,
        lift: 0,
        angle: Math.random() * Math.PI * 2,
        tiltX: (Math.random() - 0.5) * 0.9,
        tiltZ: (Math.random() - 0.5) * 0.72,
        wobble: Math.random() * Math.PI * 2
      };
      updateScreenFromWorld(arrangedObject);
      arranged.push(arrangedObject);
    }
    relaxPileCollisions(arranged);
    arranged.forEach(updateScreenFromWorld);
    return arranged.sort((a, b) => (a.worldZ + a.worldY * 0.35) - (b.worldZ + b.worldY * 0.35));
  }

  function relaxPileCollisions(arranged) {
    const passes = 7;
    for (let pass = 0; pass < passes; pass += 1) {
      for (let i = 0; i < arranged.length; i += 1) {
        for (let j = i + 1; j < arranged.length; j += 1) {
          const a = arranged[i];
          const b = arranged[j];
          const sameLayer = Math.abs(a.worldY - b.worldY) < 0.42;
          if (!sameLayer) continue;
          let dx = b.worldX - a.worldX;
          let dz = b.worldZ - a.worldZ;
          let distance = Math.hypot(dx, dz);
          if (distance < 0.001) {
            dx = Math.random() - 0.5;
            dz = Math.random() - 0.5;
            distance = Math.hypot(dx, dz);
          }
          const minDistance = (collisionRadius(a) + collisionRadius(b)) * 0.58;
          if (distance >= minDistance) continue;
          const push = (minDistance - distance) * 0.42;
          const nx = dx / distance;
          const nz = dz / distance;
          a.worldX -= nx * push;
          a.worldZ -= nz * push;
          b.worldX += nx * push;
          b.worldZ += nz * push;
          keepInsidePile(a);
          keepInsidePile(b);
        }
      }
    }
  }

  function collisionRadius(object) {
    const typeBoost = {
      duck: 0.78,
      donut: 0.72,
      juice: 0.68,
      grape: 0.58,
      pumpkin: 0.74,
      carrot: 0.76,
      light: 0.68,
      box: 0.7
    };
    return (typeBoost[object.type] || 0.66) * object.scale;
  }

  function keepInsidePile(object) {
    const distance = Math.sqrt((object.worldX / PILE_WORLD.x) ** 2 + (object.worldZ / PILE_WORLD.z) ** 2);
    if (distance <= 0.96) return;
    const clamp = 0.96 / distance;
    object.worldX *= clamp;
    object.worldZ *= clamp;
  }

  function updateScreenFromWorld(object) {
    const bounds = playBounds();
    object.x = bounds.x + bounds.w / 2 + (object.worldX / PILE_WORLD.x) * bounds.w * 0.29;
    object.y = bounds.y + bounds.h / 2 + (object.worldZ / PILE_WORLD.z) * bounds.h * 0.32 - object.worldY * 22;
  }

  function applyPileGravity() {
    const sorted = [...objects].sort((a, b) => (a.worldY - b.worldY) || (a.worldZ - b.worldZ));
    const settled = [];
    for (const object of sorted) {
      const previousY = object.worldY;
      let supportedY = PILE_FLOOR_Y;
      for (const base of settled) {
        const distance = Math.hypot(object.worldX - base.worldX, object.worldZ - base.worldZ);
        const supportReach = (collisionRadius(object) + collisionRadius(base)) * 0.54;
        if (distance > supportReach) continue;
        supportedY = Math.max(supportedY, base.settledWorldY + PILE_SUPPORT_STEP * Math.min(1.12, (object.scale + base.scale) / 2));
      }
      const targetY = Math.min(1.55, supportedY);
      if (targetY < previousY - 0.035) {
        object.dropAmount = previousY - targetY;
        object.dropStartedAt = performance.now();
        object.worldY = targetY;
      } else {
        object.dropAmount = 0;
        object.worldY = previousY;
      }
      object.settledWorldY = object.worldY;
      settled.push(object);
    }
    relaxPileCollisions(objects);
    objects.forEach(object => {
      keepInsidePile(object);
      updateScreenFromWorld(object);
      delete object.settledWorldY;
    });
    objects.sort((a, b) => (a.worldZ + a.worldY * 0.35) - (b.worldZ + b.worldY * 0.35));
  }

  function handlePointer(event) {
    if (mode !== "play") return;
    event.preventDefault();
    const threeObject = pickThreeObject(event);
    if (threeObject && !threeObject.picked) {
      pickObject(threeObject);
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    for (let i = objects.length - 1; i >= 0; i -= 1) {
      const object = objects[i];
      if (object.picked) continue;
      if (Math.hypot(x - object.x, y - object.y) > objectRadius(object)) continue;
      pickObject(object);
      return;
    }
  }

  function pickThreeObject(event) {
    if (!renderer3D || !camera3D || !raycaster3D || !objectGroup3D || !threeCanvas) return null;
    const rect = threeCanvas.getBoundingClientRect();
    const pointer = new THREE3D.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -(((event.clientY - rect.top) / rect.height) * 2 - 1)
    );
    raycaster3D.setFromCamera(pointer, camera3D);
    const hits = raycaster3D.intersectObjects(objectGroup3D.children, true);
    for (const hit of hits) {
      const object = hit.object?.userData?.factoryObject;
      if (object && !object.picked) return object;
    }
    return null;
  }

  function pickObject(object) {
    const emptyIndex = slots.findIndex(slot => !slot);
    if (emptyIndex === -1) {
      lose("Barre pleine !");
      return;
    }
    updateScreenFromThree(object);
    object.picked = true;
    shockwaves.push({ x: object.x, y: object.y, life: 0.38, maxLife: 0.38, color: TYPES[object.type].color });
    slots[emptyIndex] = { type: object.type, moving: true };
    const slot = slotLayout()[emptyIndex];
    flying.push({
      type: object.type,
      fromX: object.x,
      fromY: object.y,
      toX: slot.x,
      toY: slot.y,
      progress: 0,
      slotIndex: emptyIndex,
      scale: object.scale,
      spin: object.angle
    });
    removeThreeObject(object);
    objects = objects.filter(item => item !== object);
    applyPileGravity();
    refreshThreeObjectTargets();
    setMessage("Encore 2 identiques pour faire un trio.");
  }

  function removeThreeObject(object) {
    const group = objectMeshes3D.get(object.id);
    if (group && objectGroup3D) objectGroup3D.remove(group);
    objectMeshes3D.delete(object.id);
  }

  function refreshThreeObjectTargets() {
    if (!THREE3D || !objectGroup3D) return;
    for (const object of objects) {
      const group = objectMeshes3D.get(object.id);
      if (!group) {
        syncThreeObjects();
        return;
      }
      const position = threePositionForObject(object);
      group.userData.targetWorldX = position.x;
      group.userData.targetWorldY = position.y;
      group.userData.targetWorldZ = position.z;
      if (typeof group.userData.visualWorldY !== "number") group.userData.visualWorldY = group.position.y;
    }
  }

  function updateScreenFromThree(object) {
    const group = objectMeshes3D.get(object.id);
    if (!group || !camera3D || !threeCanvas || !THREE3D) return;
    const projected = group.position.clone().project(camera3D);
    const rect = threeCanvas.getBoundingClientRect();
    object.x = (projected.x * 0.5 + 0.5) * rect.width;
    object.y = (-projected.y * 0.5 + 0.5) * rect.height;
  }

  function settleSlot(index) {
    if (slots[index]) slots[index].moving = false;
    const type = slots[index]?.type;
    if (!type) return;
    const same = slots
      .map((slot, slotIndex) => ({ slot, slotIndex }))
      .filter(item => item.slot && !item.slot.moving && item.slot.type === type)
      .map(item => item.slotIndex);
    if (same.length >= 3) {
      const removed = same.slice(0, 3);
      removed.forEach(slotIndex => {
        const slot = slotLayout()[slotIndex];
        burst(slot.x, slot.y, TYPES[type].color, 32);
        shockwaves.push({ x: slot.x, y: slot.y, life: 0.45, maxLife: 0.45, color: TYPES[type].color });
        slots[slotIndex] = null;
      });
      slots = compactSlots(slots);
      const target = targets.find(item => item.type === type);
      if (target) target.collected = Math.min(target.needed, target.collected + 3);
      setMessage("Trio !");
      updateHud();
      if (targets.every(item => item.collected >= item.needed)) completeLevel();
    } else if (!slots.some(slot => !slot)) {
      lose("Barre pleine !");
    }
  }

  function compactSlots(list) {
    const filled = list.filter(Boolean);
    return [...filled, ...Array(SLOT_COUNT - filled.length).fill(null)];
  }

  function completeLevel() {
    mode = "complete";
    const finishedAll = level >= MAX_LEVEL;
    level = finishedAll ? MAX_LEVEL : level + 1;
    writeStorage(LEVEL_KEY, level);
    setMessage(finishedAll ? "Les 10 niveaux sont termines !" : "Niveau reussi !");
    setTimeout(() => {
      if (!document.getElementById("matchfactory")?.classList.contains("active")) return;
      showLobby();
    }, 1000);
  }

  function lose(text) {
    mode = "over";
    burst(width / 2, height - 120, "#ef4444", 44);
    shockwaves.push({ x: width / 2, y: height - 120, life: 0.65, maxLife: 0.65, color: "#ef4444" });
    setMessage(`${text} La barre du bas n'a plus de place.`);
    setTimeout(() => {
      if (!document.getElementById("matchfactory")?.classList.contains("active")) return;
      showLobby();
    }, 1000);
  }

  function loop(now) {
    const dt = Math.min(0.04, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;
    update(dt);
    draw(now);
    if (document.getElementById("matchfactory")?.classList.contains("active")) {
      animationId = requestAnimationFrame(loop);
    }
  }

  function update(dt) {
    if (mode === "play") {
      timeLeft -= dt;
      if (timeLeft <= 0) lose("Temps ecoule !");
    }
    flying.forEach(item => item.progress += dt * 3.4);
    const arrived = flying.filter(item => item.progress >= 1);
    flying = flying.filter(item => item.progress < 1);
    arrived.forEach(item => settleSlot(item.slotIndex));
    particles.forEach(item => {
      item.life -= dt;
      item.x += item.vx * dt;
      item.y += item.vy * dt;
      item.vy += 210 * dt;
    });
    particles = particles.filter(item => item.life > 0);
    shockwaves.forEach(item => item.life -= dt);
    shockwaves = shockwaves.filter(item => item.life > 0);
    updateHud();
  }

  function draw(now) {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    if (uiCtx) uiCtx.clearRect(0, 0, width, height);
    drawFactoryBackground(now);
    if (mode === "lobby") {
      drawLobbyScene(now);
    } else {
      drawPlayfield(now);
    }
    drawUiLayer();
  }

  function drawUiLayer() {
    if (!uiCtx || mode === "lobby") return;
    const previousCtx = ctx;
    ctx = uiCtx;
    drawShockwaves();
    drawParticles();
    drawFlyingObjects();
    drawSlots();
    ctx = previousCtx;
  }

  function drawFactoryBackground(now) {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#2b3648");
    gradient.addColorStop(0.58, "#202c3b");
    gradient.addColorStop(1, "#172232");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    for (let i = 0; i < 7; i += 1) {
      const x = (i * 140 + now * 0.012) % (width + 80) - 40;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 28, 0);
      ctx.lineTo(x - 40, 74);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = "rgba(255,255,255,0.09)";
    for (let i = 0; i < 5; i += 1) {
      const x = 42 + i * Math.max(110, width / 5);
      roundedRect(x, 145 + (i % 2) * 76, 92, 30, 8, "rgba(255,238,192,0.28)", null, 0);
    }
  }

  function drawLobbyScene(now) {
    ctx.save();
    ctx.globalAlpha = 0.32;
    drawToyObject("duck", width * 0.2, height * 0.36 + Math.sin(now * 0.002) * 7, 1.3, -0.18);
    drawToyObject("donut", width * 0.82, height * 0.31 + Math.cos(now * 0.002) * 7, 1.22, 0.18);
    drawToyObject("pumpkin", width * 0.18, height * 0.7, 1.1, 0.25);
    drawToyObject("juice", width * 0.84, height * 0.72, 1.1, -0.38);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function renderThreeScene(now) {
    if (!renderer3D || !scene3D || !camera3D) return false;
    resizeThreeRenderer();
    if (objectGroup3D) {
      objectGroup3D.children.forEach((group, index) => {
        const object = group.userData.factoryObject;
        const pulse = Math.sin(now * 0.0011 + object.wobble) * 0.018;
        const targetX = group.userData.targetWorldX ?? group.position.x;
        const targetY = group.userData.targetWorldY ?? group.position.y;
        const targetZ = group.userData.targetWorldZ ?? group.position.z;
        if (typeof group.userData.visualWorldY !== "number") group.userData.visualWorldY = group.position.y;
        group.position.x += (targetX - group.position.x) * 0.18;
        group.position.z += (targetZ - group.position.z) * 0.18;
        group.userData.visualWorldY += (targetY - group.userData.visualWorldY) * 0.16;
        const falling = Math.abs(group.userData.visualWorldY - targetY) > 0.025;
        const squash = falling ? 1 + Math.min(0.1, Math.abs(group.userData.visualWorldY - targetY) * 0.06) : 1;
        group.scale.y = group.userData.baseScale * squash;
        group.rotation.y = group.userData.baseY + Math.sin(now * 0.00045 + index) * 0.035;
        group.rotation.x = group.userData.baseX + (falling ? Math.sin(now * 0.012 + index) * 0.035 : 0);
        group.rotation.z = group.userData.baseZ + (falling ? Math.cos(now * 0.011 + index) * 0.028 : 0);
        group.position.y = group.userData.visualWorldY + pulse;
      });
    }
    renderer3D.render(scene3D, camera3D);
    return true;
  }

  function syncThreeObjects() {
    if (!THREE3D || !objectGroup3D) return;
    objectGroup3D.clear();
    objectMeshes3D.clear();
    for (const object of objects) {
      const group = createThreeToy(object.type);
      const position = threePositionForObject(object);
      const scale = object.scale * (0.86 + object.depth * 0.22);
      group.position.set(position.x, position.y, position.z);
      group.scale.setScalar(scale);
      group.rotation.set(object.tiltX, object.angle, object.tiltZ);
      group.userData.factoryObject = object;
      group.userData.baseScale = scale;
      group.userData.baseX = group.rotation.x;
      group.userData.baseY = group.rotation.y;
      group.userData.baseZ = group.rotation.z;
      group.userData.targetWorldX = position.x;
      group.userData.targetWorldY = position.y;
      group.userData.targetWorldZ = position.z;
      group.userData.visualWorldY = position.y;
      group.traverse(child => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          child.userData.factoryObject = object;
        }
      });
      objectGroup3D.add(group);
      objectMeshes3D.set(object.id, group);
    }
  }

  function threePositionForObject(object) {
    return {
      x: object.worldX || 0,
      y: object.worldY || -0.15,
      z: object.worldZ || 0
    };
  }

  function createThreeToy(type) {
    const group = new THREE3D.Group();
    if (type === "duck") buildThreeDuck(group);
    else if (type === "donut") buildThreeDonut(group);
    else if (type === "juice") buildThreeJuice(group);
    else if (type === "grape") buildThreeGrape(group);
    else if (type === "pumpkin") buildThreePumpkin(group);
    else if (type === "apple") buildThreeRoundFruit(group, 0x8bdc32);
    else if (type === "orange") buildThreeRoundFruit(group, 0xff922e);
    else if (type === "melon") buildThreeMelon(group);
    else if (type === "carrot") buildThreeCarrot(group);
    else if (type === "mushroom") buildThreeMushroom(group);
    else if (type === "light") buildThreeLight(group);
    else buildThreeBox(group);
    return group;
  }

  function mat3D(color, roughness = 0.52) {
    const key = `${color}-${roughness}`;
    if (materialCache3D.has(key)) return materialCache3D.get(key);
    const filteredColor = filteredThreeColor(color);
    const material = new THREE3D.MeshStandardMaterial({
      color: filteredColor,
      roughness,
      metalness: 0.025,
      envMapIntensity: 0.65
    });
    materialCache3D.set(key, material);
    return material;
  }

  function filteredThreeColor(color) {
    const result = new THREE3D.Color(color);
    const hsl = {};
    result.getHSL(hsl);
    hsl.s = Math.min(1, hsl.s * COLOR_FILTER.saturation);
    hsl.l = Math.min(0.86, hsl.l * COLOR_FILTER.brightness + 0.015);
    result.setHSL(hsl.h, hsl.s, hsl.l);
    return result;
  }

  function addMesh3D(group, geometry, material, position = [0, 0, 0], scale = [1, 1, 1], rotation = [0, 0, 0]) {
    const mesh = new THREE3D.Mesh(geometry, material);
    mesh.position.set(position[0], position[1], position[2]);
    mesh.scale.set(scale[0], scale[1], scale[2]);
    mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
    group.add(mesh);
    return mesh;
  }

  function addGloss3D(group, position, scale = [1, 1, 1]) {
    const material = new THREE3D.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.48,
      roughness: 0.18,
      metalness: 0
    });
    return addMesh3D(group, new THREE3D.SphereGeometry(0.12, 16, 8), material, position, scale);
  }

  function buildThreeDuck(group) {
    addMesh3D(group, new THREE3D.SphereGeometry(0.52, 32, 18), mat3D(0xf2bf18), [0, 0, 0], [1.18, 0.72, 0.78]);
    addMesh3D(group, new THREE3D.SphereGeometry(0.32, 32, 18), mat3D(0xf2bf18), [0.44, 0.32, 0], [1, 1, 0.95]);
    addMesh3D(group, new THREE3D.ConeGeometry(0.16, 0.48, 24), mat3D(0xff922e), [0.78, 0.32, 0], [1, 1, 0.7], [0, 0, -Math.PI / 2]);
    addMesh3D(group, new THREE3D.SphereGeometry(0.08, 16, 8), mat3D(0x422006), [0.52, 0.44, -0.22], [1, 1, 1]);
    addMesh3D(group, new THREE3D.SphereGeometry(0.18, 16, 8), mat3D(0xf9e36d), [-0.24, 0.16, -0.32], [1.25, 0.48, 0.28], [-0.3, 0, -0.32]);
    addGloss3D(group, [-0.22, 0.22, -0.35], [1.9, 0.8, 0.55]);
  }

  function buildThreeDonut(group) {
    addMesh3D(group, new THREE3D.TorusGeometry(0.42, 0.17, 18, 48), mat3D(0xb45309), [0, 0, 0], [1, 0.9, 1], [Math.PI / 2, 0, 0]);
    addMesh3D(group, new THREE3D.TorusGeometry(0.43, 0.09, 18, 48), mat3D(0xf062ad), [0, 0.08, 0], [1, 0.9, 1], [Math.PI / 2, 0, 0]);
    [[-0.18, 0.18], [0.12, -0.2], [0.22, 0.08], [-0.08, -0.1]].forEach((p, index) => {
      addMesh3D(group, new THREE3D.BoxGeometry(0.07, 0.025, 0.2), mat3D([0xffffff, 0x22d3ee, 0xfacc15, 0xa3e635][index]), [p[0], 0.24, p[1]], [1, 1, 1], [0.2, index, 0.7]);
    });
    addGloss3D(group, [-0.14, 0.25, -0.2], [1.2, 0.28, 0.55]);
  }

  function buildThreeJuice(group) {
    addMesh3D(group, new THREE3D.BoxGeometry(0.58, 0.86, 0.34), mat3D(0xf8fafc), [0, 0, 0], [1, 1, 1], [0.08, 0.15, -0.06]);
    addMesh3D(group, new THREE3D.BoxGeometry(0.47, 0.45, 0.36), mat3D(0xe83f35), [0, -0.1, -0.02], [1, 1, 1], [0.08, 0.15, -0.06]);
    addMesh3D(group, new THREE3D.BoxGeometry(0.36, 0.1, 0.37), mat3D(0xffffff), [0, 0.28, -0.02], [1, 1, 1], [0.08, 0.15, -0.06]);
    addMesh3D(group, new THREE3D.BoxGeometry(0.1, 0.9, 0.35), mat3D(0xcbd5e1), [0.34, 0, -0.03], [1, 1, 1], [0.08, 0.15, -0.06]);
    addGloss3D(group, [-0.17, 0.2, -0.22], [0.65, 1.15, 0.28]);
  }

  function buildThreeGrape(group) {
    const material = mat3D(0x9b5cf6);
    [[0, 0.3], [-0.18, 0.14], [0.18, 0.14], [-0.08, -0.03], [0.1, -0.06], [0, -0.22]].forEach((p, index) => {
      addMesh3D(group, new THREE3D.SphereGeometry(0.18, 20, 12), material, [p[0], p[1], (index % 2) * 0.13], [1, 1, 1]);
    });
    addMesh3D(group, new THREE3D.SphereGeometry(0.12, 16, 8), mat3D(0x42d86b), [0.08, 0.52, 0], [1.4, 0.55, 0.9], [0.2, 0, -0.7]);
  }

  function buildThreePumpkin(group) {
    const material = mat3D(0xf27a1f);
    for (let i = -2; i <= 2; i += 1) {
      addMesh3D(group, new THREE3D.SphereGeometry(0.34, 24, 14), material, [i * 0.16, 0, 0], [0.7, 1, 0.92]);
    }
    addMesh3D(group, new THREE3D.CylinderGeometry(0.08, 0.09, 0.28, 12), mat3D(0x166534), [0, 0.46, 0], [1, 1, 1], [0.18, 0, 0]);
    addGloss3D(group, [-0.2, 0.18, -0.28], [1.4, 0.45, 0.45]);
  }

  function buildThreeRoundFruit(group, color) {
    addMesh3D(group, new THREE3D.SphereGeometry(0.48, 32, 18), mat3D(color), [0, 0, 0], [1, 0.95, 1]);
    addMesh3D(group, new THREE3D.SphereGeometry(0.11, 16, 8), mat3D(0xffffff, 0.35), [-0.18, 0.2, -0.32], [1.4, 0.6, 0.45], [-0.45, 0, -0.4]);
    addMesh3D(group, new THREE3D.CylinderGeometry(0.04, 0.05, 0.24, 10), mat3D(0x6b3b12), [0.04, 0.5, 0], [1, 1, 1], [0.25, 0, 0.1]);
    addMesh3D(group, new THREE3D.SphereGeometry(0.12, 16, 8), mat3D(0x22c55e), [0.16, 0.5, 0.04], [1.5, 0.48, 0.75], [0.35, 0, -0.55]);
  }

  function buildThreeMelon(group) {
    addMesh3D(group, new THREE3D.SphereGeometry(0.5, 32, 18), mat3D(0x2fd36b), [0, 0, 0], [1.1, 0.55, 1], [0, 0, 0]);
    addMesh3D(group, new THREE3D.BoxGeometry(0.7, 0.08, 0.55), mat3D(0xef4444), [0, 0.08, -0.02], [1, 1, 1]);
    [-0.18, 0, 0.18].forEach(x => addMesh3D(group, new THREE3D.SphereGeometry(0.035, 8, 6), mat3D(0x111827), [x, 0.14, -0.28], [1, 1.7, 1]));
    addGloss3D(group, [-0.18, 0.24, -0.28], [1.35, 0.35, 0.5]);
  }

  function buildThreeCarrot(group) {
    addMesh3D(group, new THREE3D.ConeGeometry(0.24, 1.08, 28), mat3D(0xff7a1d), [0.16, 0, 0], [1, 1, 0.85], [0, 0, -Math.PI / 2]);
    [-0.12, 0, 0.12].forEach((z, index) => {
      addMesh3D(group, new THREE3D.SphereGeometry(0.16, 14, 8), mat3D(0x42d86b), [-0.48, 0.1 + index * 0.06, z], [0.7, 1.35, 0.6], [0.4, 0, index - 1]);
    });
    addMesh3D(group, new THREE3D.TorusGeometry(0.18, 0.015, 8, 24), mat3D(0xc2410c), [0.1, 0.02, 0], [1, 1, 1], [Math.PI / 2, 0, 0.2]);
    addGloss3D(group, [0.05, 0.18, -0.18], [1.1, 0.35, 0.35]);
  }

  function buildThreeMushroom(group) {
    addMesh3D(group, new THREE3D.SphereGeometry(0.48, 32, 16), mat3D(0xee4ca1), [0, 0.22, 0], [1.1, 0.45, 1.05]);
    addMesh3D(group, new THREE3D.CylinderGeometry(0.18, 0.26, 0.58, 18), mat3D(0xfef3c7), [0, -0.18, 0], [1, 1, 1]);
    [[-0.2, 0.28, -0.18], [0.12, 0.35, 0.08], [0.24, 0.23, -0.06]].forEach(p => {
      addMesh3D(group, new THREE3D.SphereGeometry(0.08, 12, 8), mat3D(0xffffff), p, [1, 0.55, 1]);
    });
    addGloss3D(group, [-0.2, 0.34, -0.26], [1.2, 0.32, 0.5]);
  }

  function buildThreeLight(group) {
    addMesh3D(group, new THREE3D.CylinderGeometry(0.18, 0.24, 0.72, 24), mat3D(0x36bdf4), [0, 0, 0], [1, 1, 1], [0, 0, Math.PI / 2]);
    addMesh3D(group, new THREE3D.SphereGeometry(0.22, 20, 12), mat3D(0xe0f2fe, 0.2), [0.42, 0, 0], [1, 0.82, 0.82]);
    addMesh3D(group, new THREE3D.CylinderGeometry(0.11, 0.11, 0.38, 18), mat3D(0x075985), [-0.18, -0.22, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);
    addMesh3D(group, new THREE3D.ConeGeometry(0.42, 1.25, 28), new THREE3D.MeshBasicMaterial({ color: 0x9eeaff, transparent: true, opacity: 0.18, depthWrite: false }), [0.95, 0, 0], [1, 1, 0.65], [0, 0, -Math.PI / 2]);
  }

  function buildThreeBox(group) {
    addMesh3D(group, new THREE3D.BoxGeometry(0.72, 0.62, 0.58), mat3D(0xf0aa1c), [0, 0, 0], [1, 1, 1], [0.05, 0.2, 0.05]);
    addMesh3D(group, new THREE3D.BoxGeometry(0.5, 0.08, 0.6), mat3D(0xfef3c7), [0, 0.24, 0], [1, 1, 1], [0.05, 0.2, 0.05]);
    addMesh3D(group, new THREE3D.BoxGeometry(0.08, 0.64, 0.6), mat3D(0xd97706), [0.38, 0, 0], [1, 1, 1], [0.05, 0.2, 0.05]);
    addGloss3D(group, [-0.18, 0.18, -0.22], [1.4, 0.36, 0.42]);
  }

  function drawPlayfield(now) {
    const bounds = playBounds();
    drawToyBox(bounds);
    if (renderThreeScene(now)) {
      return;
    }
    ctx.save();
    clipToyBoxInterior(bounds);
    const layers = makeObjectLayers();
    drawDepthFog(bounds, 0.12);
    layers.back.forEach(object => drawFactoryObject(object, now, 0.76));
    drawDepthFog(bounds, 0.08);
    layers.middle.forEach(object => drawFactoryObject(object, now, 0.9));
    layers.front.forEach(object => drawFactoryObject(object, now, 1));
    ctx.restore();
  }

  function drawToyBox(bounds) {
    ctx.save();
    const centerX = bounds.x + bounds.w / 2;
    const centerY = bounds.y + bounds.h * 0.55;
    const playGlow = ctx.createRadialGradient(centerX, centerY, 60, centerX, centerY, bounds.w * 0.64);
    playGlow.addColorStop(0, "rgba(105,128,154,0.18)");
    playGlow.addColorStop(0.6, "rgba(46,61,79,0.075)");
    playGlow.addColorStop(1, "rgba(20,29,42,0)");
    ctx.fillStyle = playGlow;
    ctx.fillRect(bounds.x - 42, bounds.y - 34, bounds.w + 84, bounds.h + 72);

    ctx.fillStyle = "rgba(3,8,17,0.22)";
    ctx.beginPath();
    ctx.ellipse(centerX, bounds.y + bounds.h - 16, bounds.w * 0.35, 32, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.beginPath();
    ctx.ellipse(centerX - bounds.w * 0.12, bounds.y + bounds.h * 0.18, bounds.w * 0.26, bounds.h * 0.07, -0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function clipToyBoxInterior(bounds) {
    ctx.beginPath();
    ctx.rect(bounds.x + 4, bounds.y + 6, bounds.w - 8, bounds.h - 22);
    ctx.clip();
  }

  function makeObjectLayers() {
    const sorted = [...objects].sort((a, b) => (a.depth * 1000 + a.y + a.z * 0.12) - (b.depth * 1000 + b.y + b.z * 0.12));
    return {
      back: sorted.filter(object => object.depth < 0.34),
      middle: sorted.filter(object => object.depth >= 0.34 && object.depth < 0.68),
      front: sorted.filter(object => object.depth >= 0.68)
    };
  }

  function drawFactoryObject(object, now, layerAlpha) {
    const bob = 0;
    const buried = (1 - object.depth) * 10;
    const scale = object.scale * (0.78 + object.depth * 0.3);
    ctx.save();
    ctx.globalAlpha = layerAlpha;
    ctx.fillStyle = `rgba(10,16,26,${0.18 + object.depth * 0.18})`;
    ctx.beginPath();
    ctx.ellipse(object.x + 3 * scale, object.y + 34 * scale, 44 * scale, 15 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    drawToyObject(object.type, object.x, object.y + bob + buried - object.lift, scale, object.angle);
    ctx.restore();
  }

  function drawDepthFog(bounds, alpha) {
    ctx.fillStyle = `rgba(7,12,21,${alpha * 0.42})`;
    ctx.beginPath();
    ctx.ellipse(bounds.x + bounds.w / 2, bounds.y + bounds.h * 0.82, bounds.w * 0.4, bounds.h * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSlots() {
    const layout = slotLayout();
    for (let i = 0; i < layout.length; i += 1) {
      const slot = layout[i];
      const isFull = slots[i] && !slots[i].moving;
      roundedRect(slot.x - slot.w / 2, slot.y - slot.h / 2, slot.w, slot.h, 8, isFull ? "#5a7698" : "#4b6584", isFull ? "#91b6df" : "#2c3d54", isFull ? 4 : 3);
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      roundedRect(slot.x - slot.w / 2 + 5, slot.y - slot.h / 2 + 5, slot.w - 10, slot.h * 0.42, 6, "rgba(255,255,255,0.10)", null, 0);
      const item = slots[i];
      if (item && !item.moving) drawToyObject(item.type, slot.x, slot.y - 8, 0.58, 0);
    }
  }

  function drawFlyingObjects() {
    for (const item of flying) {
      const t = easeOutCubic(item.progress);
      const x = item.fromX + (item.toX - item.fromX) * t;
      const y = item.fromY + (item.toY - item.fromY) * t - Math.sin(t * Math.PI) * 110;
      const scale = Math.max(0.54, item.scale * (1 - t * 0.38)) * (1 + Math.sin(t * Math.PI) * 0.18);
      drawToyObject(item.type, x, y, scale, item.spin + t * 0.8);
    }
  }

  function drawShockwaves() {
    for (const item of shockwaves) {
      const t = 1 - item.life / item.maxLife;
      ctx.globalAlpha = Math.max(0, 1 - t) * 0.55;
      ctx.strokeStyle = item.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(item.x, item.y, 12 + t * 58, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawToyObject(type, x, y, scale = 1, rotation = 0) {
    const info = TYPES[type] || TYPES.duck;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.scale(scale, scale);
    ctx.shadowColor = "rgba(0,0,0,0.28)";
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 10;
    if (type === "duck") drawDuck(info);
    else if (type === "donut") drawDonut(info);
    else if (type === "juice") drawJuice(info);
    else if (type === "grape") drawGrape(info);
    else if (type === "pumpkin") drawPumpkin(info);
    else if (type === "apple") drawApple(info);
    else if (type === "orange") drawOrange(info);
    else if (type === "melon") drawWatermelon(info);
    else if (type === "carrot") drawCarrot(info);
    else if (type === "mushroom") drawMushroom(info);
    else if (type === "light") drawLight(info);
    else if (type === "box") drawBoxObject(info);
    else drawApple(info);
    ctx.restore();
  }

  function drawDuck(info) {
    const body = ctx.createRadialGradient(-18, -12, 8, 4, 10, 48);
    body.addColorStop(0, "#fff176");
    body.addColorStop(0.62, info.color);
    body.addColorStop(1, "#d89b00");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(0, 8, 36, 27, -0.08, 0, Math.PI * 2);
    ctx.arc(12, -22, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(168,103,0,0.34)";
    ctx.beginPath();
    ctx.ellipse(4, 20, 28, 8, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fb923c";
    ctx.beginPath();
    ctx.ellipse(30, -20, 24, 9, 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.34)";
    ctx.beginPath();
    ctx.ellipse(-15, -4, 18, 9, -0.65, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#4a2a12";
    ctx.beginPath();
    ctx.arc(18, -29, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawDonut(info) {
    ctx.fillStyle = "#8f4f13";
    ctx.beginPath();
    ctx.ellipse(0, 9, 38, 29, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d97706";
    ctx.beginPath();
    ctx.ellipse(0, 0, 38, 31, 0, 0, Math.PI * 2);
    ctx.fill();
    const icing = ctx.createRadialGradient(-14, -16, 6, 0, -3, 35);
    icing.addColorStop(0, "#f9a8d4");
    icing.addColorStop(1, info.color);
    ctx.fillStyle = icing;
    ctx.beginPath();
    ctx.ellipse(0, -4, 34, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#243241";
    ctx.beginPath();
    ctx.ellipse(0, -3, 13, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 9; i += 1) {
      ctx.fillStyle = ["#fff", "#facc15", "#22d3ee", "#a3e635"][i % 4];
      roundedRect(-25 + (i * 9) % 50, -20 + (i * 11) % 32, 4, 13, 2, ctx.fillStyle, null, 0);
    }
  }

  function drawJuice(info) {
    ctx.fillStyle = "#cbd5e1";
    ctx.beginPath();
    ctx.moveTo(24, -30);
    ctx.lineTo(32, -22);
    ctx.lineTo(32, 30);
    ctx.lineTo(24, 34);
    ctx.closePath();
    ctx.fill();
    roundedRect(-24, -34, 48, 68, 6, "#f8fafc", "#dbeafe", 3);
    ctx.fillStyle = info.color;
    ctx.beginPath();
    ctx.moveTo(-22, -10);
    ctx.lineTo(22, -22);
    ctx.lineTo(22, 28);
    ctx.lineTo(-22, 28);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.26)";
    ctx.beginPath();
    ctx.moveTo(-18, -28);
    ctx.lineTo(4, -34);
    ctx.lineTo(8, -26);
    ctx.lineTo(-14, -19);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#1f2937";
    ctx.font = "900 12px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Juice", 0, 6);
  }

  function drawGrape(info) {
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 3 - Math.floor(row / 2); col += 1) {
        const x = (col - 1) * 17 + row * 4;
        const y = row * 14 - 20;
        const grape = ctx.createRadialGradient(x - 4, y - 5, 2, x, y, 12);
        grape.addColorStop(0, "#d8b4fe");
        grape.addColorStop(0.55, info.color);
        grape.addColorStop(1, "#6b21a8");
        ctx.fillStyle = grape;
        ctx.beginPath();
        ctx.arc(x, y, 11, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = "#22c55e";
    ctx.beginPath();
    ctx.ellipse(1, -38, 10, 18, -0.7, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPumpkin(info) {
    for (let i = -2; i <= 2; i += 1) {
      const segment = ctx.createLinearGradient(-20, -30, 22, 30);
      segment.addColorStop(0, "#fdba74");
      segment.addColorStop(0.55, info.color);
      segment.addColorStop(1, "#c2410c");
      ctx.fillStyle = segment;
      ctx.beginPath();
      ctx.ellipse(i * 12, 0, 18, 34, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(124,45,18,0.28)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.fillStyle = "#166534";
    roundedRect(-7, -38, 14, 20, 5, "#166534", null, 0);
  }

  function drawApple(info) {
    const apple = ctx.createRadialGradient(-16, -14, 6, 2, 4, 42);
    apple.addColorStop(0, "#d9f99d");
    apple.addColorStop(0.62, info.color);
    apple.addColorStop(1, "#3f6212");
    ctx.fillStyle = apple;
    ctx.beginPath();
    ctx.arc(-12, 0, 24, 0, Math.PI * 2);
    ctx.arc(12, 0, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.beginPath();
    ctx.ellipse(-17, -12, 9, 15, -0.75, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#6b3b12";
    roundedRect(-4, -38, 8, 20, 3, "#6b3b12", null, 0);
  }

  function drawOrange(info) {
    const orange = ctx.createRadialGradient(-14, -16, 6, 0, 0, 42);
    orange.addColorStop(0, "#fed7aa");
    orange.addColorStop(0.48, info.color);
    orange.addColorStop(1, "#c2410c");
    ctx.fillStyle = orange;
    ctx.beginPath();
    ctx.arc(0, 0, 35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.beginPath();
    ctx.ellipse(-13, -14, 12, 8, -0.65, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#15803d";
    ctx.beginPath();
    ctx.ellipse(5, -36, 7, 13, -0.45, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawWatermelon(info) {
    ctx.fillStyle = "#166534";
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0.12, Math.PI - 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = info.color;
    ctx.beginPath();
    ctx.arc(0, 2, 31, 0.15, Math.PI - 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(0, 5, 25, 0.18, Math.PI - 0.18);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.52)";
    [-12, 0, 12].forEach(seed => {
      ctx.beginPath();
      ctx.ellipse(seed, 10, 3, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawCarrot(info) {
    const carrot = ctx.createLinearGradient(-32, -18, 36, 22);
    carrot.addColorStop(0, "#fdba74");
    carrot.addColorStop(0.52, info.color);
    carrot.addColorStop(1, "#c2410c");
    ctx.fillStyle = carrot;
    ctx.beginPath();
    ctx.moveTo(-36, -10);
    ctx.quadraticCurveTo(8, -34, 42, -2);
    ctx.quadraticCurveTo(12, 24, -36, 26);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(124,45,18,0.25)";
    ctx.lineWidth = 3;
    for (let i = -18; i <= 18; i += 12) {
      ctx.beginPath();
      ctx.moveTo(i, -12);
      ctx.lineTo(i + 14, 8);
      ctx.stroke();
    }
    ctx.fillStyle = "#22c55e";
    ctx.beginPath();
    ctx.ellipse(-36, -14, 11, 19, -0.75, 0, Math.PI * 2);
    ctx.ellipse(-28, -22, 9, 17, 0.12, 0, Math.PI * 2);
    ctx.ellipse(-20, -17, 9, 17, 0.7, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawMushroom(info) {
    const cap = ctx.createRadialGradient(-15, -26, 7, 0, -18, 44);
    cap.addColorStop(0, "#f9a8d4");
    cap.addColorStop(0.62, info.color);
    cap.addColorStop(1, "#9d174d");
    ctx.fillStyle = cap;
    ctx.beginPath();
    ctx.ellipse(0, -15, 40, 27, 0, Math.PI, 0);
    ctx.quadraticCurveTo(30, 4, -30, 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fef3c7";
    roundedRect(-15, -1, 30, 38, 12, "#fef3c7", "#d6a36d", 3);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    [[-20, -18, 7], [4, -26, 8], [20, -12, 6]].forEach(dot => {
      ctx.beginPath();
      ctx.arc(dot[0], dot[1], dot[2], 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawLight(info) {
    const body = ctx.createLinearGradient(-30, -18, 24, 16);
    body.addColorStop(0, "#7dd3fc");
    body.addColorStop(0.55, info.color);
    body.addColorStop(1, "#075985");
    roundedRect(-30, -12, 54, 25, 9, body, "#0f6a91", 3);
    ctx.fillStyle = "#075985";
    roundedRect(-17, 10, 32, 12, 5, "#075985", null, 0);
    ctx.fillStyle = "#e0f2fe";
    ctx.beginPath();
    ctx.arc(28, 0, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.42)";
    ctx.beginPath();
    ctx.arc(23, -6, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawBoxObject(info) {
    const front = ctx.createLinearGradient(-28, -22, 24, 28);
    front.addColorStop(0, "#fbbf24");
    front.addColorStop(0.65, info.color);
    front.addColorStop(1, "#b45309");
    ctx.fillStyle = front;
    roundedRect(-32, -26, 58, 52, 6, front, "#92400e", 3);
    ctx.fillStyle = "#d97706";
    ctx.beginPath();
    ctx.moveTo(26, -22);
    ctx.lineTo(38, -12);
    ctx.lineTo(38, 22);
    ctx.lineTo(26, 26);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.32)";
    roundedRect(-24, -17, 38, 9, 3, "rgba(255,255,255,0.32)", null, 0);
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function burst(x, y, color, count) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const force = 70 + Math.random() * 170;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * force,
        vy: Math.sin(angle) * force - 80,
        life: 0.45 + Math.random() * 0.35,
        maxLife: 0.8,
        size: 3 + Math.random() * 5,
        color
      });
    }
  }

  function updateHud() {
    const setText = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };
    setText("factoryLevel", level);
    setText("factoryTimer", formatTime(timeLeft));
    const fill = document.getElementById("factoryTimeFill");
    if (fill) {
      const ratio = Math.max(0, Math.min(1, timeLeft / Math.max(1, levelTimeLimit)));
      fill.style.transform = `scaleX(${ratio})`;
      fill.style.background = ratio < 0.28
        ? "linear-gradient(90deg, #ef4444, #f97316)"
        : ratio < 0.55
          ? "linear-gradient(90deg, #facc15, #84cc16)"
          : "linear-gradient(90deg, #22c55e, #84cc16)";
    }
    const targetBox = document.getElementById("factoryTargets");
    if (targetBox) {
      targetBox.innerHTML = targets.map(target => {
        const item = TYPES[target.type];
        return `<div class="factory-target"><span class="icon">${item.icon}</span><strong>${Math.max(0, target.needed - target.collected)}</strong></div>`;
      }).join("");
    }
  }

  function updateLobby() {
    const setText = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };
    setText("factoryLives", 0);
    setText("factoryLobbyTime", formatTime(Math.max(70, 112 - level * 4)));
    setText("factoryLobbyLevel", level);
  }

  function setMessage(text) {
    const el = document.getElementById("factoryMessage");
    if (el) el.textContent = text;
  }

  function playBounds() {
    const top = width <= 700 ? 116 : 126;
    const bottom = width <= 700 ? 196 : 186;
    const maxWidth = width <= 700 ? width - 18 : Math.min(820, width * 0.58);
    const boxWidth = Math.max(300, Math.min(width - 18, maxWidth));
    const availableHeight = height - top - bottom;
    const boxHeight = Math.max(300, Math.min(availableHeight, width <= 700 ? 520 : 720));
    return {
      x: (width - boxWidth) / 2,
      y: top,
      w: boxWidth,
      h: boxHeight
    };
  }

  function slotLayout() {
    const gap = width <= 700 ? 6 : 10;
    const slotW = Math.min(82, (width - 28 - gap * (SLOT_COUNT - 1)) / SLOT_COUNT);
    const slotH = Math.min(58, slotW * 0.72);
    const total = slotW * SLOT_COUNT + gap * (SLOT_COUNT - 1);
    const startX = (width - total) / 2 + slotW / 2;
    const y = height - (width <= 700 ? 112 : 116);
    return Array.from({ length: SLOT_COUNT }, (_, i) => ({ x: startX + i * (slotW + gap), y, w: slotW, h: slotH }));
  }

  function objectRadius(object) {
    return 58 * object.scale;
  }

  function resize() {
    if (!canvas || !stage) return;
    const rect = stage.getBoundingClientRect();
    width = Math.max(320, rect.width);
    height = Math.max(620, rect.height);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (uiCanvas && uiCtx) {
      uiCanvas.width = Math.round(width * dpr);
      uiCanvas.height = Math.round(height * dpr);
      uiCanvas.style.width = `${width}px`;
      uiCanvas.style.height = `${height}px`;
      uiCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resizeThreeRenderer();
    syncThreeObjects();
  }

  function roundedRect(x, y, w, h, r, fill, stroke, lineWidth) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth || 1;
      ctx.stroke();
    }
  }

  function formatTime(seconds) {
    const safe = Math.max(0, Math.ceil(seconds));
    return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
  }

  function easeOutCubic(value) {
    const t = Math.max(0, Math.min(1, value));
    return 1 - Math.pow(1 - t, 3);
  }

  function shuffle(list) {
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  return { start, stop, showLobby, play, pause };
})();
window.MatchFactory = MatchFactory;
