(() => {
  const CLIENTS = [
    { name: "Léo", gender: "boy", skin: 0xd99568, hair: 0x342018, shirt: 0x25a9e8, request: "Rase-moi complètement la barbe !", goal: "shave" },
    { name: "Maya", gender: "girl", skin: 0x8f573f, hair: 0x211411, shirt: 0xff4f7d, request: "Je veux un carré bien régulier.", goal: "bob" },
    { name: "Tom", gender: "boy", skin: 0xefbd91, hair: 0xc75d20, shirt: 0x54c878, request: "Court sur les côtés, du volume au-dessus !", goal: "fade" },
    { name: "Inès", gender: "girl", skin: 0xc98362, hair: 0x2f1d18, shirt: 0x9866ed, request: "Fais ce que tu veux. Surprends-moi !", goal: "free" },
    { name: "Nolan", gender: "boy", skin: 0x7e4935, hair: 0x121212, shirt: 0xffb62f, request: "Une crête au milieu, presque rasé sur les côtés.", goal: "mohawk" },
    { name: "Zoé", gender: "girl", skin: 0xf2c3a1, hair: 0xe2a82f, shirt: 0x2fbcc2, request: "Garde mes cheveux longs, mais rends-les bien coiffés.", goal: "long" }
  ];

  let canvas, renderer, scene, camera, character, head, faceGroup;
  let raycaster, pointer, clock, raf;
  let initialized = false;
  let active = false;
  let clientIndex = 0;
  let client = CLIENTS[0];
  let tool = "clipper";
  let rotationStep = 0;
  let targetRotation = 0;
  let hairMeshes = [];
  let beardMeshes = [];
  let fallingHair = [];
  let hairCap = null;
  let moustacheGroup = null;
  let moustacheStyle = 0;
  let dragging = false;
  let changed = false;
  let finished = false;
  let audioCtx = null;
  let lastToolSound = 0;
  let threeLoader = null;
  let toolGroup = null;
  let toolParts = {};
  let toolPlane = null;
  let toolTarget = null;
  let lastPointerX = 0;
  let pointerDeltaX = 0;
  let lastToolApply = 0;
  const toolWorldPosition = { value: null };

  function start() {
    if (!window.THREE) {
      document.getElementById("hairSalonStatus").textContent = "Chargement de la 3D…";
      if (!threeLoader) {
        threeLoader = import("https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js")
          .then(module => {
            window.THREE = module;
            start();
          })
          .catch(() => {
            document.getElementById("hairSalonStatus").textContent = "La 3D n’a pas pu charger. Vérifie ta connexion.";
          });
      }
      return;
    }
    setup();
    active = true;
    loadClient(Number(localStorage.getItem("hairSalonClient") || 0));
    cancelAnimationFrame(raf);
    clock.start();
    raf = requestAnimationFrame(loop);
  }

  function setup() {
    canvas = document.getElementById("hairSalonCanvas");
    if (initialized) {
      resize();
      return;
    }
    initialized = true;
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x9fe8fa);
    scene.fog = new THREE.Fog(0x9fe8fa, 12, 25);
    camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
    camera.position.set(0, 0.45, 10.2);
    camera.lookAt(0, 0.35, 0);
    raycaster = new THREE.Raycaster();
    pointer = new THREE.Vector2();
    clock = new THREE.Clock();
    toolPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -3);
    toolTarget = new THREE.Vector3();
    toolWorldPosition.value = new THREE.Vector3();

    buildSalon();
    toolGroup = new THREE.Group();
    toolGroup.visible = false;
    toolGroup.renderOrder = 20;
    scene.add(toolGroup);
    buildToolModel(tool);
    window.addEventListener("resize", resize);
    canvas.addEventListener("pointerdown", pointerDown);
    canvas.addEventListener("pointermove", pointerMove);
    canvas.addEventListener("pointerup", pointerUp);
    canvas.addEventListener("pointercancel", pointerUp);
    resize();
  }

  function buildSalon() {
    const hemi = new THREE.HemisphereLight(0xffffff, 0x5078a0, 2.25);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 4.4);
    key.position.set(-4, 7, 7);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xff9fdb, 2.2);
    rim.position.set(5, 2, 3);
    scene.add(rim);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 24),
      new THREE.MeshStandardMaterial({ color: 0x60c7dd, roughness: 0.72, metalness: 0.05 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -3.35;
    floor.receiveShadow = true;
    scene.add(floor);

    const wall = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 15),
      new THREE.MeshStandardMaterial({ color: 0xd7eff7, roughness: 0.9 })
    );
    wall.position.set(0, 2.5, -4);
    wall.receiveShadow = true;
    scene.add(wall);

    const mirrorFrame = new THREE.Mesh(
      new THREE.TorusGeometry(3.15, 0.18, 18, 72),
      new THREE.MeshStandardMaterial({ color: 0xffbd32, roughness: 0.28, metalness: 0.5 })
    );
    mirrorFrame.position.set(0, 1.25, -3.72);
    scene.add(mirrorFrame);
    const mirror = new THREE.Mesh(
      new THREE.CircleGeometry(2.98, 72),
      new THREE.MeshPhysicalMaterial({ color: 0x8edbf0, roughness: 0.08, metalness: 0.35, clearcoat: 1 })
    );
    mirror.position.set(0, 1.25, -3.75);
    scene.add(mirror);

    for (let i = 0; i < 12; i++) {
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 16, 12),
        new THREE.MeshStandardMaterial({ color: 0xfff5c8, emissive: 0xffd65c, emissiveIntensity: 3 })
      );
      const a = i / 12 * Math.PI * 2;
      bulb.position.set(Math.cos(a) * 3.15, 1.25 + Math.sin(a) * 3.15, -3.48);
      scene.add(bulb);
    }

    addShelf(-5.1, 0x25c7cf);
    addShelf(5.1, 0xff5b72);
    const chairBase = new THREE.Mesh(
      new THREE.CylinderGeometry(1.55, 1.72, 0.42, 48),
      new THREE.MeshStandardMaterial({ color: 0x343d58, roughness: 0.28, metalness: 0.42 })
    );
    chairBase.position.set(0, -3.05, 0.1);
    chairBase.castShadow = true;
    scene.add(chairBase);
  }

  function addShelf(x, color) {
    const shelf = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 0.16, 0.75),
      new THREE.MeshStandardMaterial({ color: 0xe1a15e, roughness: 0.68 })
    );
    shelf.position.set(x, -0.45, -3.25);
    scene.add(shelf);
    for (let i = 0; i < 3; i++) {
      const bottle = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.18, 0.55 + i * 0.08, 6, 16),
        new THREE.MeshStandardMaterial({ color: i === 1 ? 0xffbd35 : color, roughness: 0.3, metalness: 0.05 })
      );
      bottle.position.set(x - 0.65 + i * 0.65, 0.02, -3.1);
      scene.add(bottle);
    }
  }

  function resize() {
    if (!renderer || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    renderer.setSize(Math.max(1, rect.width), Math.max(1, rect.height), false);
    camera.aspect = rect.width / Math.max(1, rect.height);
    camera.position.z = rect.width < 640 ? 11.7 : 10.2;
    camera.position.y = rect.width < 640 ? 0.25 : 0.45;
    camera.updateProjectionMatrix();
  }

  function loadClient(index) {
    clientIndex = Math.max(0, Math.min(CLIENTS.length - 1, index));
    client = CLIENTS[clientIndex];
    tool = clientIndex === 0 ? "clipper" : "scissors";
    rotationStep = 0;
    targetRotation = 0;
    moustacheStyle = clientIndex === 0 ? 2 : 0;
    changed = false;
    finished = false;
    if (character) scene.remove(character);
    hairMeshes = [];
    beardMeshes = [];
    hairCap = null;
    fallingHair.forEach(piece => scene.remove(piece.mesh));
    fallingHair = [];
    buildCharacter();
    buildToolModel(tool);
    updateUi();
    setStatus(clientIndex === 0 ? "Tutoriel : passe la tondeuse sur toute la barbe et la moustache." : "Passe tes outils directement sur les cheveux.");
  }

  function buildCharacter() {
    character = new THREE.Group();
    character.position.y = -0.18;
    scene.add(character);

    const shirtMat = new THREE.MeshStandardMaterial({ color: client.shirt, roughness: 0.55 });
    const cape = new THREE.Mesh(new THREE.SphereGeometry(2.15, 48, 32), shirtMat);
    cape.scale.set(1.25, 0.62, 0.62);
    cape.position.set(0, -2.55, 0);
    cape.castShadow = true;
    character.add(cape);
    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.72, 0.15, 14, 48),
      new THREE.MeshStandardMaterial({ color: 0xf7fbff, roughness: 0.4 })
    );
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, -1.37, 0.03);
    character.add(collar);

    head = new THREE.Mesh(
      new THREE.SphereGeometry(1, 64, 48),
      new THREE.MeshStandardMaterial({ color: client.skin, roughness: 0.52, metalness: 0.01 })
    );
    head.scale.set(1.5, 1.76, 1.28);
    head.position.set(0, 0.18, 0);
    head.castShadow = true;
    head.receiveShadow = true;
    head.userData.type = "face";
    character.add(head);

    faceGroup = new THREE.Group();
    character.add(faceGroup);
    addFace();
    addHair();
    addBeard();
    buildMoustache();
  }

  function addFace() {
    const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.28 });
    const iris = new THREE.MeshStandardMaterial({ color: client.gender === "girl" ? 0x3a7dba : 0x5b341e, roughness: 0.2 });
    const black = new THREE.MeshStandardMaterial({ color: 0x141018, roughness: 0.25 });
    [-0.48, 0.48].forEach(x => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.24, 28, 20), white);
      eye.scale.set(1, 1.18, 0.52);
      eye.position.set(x, 0.45, 1.12);
      faceGroup.add(eye);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.105, 24, 16), iris);
      pupil.position.set(x, 0.43, 1.31);
      faceGroup.add(pupil);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.042, 16, 12), black);
      dot.position.set(x, 0.43, 1.405);
      faceGroup.add(dot);
    });
    const nose = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 28, 20),
      new THREE.MeshStandardMaterial({ color: tintColor(client.skin, 0.08), roughness: 0.58 })
    );
    nose.scale.set(0.68, 1.05, 0.72);
    nose.position.set(0, 0.03, 1.32);
    faceGroup.add(nose);

    const smile = makeCurveTube([
      new THREE.Vector3(-0.38, -0.48, 1.18),
      new THREE.Vector3(0, -0.68, 1.34),
      new THREE.Vector3(0.38, -0.48, 1.18)
    ], 0.055, 0xb8324f);
    faceGroup.add(smile);
    const leftBrow = makeCurveTube([
      new THREE.Vector3(-0.7, 0.82, 1.0),
      new THREE.Vector3(-0.48, 0.94, 1.15),
      new THREE.Vector3(-0.25, 0.84, 1.1)
    ], 0.045, client.hair);
    const rightBrow = leftBrow.clone();
    rightBrow.scale.x = -1;
    faceGroup.add(leftBrow, rightBrow);

    const earMat = new THREE.MeshStandardMaterial({ color: client.skin, roughness: 0.55 });
    [-1, 1].forEach(side => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.25, 24, 18), earMat);
      ear.scale.set(0.56, 1.05, 0.42);
      ear.position.set(side * 1.47, 0.15, 0);
      character.add(ear);
    });
  }

  function addHair() {
    const material = new THREE.MeshStandardMaterial({
      color: client.hair,
      roughness: 0.5,
      metalness: 0.015
    });
    const strandVariants = [
      createCurvedStrandGeometry(1, 0.038, -0.15, 0.025),
      createCurvedStrandGeometry(1, 0.036, -0.08, -0.035),
      createCurvedStrandGeometry(1, 0.04, 0.01, 0.035),
      createCurvedStrandGeometry(1, 0.036, 0.09, -0.025),
      createCurvedStrandGeometry(1, 0.038, 0.16, 0.03)
    ];
    hairCap = null;

    const rows = client.gender === "girl" ? 14 : 13;
    for (let row = 0; row < rows; row++) {
      const phi = 0.055 + row * (0.72 / Math.max(1, rows - 1));
      const count = Math.max(14, Math.round(18 + Math.sin(phi) * 38));
      for (let col = 0; col < count; col++) {
        const theta = col / count * Math.PI * 2 + (row % 2) * Math.PI / count;
        const side = Math.abs(Math.sin(theta));
        const geometry = strandVariants[(row * 3 + col) % strandVariants.length];
        const mesh = new THREE.Mesh(geometry, material);
        const radiusX = 1.48;
        const radiusY = 1.72;
        mesh.position.set(
          Math.sin(theta) * Math.sin(phi) * radiusX,
          0.18 + Math.cos(phi) * radiusY,
          Math.cos(theta) * Math.sin(phi) * 1.24
        );
        const front = Math.max(0, Math.cos(theta));
        const naturalVariation = 0.94 + ((row * 17 + col * 11) % 7) * 0.018;
        const initial = client.goal === "mohawk"
          ? (Math.abs(mesh.position.x) < 0.4 ? 1.1 : 0.24)
          : client.goal === "fade"
            ? (side > 0.55 ? 0.34 : 0.78)
            : client.gender === "girl"
              ? (0.57 + front * 0.12) * naturalVariation
              : (0.48 + front * 0.12) * naturalVariation;
        const normal = new THREE.Vector3(
          mesh.position.x / radiusX,
          (mesh.position.y - 0.18) / radiusY,
          mesh.position.z / 1.24
        ).normalize();
        const isFront = mesh.position.z > 0.48;
        const isSide = Math.abs(mesh.position.x) > 0.82;
        const flow = isFront
          ? new THREE.Vector3(mesh.position.x * 0.16, -1, 0.08)
          : isSide
            ? new THREE.Vector3(mesh.position.x * 0.08, -0.94, -0.34)
            : new THREE.Vector3(0.48, -0.38, -0.7);
        flow.addScaledVector(normal, -flow.dot(normal)).normalize();
        const isMohawkCenter = client.goal === "mohawk" && Math.abs(mesh.position.x) < 0.42;
        const rootLift = isMohawkCenter ? 0.84 : row < 2 ? 0.3 : 0.12;
        const direction = normal.clone().multiplyScalar(rootLift)
          .add(flow.multiplyScalar(1 - rootLift))
          .normalize();
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
        mesh.scale.set(0.82, initial, 0.78);
        mesh.castShadow = true;
        mesh.userData = {
          type: "hair",
          length: initial,
          baseWidth: 0.82,
          baseDepth: 0.78,
          baseQuaternion: mesh.quaternion.clone(),
          comb: 0,
          puff: 0
        };
        hairMeshes.push(mesh);
        character.add(mesh);
      }
    }
    addCrownCoverage(material, strandVariants);
    addFringe(material, strandVariants);
    if (client.gender === "girl") addLongHair(material, strandVariants);
  }

  function addCrownCoverage(material, strandVariants) {
    const rings = [
      { radius: 0.03, count: 10, length: 0.48 },
      { radius: 0.2, count: 16, length: 0.5 },
      { radius: 0.4, count: 22, length: 0.53 },
      { radius: 0.62, count: 28, length: 0.56 }
    ];
    rings.forEach((ring, ringIndex) => {
      for (let i = 0; i < ring.count; i++) {
        const angle = i / ring.count * Math.PI * 2 + ringIndex * 0.31;
        const x = Math.cos(angle) * ring.radius;
        const z = Math.sin(angle) * ring.radius * 0.72;
        const scalpY = 0.18 + 1.72 * Math.sqrt(Math.max(
          0,
          1 - (x * x) / (1.48 * 1.48) - (z * z) / (1.24 * 1.24)
        ));
        const mesh = new THREE.Mesh(
          strandVariants[(i + ringIndex * 2) % strandVariants.length],
          material
        );
        mesh.position.set(x, scalpY + ringIndex * 0.008, z);

        const side = Math.cos(angle) >= 0 ? 1 : -1;
        const flow = new THREE.Vector3(
          side * (0.72 + ringIndex * 0.05),
          -0.18 - ringIndex * 0.04,
          -0.48 + Math.sin(angle) * 0.12
        ).normalize();
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), flow);

        const length = ring.length + ((i * 7 + ringIndex * 3) % 5) * 0.018;
        mesh.scale.set(0.94, length, 0.88);
        mesh.castShadow = true;
        mesh.userData = {
          type: "hair",
          length,
          baseWidth: 0.94,
          baseDepth: 0.88,
          baseQuaternion: mesh.quaternion.clone(),
          comb: 0,
          puff: 0
        };
        hairMeshes.push(mesh);
        character.add(mesh);
      }
    });
  }

  function addFringe(material, strandVariants) {
    const fringeCount = client.gender === "girl" ? 18 : 14;
    for (let i = 0; i < fringeCount; i++) {
      const t = fringeCount === 1 ? 0 : i / (fringeCount - 1) * 2 - 1;
      const layer = i % 3;
      const mesh = new THREE.Mesh(strandVariants[(i + 2) % strandVariants.length], material);
      mesh.position.set(
        t * 1.13,
        1.39 + Math.cos(t * Math.PI * 0.5) * 0.24 + layer * 0.035,
        1.08 + (1 - Math.abs(t)) * 0.14 + layer * 0.018
      );
      const sweep = client.goal === "mohawk" ? t * 0.08 : t * 0.18;
      mesh.rotation.set(0.04, 0, Math.PI - sweep);
      const extraLong = i % 9 === 4;
      const length = (client.gender === "girl" ? 0.52 : 0.43) + (extraLong ? 0.11 : 0) - Math.abs(t) * 0.08;
      mesh.scale.set(0.9, length, 0.82);
      mesh.castShadow = true;
      mesh.userData = {
        type: "hair",
        length,
        baseWidth: 0.9,
        baseDepth: 0.82,
        baseQuaternion: mesh.quaternion.clone(),
        comb: 0,
        puff: 0
      };
      hairMeshes.push(mesh);
      character.add(mesh);
    }
  }

  function addLongHair(material, strandVariants) {
    [-1, 1].forEach(side => {
      for (let row = 0; row < 7; row++) {
        for (let depth = 0; depth < 3; depth++) {
          const mesh = new THREE.Mesh(strandVariants[(row + depth * 2) % strandVariants.length], material);
          mesh.position.set(
            side * (1.28 + depth * 0.09),
            0.54 - row * 0.36,
            -0.22 + depth * 0.25
          );
          mesh.rotation.z = Math.PI + side * (0.1 + depth * 0.025);
          const length = 0.88 + row * 0.055;
          mesh.scale.set(0.78, length, 0.74);
          mesh.castShadow = true;
          mesh.userData = {
            type: "hair",
            length,
            baseWidth: 0.78,
            baseDepth: 0.74,
            baseQuaternion: mesh.quaternion.clone(),
            comb: 0,
            puff: 0
          };
          hairMeshes.push(mesh);
          character.add(mesh);
        }
      }
    });
  }

  function addBeard() {
    if (client.gender === "girl") return;
    const material = new THREE.MeshStandardMaterial({ color: client.hair, roughness: 0.58 });
    const beardVariants = [
      createCurvedStrandGeometry(1, 0.055, -0.05, 0),
      createCurvedStrandGeometry(1, 0.05, 0.01, 0.025),
      createCurvedStrandGeometry(1, 0.055, 0.055, -0.02)
    ];
    for (let row = 0; row < 10; row++) {
      const count = 20 + row * 2;
      for (let col = 0; col < count; col++) {
        const t = col / (count - 1) * 2 - 1;
        const y = -0.34 - row * 0.13;
        const halfWidth = 1.12 - row * 0.065;
        if (Math.abs(t) > 0.94 && row < 2) continue;
        if (row === 0 && Math.abs(t) < 0.28) continue;
        const mesh = new THREE.Mesh(beardVariants[(row + col) % beardVariants.length], material);
        const x = t * halfWidth;
        const z = 1.1 - Math.abs(x) * 0.19 - row * 0.015;
        mesh.position.set(x, y, z);
        const initial = clientIndex === 0 ? 0.36 + row * 0.022 : 0.22 + row * 0.014;
        mesh.rotation.x = Math.PI * 0.16;
        mesh.rotation.z = -t * 0.12;
        mesh.scale.set(0.66, initial, 0.58);
        mesh.castShadow = true;
        mesh.userData = {
          type: "beard",
          length: initial,
          baseWidth: 0.66,
          baseDepth: 0.58,
          baseQuaternion: mesh.quaternion.clone(),
          comb: 0,
          puff: 0
        };
        beardMeshes.push(mesh);
        character.add(mesh);
      }
    }
  }

  function buildMoustache() {
    if (moustacheGroup) character.remove(moustacheGroup);
    moustacheGroup = new THREE.Group();
    moustacheGroup.position.set(0, -0.24, 1.33);
    character.add(moustacheGroup);
    if (!moustacheStyle) return;
    const material = new THREE.MeshStandardMaterial({ color: client.hair, roughness: 0.4 });
    const length = moustacheStyle === 3 ? 0.78 : moustacheStyle === 4 ? 0.62 : 0.52;
    [-1, 1].forEach(side => {
      const shape = new THREE.Mesh(
        moustacheStyle === 4
          ? new THREE.SphereGeometry(0.25, 22, 16)
          : new THREE.CapsuleGeometry(0.11 + moustacheStyle * 0.015, length, 6, 18),
        material
      );
      shape.rotation.z = side * (moustacheStyle === 3 ? 1.02 : 0.78);
      shape.position.set(side * 0.27, moustacheStyle === 3 ? 0.02 : -0.04, 0);
      shape.scale.set(1, 1, 0.58);
      shape.userData.type = "moustache";
      moustacheGroup.add(shape);
    });
  }

  function pointerDown(event) {
    if (!active || finished) return;
    dragging = true;
    lastPointerX = event.clientX;
    pointerDeltaX = 0;
    canvas.setPointerCapture?.(event.pointerId);
    unlockAudio();
    applyTool(event);
  }

  function pointerMove(event) {
    if (!dragging) return;
    pointerDeltaX = event.clientX - lastPointerX;
    lastPointerX = event.clientX;
    applyTool(event);
  }

  function pointerUp() {
    dragging = false;
    if (toolGroup) toolGroup.visible = false;
  }

  function applyTool(event) {
    updatePointer(event);
    raycaster.setFromCamera(pointer, camera);
    positionToolFromRay();
    if (toolGroup) toolGroup.visible = true;
    const now = performance.now();
    if (now - lastToolApply < 28) return;
    lastToolApply = now;
    if (tool === "moustache") {
      const faceHit = raycaster.intersectObject(head, false)[0];
      if (faceHit && faceHit.point.y < 0.35) {
        moustacheStyle = (moustacheStyle + 1) % 5;
        buildMoustache();
        changed = true;
        setStatus(moustacheStyle ? "Nouvelle moustache !" : "Moustache retirée.");
        beep(430, 0.06, "triangle", 0.035);
      }
      dragging = false;
      if (toolGroup) toolGroup.visible = false;
      return;
    }

    const targets = hairMeshes.concat(beardMeshes, moustacheGroup ? moustacheGroup.children : []);
    const hits = raycaster.intersectObjects(targets, false);
    if (!hits.length) return;
    const mesh = hits[0].object;
    if (mesh.userData.type === "moustache" && tool === "clipper") {
      moustacheStyle = 0;
      buildMoustache();
      changed = true;
      playToolSound();
      return;
    }
    if (!mesh.userData.length) return;

    const radius = tool === "comb" ? 0.9 : tool === "dryer" ? 0.72 : tool === "clipper" ? 0.36 : 0.3;
    const brushCenter = mesh.getWorldPosition(new THREE.Vector3());
    const nearby = findNearbyHair(brushCenter, radius);
    if (!nearby.includes(mesh)) nearby.unshift(mesh);
    let dropped = 0;
    nearby.forEach(target => {
      const oldLength = target.userData.length;
      if (tool === "clipper") target.userData.length = Math.max(0.03, oldLength - 0.105);
      if (tool === "scissors") target.userData.length = Math.max(0.16, oldLength - 0.06);
      if (tool === "dryer") target.userData.puff = Math.min(0.72, (target.userData.puff || 0) + 0.08);
      if (tool === "comb") {
        const direction = Math.abs(pointerDeltaX) > 1.5
          ? Math.sign(pointerDeltaX)
          : pointer.x < 0 ? -1 : 1;
        target.userData.comb = THREE.MathUtils.clamp(
          (target.userData.comb || 0) * 0.34 + direction * 0.66,
          -1,
          1
        );
        target.userData.puff = Math.max(0, (target.userData.puff || 0) - 0.07);
      }
      if ((tool === "clipper" || tool === "scissors") && oldLength > target.userData.length + 0.015 && dropped < 4) {
        dropCutHair(target, oldLength - target.userData.length);
        dropped++;
      }
      updateHairMesh(target);
    });
    changed = true;
    playToolSound();
  }

  function findNearbyHair(point, radius) {
    const candidates = hairMeshes.concat(beardMeshes);
    const worldPosition = toolWorldPosition.value;
    const nearby = candidates.filter(mesh => {
      if (!mesh.visible || !mesh.userData.length) return false;
      mesh.getWorldPosition(worldPosition);
      return worldPosition.distanceTo(point) <= radius;
    });
    return nearby.length ? nearby : [];
  }

  function updateHairMesh(mesh) {
    const length = mesh.userData.length;
    const puff = mesh.userData.puff || 0;
    const comb = mesh.userData.comb || 0;
    mesh.scale.set(
      mesh.userData.baseWidth * (1 + puff * 0.22),
      Math.max(0.025, length * (1 + puff * 0.52)),
      mesh.userData.baseDepth * (1 + puff * 0.18)
    );
    mesh.quaternion.copy(mesh.userData.baseQuaternion);
    mesh.rotateZ(comb * 0.68);
    mesh.rotateX(-Math.abs(comb) * 0.11);
  }

  function createCurvedStrandGeometry(height = 1, width = 0.09, bendX = 0.1, bendZ = 0) {
    const segments = 7;
    const sides = 6;
    const positions = [];
    const indices = [];
    for (let segment = 0; segment <= segments; segment++) {
      const t = segment / segments;
      const smooth = t * t * (3 - 2 * t);
      const centerX = bendX * smooth;
      const centerZ = bendZ * smooth;
      const radius = width * (0.94 - smooth * 0.56);
      for (let side = 0; side < sides; side++) {
        const angle = side / sides * Math.PI * 2;
        positions.push(
          centerX + Math.cos(angle) * radius,
          t * height,
          centerZ + Math.sin(angle) * radius
        );
      }
    }
    for (let segment = 0; segment < segments; segment++) {
      for (let side = 0; side < sides; side++) {
        const next = (side + 1) % sides;
        const a = segment * sides + side;
        const b = segment * sides + next;
        const c = (segment + 1) * sides + side;
        const d = (segment + 1) * sides + next;
        indices.push(a, c, b, b, c, d);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    return geometry;
  }

  function dropCutHair(source, amount) {
    if (fallingHair.length > 80) {
      const oldest = fallingHair.shift();
      scene.remove(oldest.mesh);
    }
    source.updateWorldMatrix(true, false);
    const piece = new THREE.Mesh(source.geometry, source.material.clone());
    source.getWorldPosition(piece.position);
    source.getWorldQuaternion(piece.quaternion);
    source.getWorldScale(piece.scale);
    const fraction = Math.max(0.18, Math.min(0.65, amount / Math.max(0.08, source.userData.length + amount)));
    piece.scale.y *= fraction;
    piece.scale.x *= 0.86;
    piece.scale.z *= 0.86;
    piece.castShadow = true;
    scene.add(piece);
    fallingHair.push({
      mesh: piece,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 1.35,
        0.45 + Math.random() * 0.65,
        0.25 + Math.random() * 0.75
      ),
      spin: new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5
      ),
      life: 3.4
    });
  }

  function updatePointer(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function positionToolFromRay() {
    if (!toolGroup || !toolPlane || !toolTarget) return;
    if (!raycaster.ray.intersectPlane(toolPlane, toolTarget)) return;
    toolTarget.x = THREE.MathUtils.clamp(toolTarget.x, -4.7, 4.7);
    toolTarget.y = THREE.MathUtils.clamp(toolTarget.y, -2.75, 3.75);
    toolTarget.z = 3;
    if (!toolGroup.visible) toolGroup.position.copy(toolTarget);
  }

  function buildToolModel(selectedTool) {
    if (!toolGroup || !window.THREE) return;
    while (toolGroup.children.length) toolGroup.remove(toolGroup.children[0]);
    toolParts = {};
    toolGroup.rotation.set(0.08, -0.12, -0.18);
    toolGroup.scale.setScalar(window.innerWidth < 640 ? 0.66 : 0.78);

    const metal = toolMaterial(0xe9f4ff, 0.18, 0.82);
    const darkMetal = toolMaterial(0x354258, 0.26, 0.68);
    const yellow = toolMaterial(0xffc829, 0.32, 0.12);
    const coral = toolMaterial(0xff4f67, 0.34, 0.08);
    const cyan = toolMaterial(0x34cbe7, 0.3, 0.18);
    let hotspotOffsetX = 0;

    if (selectedTool === "scissors") {
      hotspotOffsetX = 1.05;
      const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.16, 24), yellow);
      screw.rotation.x = Math.PI / 2;
      screw.position.z = 0.16;
      toolGroup.add(screw);
      [-1, 1].forEach(side => {
        const bladePivot = new THREE.Group();
        const blade = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.1, 0.1), metal);
        blade.position.x = 0.73;
        blade.scale.y = 1 - Math.abs(side) * 0.08;
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.35, 12), metal);
        tip.rotation.z = -Math.PI / 2;
        tip.position.x = 1.52;
        const handle = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.075, 12, 28), coral);
        handle.position.x = -0.38;
        handle.scale.y = 1.18;
        bladePivot.add(blade, tip, handle);
        bladePivot.position.z = side * 0.045;
        bladePivot.rotation.z = side * 0.2;
        toolGroup.add(bladePivot);
        if (side < 0) toolParts.scissorBottom = bladePivot;
        else toolParts.scissorTop = bladePivot;
      });
    } else if (selectedTool === "clipper") {
      hotspotOffsetX = 0.57;
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.31, 0.78, 7, 20), cyan);
      body.rotation.z = Math.PI / 2;
      body.position.x = -0.1;
      toolGroup.add(body);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.18, 0.54), darkMetal);
      grip.position.x = -0.18;
      toolGroup.add(grip);
      const teeth = new THREE.Group();
      for (let i = 0; i < 8; i++) {
        const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.055, 0.08), metal);
        tooth.position.set(0.56, -0.2 + i * 0.057, 0);
        teeth.add(tooth);
      }
      toolGroup.add(teeth);
      toolParts.vibrating = body;
      toolParts.teeth = teeth;
    } else if (selectedTool === "comb") {
      const spine = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 1.25, 5, 18), coral);
      spine.rotation.z = Math.PI / 2;
      spine.position.y = 0.26;
      toolGroup.add(spine);
      const teeth = new THREE.Group();
      for (let i = 0; i < 15; i++) {
        const tooth = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.38, 3, 10), coral);
        tooth.position.set(-0.63 + i * 0.09, 0.02, 0);
        teeth.add(tooth);
      }
      toolGroup.add(teeth);
      toolParts.comb = teeth;
    } else if (selectedTool === "dryer") {
      hotspotOffsetX = 1.04;
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.42, 1.02, 28), cyan);
      barrel.rotation.z = Math.PI / 2;
      toolGroup.add(barrel);
      const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.31, 0.58, 24), darkMetal);
      nozzle.rotation.z = Math.PI / 2;
      nozzle.position.x = 0.77;
      toolGroup.add(nozzle);
      const handle = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.62, 6, 16), coral);
      handle.rotation.z = -0.25;
      handle.position.set(-0.2, -0.58, 0);
      toolGroup.add(handle);
      const fan = new THREE.Group();
      for (let i = 0; i < 4; i++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.07, 0.05), yellow);
        blade.position.x = 0.11;
        blade.rotation.z = i * Math.PI / 2;
        fan.add(blade);
      }
      fan.position.set(-0.53, 0, 0.34);
      toolGroup.add(fan);
      toolParts.fan = fan;
    } else {
      hotspotOffsetX = 0.54;
      const handle = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 1, 6, 16), yellow);
      handle.rotation.z = Math.PI / 2;
      handle.position.x = -0.25;
      toolGroup.add(handle);
      const brush = new THREE.Mesh(new THREE.SphereGeometry(0.32, 24, 18), darkMetal);
      brush.scale.set(1.35, 0.55, 0.6);
      brush.position.x = 0.54;
      toolGroup.add(brush);
    }

    if (hotspotOffsetX) {
      toolGroup.children.forEach(child => {
        child.position.x -= hotspotOffsetX;
      });
    }

    toolGroup.traverse(object => {
      if (!object.isMesh) return;
      object.castShadow = false;
      object.frustumCulled = false;
      if (object.material) {
        object.material.depthTest = false;
        object.material.depthWrite = false;
      }
    });
    toolGroup.visible = false;
  }

  function toolMaterial(color, roughness, metalness) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness
    });
  }

  function animateTool(dt) {
    if (!toolGroup || !toolGroup.visible || !toolTarget) return;
    toolGroup.position.lerp(toolTarget, Math.min(1, dt * 24));
    const time = performance.now() * 0.001;
    const activity = dragging ? 1 : 0;
    if (toolParts.scissorTop && toolParts.scissorBottom) {
      const opening = 0.08 + (0.12 + Math.abs(Math.sin(time * 18)) * 0.28) * activity;
      toolParts.scissorTop.rotation.z = opening;
      toolParts.scissorBottom.rotation.z = -opening;
    }
    if (toolParts.vibrating) {
      toolParts.vibrating.position.y = dragging ? Math.sin(time * 95) * 0.018 : 0;
      toolParts.teeth.position.y = dragging ? Math.cos(time * 95) * 0.012 : 0;
    }
    if (toolParts.fan) toolParts.fan.rotation.z += dt * (dragging ? 24 : 3);
    if (toolParts.comb && dragging) toolParts.comb.rotation.z = Math.sin(time * 13) * 0.025;
  }

  function selectTool(next) {
    tool = next;
    buildToolModel(tool);
    document.querySelectorAll("[data-hair-tool]").forEach(button => {
      button.classList.toggle("active", button.dataset.hairTool === tool);
    });
    setStatus(`${toolLabel(next)} sélectionné.`);
  }

  function rotate(direction) {
    rotationStep = Math.max(-2, Math.min(2, rotationStep + direction));
    targetRotation = rotationStep === -2 ? -Math.PI : rotationStep === 2 ? Math.PI : rotationStep * Math.PI / 2;
    document.getElementById("hairSalonAngle").textContent = Math.abs(rotationStep) === 2
      ? "Arrière" : rotationStep < 0 ? "Profil gauche" : rotationStep > 0 ? "Profil droit" : "Face";
    beep(270, 0.04, "sine", 0.025);
  }

  function finish() {
    if (finished) return;
    finished = true;
    if (toolGroup) toolGroup.visible = false;
    const result = scoreResult();
    document.getElementById("hairSalonResultFace").textContent = result.stars === 3 ? "PARFAIT" : result.stars === 2 ? "PAS MAL" : "OUPS";
    document.getElementById("hairSalonStars").textContent = "★".repeat(result.stars) + "☆".repeat(3 - result.stars);
    document.getElementById("hairSalonVerdict").textContent = result.text;
    document.getElementById("hairSalonResult").hidden = false;
    if (result.stars >= 2) {
      beep(620, 0.1, "triangle", 0.06);
      setTimeout(() => beep(820, 0.15, "triangle", 0.06), 90);
    } else {
      beep(145, 0.18, "sawtooth", 0.05);
    }
  }

  function scoreResult() {
    const hairValues = hairMeshes.map(mesh => mesh.userData.length);
    const beardValues = beardMeshes.map(mesh => mesh.userData.length);
    const avgHair = average(hairValues);
    const avgBeard = average(beardValues);
    const sides = hairMeshes.filter(mesh => Math.abs(mesh.position.x) > 0.72).map(mesh => mesh.userData.length);
    const center = hairMeshes.filter(mesh => Math.abs(mesh.position.x) < 0.42).map(mesh => mesh.userData.length);
    const side = average(sides);
    const middle = average(center);
    const neat = average(hairMeshes.map(mesh => Math.abs(mesh.userData.comb || 0)));
    const puff = average(hairMeshes.map(mesh => mesh.userData.puff || 0));
    const evenness = 1 - deviation(hairValues);
    let quality = 0;
    if (client.goal === "shave") quality = 1 - Math.min(1, avgBeard * 1.15 + (moustacheStyle ? 0.42 : 0));
    if (client.goal === "bob") quality = evenness * 0.65 + (1 - Math.abs(avgHair - 0.65)) * 0.35;
    if (client.goal === "fade") quality = Math.max(0, middle - side) * 0.85 + middle * 0.22 + puff * 0.18;
    if (client.goal === "mohawk") quality = Math.max(0, middle - side) * 1.05 + middle * 0.16;
    if (client.goal === "long") quality = avgHair * 0.58 + neat * 0.42;
    if (client.goal === "free") quality = changed ? Math.min(1, 0.62 + deviation(hairValues) * 0.45 + puff * 0.25 + moustacheStyle * 0.035) : 0.2;
    const stars = quality >= 0.73 ? 3 : quality >= 0.42 ? 2 : 1;
    const text = stars === 3
      ? client.goal === "free" ? "Incroyable. Je ne savais pas que je voulais ça !" : "Exactement ce que j’avais demandé !"
      : stars === 2 ? "Pas mal du tout, mais il reste quelques détails." : "Euh… je vais garder mon bonnet aujourd’hui.";
    return { stars, text };
  }

  function nextClient() {
    document.getElementById("hairSalonResult").hidden = true;
    const next = (clientIndex + 1) % CLIENTS.length;
    localStorage.setItem("hairSalonClient", String(next));
    loadClient(next);
  }

  function retry() {
    document.getElementById("hairSalonResult").hidden = true;
    loadClient(clientIndex);
  }

  function updateUi() {
    document.getElementById("hairSalonClientName").textContent = client.name;
    document.getElementById("hairSalonProgress").textContent = `${clientIndex + 1}/${CLIENTS.length}`;
    document.getElementById("hairSalonRequest").textContent = `« ${client.request} »`;
    document.getElementById("hairSalonAngle").textContent = "Face";
    document.getElementById("hairSalonResult").hidden = true;
    selectTool(tool);
  }

  function loop() {
    if (!active) return;
    const dt = Math.min(0.04, clock.getDelta());
    if (character) {
      character.rotation.y += shortestAngle(character.rotation.y, targetRotation) * Math.min(1, dt * 7);
      character.position.y = -0.18 + Math.sin(performance.now() * 0.0018) * 0.018;
    }
    updateFallingHair(dt);
    animateTool(dt);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  }

  function updateFallingHair(dt) {
    for (let i = fallingHair.length - 1; i >= 0; i--) {
      const piece = fallingHair[i];
      piece.velocity.y -= 5.8 * dt;
      piece.mesh.position.addScaledVector(piece.velocity, dt);
      piece.mesh.rotation.x += piece.spin.x * dt;
      piece.mesh.rotation.y += piece.spin.y * dt;
      piece.mesh.rotation.z += piece.spin.z * dt;
      if (piece.mesh.position.y < -2.78) {
        piece.mesh.position.y = -2.78;
        piece.velocity.y *= -0.18;
        piece.velocity.x *= 0.7;
        piece.velocity.z *= 0.7;
        piece.spin.multiplyScalar(0.72);
      }
      piece.life -= dt;
      if (piece.life <= 0) {
        scene.remove(piece.mesh);
        fallingHair.splice(i, 1);
      }
    }
  }

  function stop() {
    active = false;
    dragging = false;
    if (toolGroup) toolGroup.visible = false;
    cancelAnimationFrame(raf);
    raf = null;
  }

  function makeCurveTube(points, radius, color) {
    const curve = new THREE.CatmullRomCurve3(points);
    return new THREE.Mesh(
      new THREE.TubeGeometry(curve, 24, radius, 8, false),
      new THREE.MeshStandardMaterial({ color, roughness: 0.38 })
    );
  }

  function tintColor(color, amount) {
    const c = new THREE.Color(color);
    c.offsetHSL(0, 0, amount);
    return c;
  }

  function shortestAngle(from, to) {
    let diff = (to - from + Math.PI) % (Math.PI * 2) - Math.PI;
    if (diff < -Math.PI) diff += Math.PI * 2;
    return diff;
  }

  function average(values) {
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  }

  function deviation(values) {
    if (!values.length) return 0;
    const mean = average(values);
    return Math.min(1, Math.sqrt(average(values.map(value => (value - mean) ** 2))));
  }

  function toolLabel(value) {
    return { scissors: "Ciseaux", clipper: "Tondeuse", comb: "Peigne", dryer: "Sèche-cheveux", moustache: "Moustache" }[value] || value;
  }

  function setStatus(text) {
    const element = document.getElementById("hairSalonStatus");
    if (element) element.textContent = text;
  }

  function playToolSound() {
    const now = performance.now();
    if (now - lastToolSound < 70) return;
    lastToolSound = now;
    if (tool === "scissors") {
      beep(920, 0.025, "square", 0.028);
      setTimeout(() => beep(610, 0.032, "triangle", 0.022), 18);
      noiseBurst(0.035, 1800, 0.012);
    } else if (tool === "clipper") {
      beep(108, 0.065, "sawtooth", 0.022);
      beep(216, 0.055, "square", 0.009);
      noiseBurst(0.06, 520, 0.012);
    } else if (tool === "dryer") {
      noiseBurst(0.1, 780, 0.026);
      beep(74, 0.09, "sine", 0.012);
    } else if (tool === "comb") {
      noiseBurst(0.045, 1250, 0.014);
    }
  }

  function noiseBurst(duration, frequency, volume) {
    try {
      unlockAudio();
      const length = Math.max(1, Math.floor(audioCtx.sampleRate * duration));
      const buffer = audioCtx.createBuffer(1, length, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      const source = audioCtx.createBufferSource();
      const filter = audioCtx.createBiquadFilter();
      const gain = audioCtx.createGain();
      source.buffer = buffer;
      filter.type = "bandpass";
      filter.frequency.value = frequency;
      filter.Q.value = 0.7;
      gain.gain.value = volume;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      source.start();
    } catch (error) {}
  }

  function unlockAudio() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
    } catch (error) {}
  }

  function beep(freq, duration, type, volume) {
    try {
      unlockAudio();
      const oscillator = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      oscillator.type = type;
      oscillator.frequency.value = freq;
      gain.gain.setValueAtTime(volume, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      oscillator.connect(gain);
      gain.connect(audioCtx.destination);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + duration);
    } catch (error) {}
  }

  window.HairSalon = { start, stop, selectTool, rotate, finish, nextClient, retry };
})();
