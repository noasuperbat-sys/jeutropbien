(() => {
  const SIZE = 8;
  const COLORS = ["#35c7ff", "#3978ff", "#ffcb32", "#ff5d67", "#55df75", "#a971ff"];
  const SHAPES = [
    [[0,0]], [[0,0],[1,0]], [[0,0],[1,0],[2,0]], [[0,0],[0,1],[0,2]],
    [[0,0],[1,0],[2,0],[3,0]], [[0,0],[0,1],[0,2],[0,3]],
    [[0,0],[1,0],[0,1],[1,1]], [[0,0],[1,0],[2,0],[0,1]],
    [[0,0],[1,0],[2,0],[2,1]], [[0,0],[0,1],[1,1],[2,1]],
    [[2,0],[0,1],[1,1],[2,1]], [[0,0],[1,0],[1,1]],
    [[0,0],[0,1],[1,1]], [[0,0],[1,0],[2,0],[1,1]],
    [[0,0],[1,0],[2,0],[1,1],[1,2]], [[0,0],[1,0],[0,1]]
  ];

  let canvas, ctx, dpr = 1, width = 0, height = 0, raf = null;
  let board = [], tray = [], drag = null, particles = [], banners = [], clears = [];
  let score = 0, best = 0, combo = 0, running = false, audioCtx = null;
  let placements = 0, placementsSinceDelight = 0, lastPlacementAt = 0;
  let averagePlacementMs = 1800, nextDelightAt = 0, delightReady = false;
  let boardPulse = 0, scoreBursts = [];
  let layout = {};

  function start() {
    setup();
    restart();
  }

  function setup() {
    canvas = document.getElementById("blastCanvas");
    ctx = canvas.getContext("2d");
    if (canvas.dataset.ready) {
      resize();
      return;
    }
    canvas.dataset.ready = "1";
    window.addEventListener("resize", resize);
    canvas.addEventListener("pointerdown", pointerDown);
    canvas.addEventListener("pointermove", pointerMove);
    canvas.addEventListener("pointerup", pointerUp);
    canvas.addEventListener("pointercancel", cancelDrag);
    resize();
  }

  function resize() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    width = rect.width;
    height = rect.height;
    computeLayout();
  }

  function computeLayout() {
    const mobile = width <= 820;
    const maxBoard = mobile
      ? Math.min(width - 24, height - 305)
      : Math.min(width - 310, height - 210, 650);
    const boardSize = Math.max(250, maxBoard);
    const left = mobile ? (width - boardSize) / 2 : Math.max(20, (width - 250 - boardSize) / 2);
    const top = mobile ? 84 : Math.max(92, (height - boardSize - 150) / 2);
    layout = {
      mobile,
      boardSize,
      cell: boardSize / SIZE,
      left,
      top,
      trayY: top + boardSize + (mobile ? 24 : 20),
      trayHeight: mobile ? 120 : 126
    };
  }

  function restart() {
    setup();
    board = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
    tray = [];
    particles = [];
    banners = [];
    clears = [];
    drag = null;
    score = 0;
    combo = 0;
    placements = 0;
    placementsSinceDelight = 0;
    lastPlacementAt = performance.now();
    averagePlacementMs = 1800;
    nextDelightAt = lastPlacementAt + getNextDelightDelay();
    delightReady = false;
    boardPulse = 0;
    scoreBursts = [];
    best = Number(readStorage("bestBlockBlastScore", 0)) || 0;
    refillTray();
    running = true;
    updateHud();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    drag = null;
    cancelAnimationFrame(raf);
    raf = null;
  }

  function refillTray() {
    tray = Array.from({ length: 3 }, (_, index) => makePiece(index));
    if (!tray.some(piece => canPlaceAnywhere(piece))) {
      tray[0] = makeFittingPiece(0);
    }
  }

  function makePiece(index, shape = null) {
    const selected = shape || SHAPES[Math.floor(Math.random() * SHAPES.length)];
    return {
      id: `${Date.now()}-${Math.random()}`,
      shape: selected.map(([x, y]) => [x, y]),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      index,
      used: false,
      pulse: 0
    };
  }

  function makeFittingPiece(index) {
    const shuffled = [...SHAPES].sort(() => Math.random() - 0.5);
    for (const shape of shuffled) {
      const piece = makePiece(index, shape);
      if (canPlaceAnywhere(piece)) return piece;
    }
    return makePiece(index, [[0,0]]);
  }

  function pointerDown(event) {
    if (!running) return;
    unlockAudio();
    const point = pointerPoint(event);
    const hit = tray.find(piece => !piece.used && pointInPieceSlot(point, piece.index));
    if (!hit) return;
    canvas.setPointerCapture?.(event.pointerId);
    drag = { piece: hit, x: point.x, y: point.y - layout.cell * 1.35, row: -1, col: -1, valid: false };
    hit.pulse = 1;
    playPickupSound();
    updateDragTarget();
  }

  function pointerMove(event) {
    if (!drag) return;
    const point = pointerPoint(event);
    drag.x = point.x;
    drag.y = point.y - layout.cell * 1.35;
    updateDragTarget();
  }

  function pointerUp() {
    if (!drag) return;
    if (drag.valid) placePiece(drag.piece, drag.row, drag.col);
    else {
      drag.piece.pulse = 0.65;
      beep(145, 0.045, "sine", 0.018);
    }
    drag.piece.pulse = 0;
    drag = null;
  }

  function cancelDrag() {
    if (drag) drag.piece.pulse = 0;
    drag = null;
  }

  function pointerPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function pointInPieceSlot(point, index) {
    const slot = pieceSlot(index);
    return point.x >= slot.x && point.x <= slot.x + slot.w &&
      point.y >= slot.y && point.y <= slot.y + slot.h;
  }

  function updateDragTarget() {
    const bounds = shapeBounds(drag.piece.shape);
    const col = Math.round((drag.x - layout.left) / layout.cell - bounds.w / 2);
    const row = Math.round((drag.y - layout.top) / layout.cell - bounds.h / 2);
    drag.col = col;
    drag.row = row;
    drag.valid = canPlace(drag.piece, row, col);
  }

  function placePiece(piece, row, col) {
    const now = performance.now();
    const placementGap = Math.min(6000, Math.max(250, now - lastPlacementAt));
    averagePlacementMs = averagePlacementMs * 0.72 + placementGap * 0.28;
    lastPlacementAt = now;
    placements += 1;
    placementsSinceDelight += 1;
    piece.shape.forEach(([x, y]) => {
      board[row + y][col + x] = piece.color;
      burstCell(row + y, col + x, piece.color, 4);
    });
    piece.used = true;
    score += piece.shape.length;
    addScoreBurst(`+${piece.shape.length}`, row, col, piece.shape);
    playPlacementSound(piece.shape.length);
    const completedRows = [];
    const completedCols = [];
    for (let r = 0; r < SIZE; r++) if (board[r].every(Boolean)) completedRows.push(r);
    for (let c = 0; c < SIZE; c++) if (board.every(line => line[c])) completedCols.push(c);
    const lines = completedRows.length + completedCols.length;
    if (lines) {
      combo += 1;
      const lineBonus = lines * 100 * combo + Math.max(0, lines - 1) * 75;
      score += lineBonus;
      const cleared = new Set();
      completedRows.forEach(r => {
        for (let c = 0; c < SIZE; c++) cleared.add(`${r},${c}`);
      });
      completedCols.forEach(c => {
        for (let r = 0; r < SIZE; r++) cleared.add(`${r},${c}`);
      });
      cleared.forEach(key => {
        const [r, c] = key.split(",").map(Number);
        clears.push({ r, c, color: board[r][c], life: 1 });
        burstCell(r, c, board[r][c], 10);
        board[r][c] = null;
      });
      showCombo(lines, lineBonus);
      playClearSound(lines, combo);
      resetDelightClock(now);
      boardPulse = 1;
    } else {
      combo = 0;
      if (delightReady && placementsSinceDelight >= 2) {
        triggerFlowReward(piece, row, col, now);
      } else {
        beep(330 + Math.min(placements, 8) * 12, 0.04, "sine", 0.025);
      }
    }
    best = Math.max(best, score);
    writeStorage("bestBlockBlastScore", best);
    updateHud();
    if (tray.every(item => item.used)) refillTray();
    if (!tray.some(item => !item.used && canPlaceAnywhere(item))) finishGame();
  }

  function showCombo(lines, bonus) {
    const labels = ["", "BIEN !", "DOUBLE BLAST !", "TRIPLE BLAST !", "MEGA BLAST !"];
    const text = combo >= 3 ? `COMBO x${combo}` : labels[Math.min(lines, 4)];
    banners.push({
      text,
      sub: `+${bonus}`,
      life: 1,
      rotation: (Math.random() > 0.5 ? 1 : -1) * (0.07 + Math.random() * 0.05),
      color: combo >= 3 ? "#ffdf45" : lines > 1 ? "#68e8ff" : "#ffffff"
    });
  }

  function triggerFlowReward(piece, row, col, now) {
    const rhythmBonus = 18 + Math.min(42, placementsSinceDelight * 4 + piece.shape.length * 2);
    score += rhythmBonus;
    boardPulse = 0.82;
    banners.push({
      text: placementsSinceDelight >= 5 ? "SUPER FLOW !" : "FLOW !",
      sub: `+${rhythmBonus}`,
      life: 1,
      rotation: -0.09,
      color: "#72f4ff"
    });
    const center = pieceCenter(row, col, piece.shape);
    burstAt(center.x, center.y, piece.color, 26);
    playFlowSound();
    resetDelightClock(now);
  }

  function resetDelightClock(now = performance.now()) {
    placementsSinceDelight = 0;
    delightReady = false;
    nextDelightAt = now + getNextDelightDelay();
  }

  function getNextDelightDelay() {
    const paceAdjustment = Math.min(1900, Math.max(0, averagePlacementMs - 700) * 0.65);
    const variation = Math.random() * 900;
    return Math.min(11000, Math.max(8000, 8100 + paceAdjustment + variation));
  }

  function finishGame() {
    running = false;
    best = Math.max(best, score);
    writeStorage("bestBlockBlastScore", best);
    submitBlockBlastScore(best);
    banners.push({ text: "PLUS DE PLACE", sub: `Score ${score} · touche ↻`, life: 999, rotation: -0.05, color: "#ffdf45" });
    updateHud();
  }

  function canPlace(piece, row, col) {
    return piece.shape.every(([x, y]) => {
      const r = row + y;
      const c = col + x;
      return r >= 0 && r < SIZE && c >= 0 && c < SIZE && !board[r][c];
    });
  }

  function canPlaceAnywhere(piece) {
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        if (canPlace(piece, row, col)) return true;
      }
    }
    return false;
  }

  function loop(now) {
    updateEffects();
    draw(now);
    raf = requestAnimationFrame(loop);
  }

  function updateEffects() {
    const now = performance.now();
    if (running && !delightReady && now >= nextDelightAt) {
      delightReady = true;
      boardPulse = Math.max(boardPulse, 0.45);
      tray.filter(piece => !piece.used).forEach(piece => {
        piece.pulse = Math.max(piece.pulse, 0.34);
      });
      beep(430, 0.055, "sine", 0.018);
    }
    boardPulse *= 0.95;
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.16;
      p.life -= 0.028;
    });
    particles = particles.filter(p => p.life > 0);
    clears.forEach(item => item.life -= 0.075);
    clears = clears.filter(item => item.life > 0);
    banners.forEach(item => {
      if (item.life < 900) item.life -= 0.018;
    });
    banners = banners.filter(item => item.life > 0);
    scoreBursts.forEach(item => {
      item.y -= 0.65;
      item.life -= 0.035;
    });
    scoreBursts = scoreBursts.filter(item => item.life > 0);
    tray.forEach(piece => piece.pulse *= 0.84);
  }

  function draw(now) {
    ctx.clearRect(0, 0, width, height);
    drawBackdrop(now);
    drawBoard();
    drawTray();
    if (drag) drawDraggedPiece();
    drawParticles();
    drawScoreBursts();
    drawBanners();
  }

  function drawBackdrop(now) {
    const glow = ctx.createRadialGradient(width * 0.5, layout.top + layout.boardSize * 0.42, 10, width * 0.5, layout.top + layout.boardSize * 0.42, layout.boardSize);
    glow.addColorStop(0, "rgba(42,180,255,0.18)");
    glow.addColorStop(1, "rgba(6,23,45,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    for (let i = 0; i < 16; i++) {
      const x = (i * 137 + now * 0.01) % (width + 40) - 20;
      const y = 60 + (i * 79) % Math.max(100, height - 100);
      ctx.beginPath();
      ctx.arc(x, y, 2 + i % 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawBoard() {
    const gap = Math.max(3, layout.cell * 0.07);
    roundRect(layout.left - 9, layout.top - 9, layout.boardSize + 18, layout.boardSize + 18, 12);
    ctx.fillStyle = "rgba(3,15,34,0.76)";
    ctx.fill();
    ctx.strokeStyle = "rgba(89,202,255,0.28)";
    ctx.lineWidth = 2;
    ctx.stroke();
    if (boardPulse > 0.02) {
      ctx.save();
      ctx.globalAlpha = boardPulse * 0.55;
      ctx.shadowColor = delightReady ? "#72f4ff" : "#ffdf45";
      ctx.shadowBlur = 28 + boardPulse * 28;
      ctx.strokeStyle = delightReady ? "#72f4ff" : "#ffdf45";
      ctx.lineWidth = 3 + boardPulse * 3;
      roundRect(layout.left - 7, layout.top - 7, layout.boardSize + 14, layout.boardSize + 14, 11);
      ctx.stroke();
      ctx.restore();
    }
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const x = layout.left + c * layout.cell + gap / 2;
        const y = layout.top + r * layout.cell + gap / 2;
        drawCell(x, y, layout.cell - gap, board[r][c], 1);
      }
    }
    if (drag) {
      drag.piece.shape.forEach(([x, y]) => {
        const r = drag.row + y;
        const c = drag.col + x;
        if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) return;
        const px = layout.left + c * layout.cell + gap / 2;
        const py = layout.top + r * layout.cell + gap / 2;
        drawCell(px, py, layout.cell - gap, drag.valid ? drag.piece.color : "#ff5067", 0.48);
      });
    }
    clears.forEach(item => {
      const x = layout.left + item.c * layout.cell + gap / 2;
      const y = layout.top + item.r * layout.cell + gap / 2;
      drawCell(x, y, layout.cell - gap, item.color, item.life, 1 + (1 - item.life) * 0.55);
    });
    if (delightReady) drawAnticipationHints();
  }

  function drawAnticipationHints() {
    const pulse = 0.16 + (Math.sin(performance.now() * 0.008) + 1) * 0.08;
    ctx.save();
    ctx.fillStyle = `rgba(114,244,255,${pulse})`;
    for (let r = 0; r < SIZE; r++) {
      const filled = board[r].filter(Boolean).length;
      if (filled < 6) continue;
      for (let c = 0; c < SIZE; c++) {
        if (board[r][c]) continue;
        const x = layout.left + c * layout.cell + layout.cell * 0.16;
        const y = layout.top + r * layout.cell + layout.cell * 0.16;
        roundRect(x, y, layout.cell * 0.68, layout.cell * 0.68, layout.cell * 0.12);
        ctx.fill();
      }
    }
    for (let c = 0; c < SIZE; c++) {
      const filled = board.reduce((count, row) => count + Number(Boolean(row[c])), 0);
      if (filled < 6) continue;
      for (let r = 0; r < SIZE; r++) {
        if (board[r][c]) continue;
        const x = layout.left + c * layout.cell + layout.cell * 0.16;
        const y = layout.top + r * layout.cell + layout.cell * 0.16;
        roundRect(x, y, layout.cell * 0.68, layout.cell * 0.68, layout.cell * 0.12);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawCell(x, y, size, color, alpha = 1, scale = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    const drawSize = size * scale;
    x -= (drawSize - size) / 2;
    y -= (drawSize - size) / 2;
    roundRect(x, y, drawSize, drawSize, Math.max(4, size * 0.15));
    if (!color) {
      ctx.fillStyle = "rgba(45,111,157,0.25)";
      ctx.fill();
      ctx.strokeStyle = "rgba(105,195,239,0.08)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
      return;
    }
    ctx.shadowColor = color;
    ctx.shadowBlur = size * 0.22;
    const gradient = ctx.createLinearGradient(x, y, x + drawSize, y + drawSize);
    gradient.addColorStop(0, lighten(color, 34));
    gradient.addColorStop(0.45, color);
    gradient.addColorStop(1, darken(color, 30));
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,0.34)";
    roundRect(x + drawSize * 0.1, y + drawSize * 0.09, drawSize * 0.72, drawSize * 0.16, drawSize * 0.08);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = Math.max(1, size * 0.035);
    roundRect(x + 1, y + 1, drawSize - 2, drawSize - 2, Math.max(4, size * 0.15));
    ctx.stroke();
    ctx.restore();
  }

  function drawTray() {
    tray.forEach(piece => {
      const slot = pieceSlot(piece.index);
      roundRect(slot.x, slot.y, slot.w, slot.h, 10);
      ctx.fillStyle = piece.used ? "rgba(13,43,70,0.18)" : "rgba(12,48,79,0.62)";
      ctx.fill();
      ctx.strokeStyle = piece.used ? "rgba(255,255,255,0.04)" : "rgba(98,205,255,0.16)";
      ctx.stroke();
      if (piece.used || drag?.piece === piece) return;
      drawPieceAt(piece, slot.x + slot.w / 2, slot.y + slot.h / 2, layout.cell * (layout.mobile ? 0.58 : 0.62), 1 + piece.pulse * 0.1);
    });
  }

  function drawDraggedPiece() {
    drawPieceAt(drag.piece, drag.x, drag.y, layout.cell * 0.9, 1);
  }

  function drawPieceAt(piece, centerX, centerY, cellSize, scale) {
    const bounds = shapeBounds(piece.shape);
    const unit = cellSize * scale;
    const startX = centerX - bounds.w * unit / 2;
    const startY = centerY - bounds.h * unit / 2;
    piece.shape.forEach(([x, y]) => drawCell(startX + x * unit, startY + y * unit, unit * 0.9, piece.color, 1));
  }

  function drawParticles() {
    particles.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    });
    ctx.globalAlpha = 1;
  }

  function drawScoreBursts() {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `1000 ${Math.max(15, layout.cell * 0.34)}px Arial`;
    scoreBursts.forEach(item => {
      ctx.globalAlpha = item.life;
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#08213c";
      ctx.strokeText(item.text, item.x, item.y);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(item.text, item.x, item.y);
    });
    ctx.restore();
  }

  function drawBanners() {
    banners.forEach((banner, index) => {
      const entering = banner.life > 0.82 ? (1 - banner.life) / 0.18 : 1;
      const leaving = banner.life < 0.2 ? banner.life / 0.2 : 1;
      const scale = Math.max(0.2, entering * leaving);
      const y = layout.top + layout.boardSize * 0.38 + index * 72;
      ctx.save();
      ctx.translate(layout.left + layout.boardSize / 2, y);
      ctx.rotate(banner.rotation);
      ctx.scale(scale, scale);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";
      ctx.font = `1000 ${Math.max(32, layout.boardSize * 0.09)}px Arial`;
      ctx.lineWidth = Math.max(7, layout.boardSize * 0.018);
      ctx.strokeStyle = "#09213d";
      ctx.strokeText(banner.text, 0, 0);
      ctx.fillStyle = banner.color;
      ctx.fillText(banner.text, 0, 0);
      ctx.font = `1000 ${Math.max(20, layout.boardSize * 0.052)}px Arial`;
      ctx.strokeText(banner.sub, 0, Math.max(38, layout.boardSize * 0.09));
      ctx.fillStyle = "white";
      ctx.fillText(banner.sub, 0, Math.max(38, layout.boardSize * 0.09));
      ctx.restore();
    });
  }

  function burstCell(row, col, color, count) {
    const x = layout.left + (col + 0.5) * layout.cell;
    const y = layout.top + (row + 0.5) * layout.cell;
    for (let i = 0; i < count; i++) {
      particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 7,
        vy: -2 - Math.random() * 5,
        size: 3 + Math.random() * 7,
        color: i % 3 === 0 ? "#ffffff" : color,
        rotation: Math.random() * Math.PI,
        life: 0.65 + Math.random() * 0.35
      });
    }
  }

  function burstAt(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 10,
        vy: -3 - Math.random() * 7,
        size: 4 + Math.random() * 8,
        color: i % 4 === 0 ? "#ffffff" : color,
        rotation: Math.random() * Math.PI,
        life: 0.7 + Math.random() * 0.3
      });
    }
  }

  function pieceCenter(row, col, shape) {
    const bounds = shapeBounds(shape);
    return {
      x: layout.left + (col + bounds.w / 2) * layout.cell,
      y: layout.top + (row + bounds.h / 2) * layout.cell
    };
  }

  function addScoreBurst(text, row, col, shape) {
    const center = pieceCenter(row, col, shape);
    scoreBursts.push({ text, x: center.x, y: center.y, life: 1 });
  }

  function pieceSlot(index) {
    const available = layout.mobile ? width - 24 : Math.min(layout.boardSize, 560);
    const gap = 8;
    const slotW = (available - gap * 2) / 3;
    const left = layout.mobile ? 12 : layout.left + (layout.boardSize - available) / 2;
    return { x: left + index * (slotW + gap), y: layout.trayY, w: slotW, h: layout.trayHeight };
  }

  function shapeBounds(shape) {
    return {
      w: Math.max(...shape.map(([x]) => x)) + 1,
      h: Math.max(...shape.map(([, y]) => y)) + 1
    };
  }

  function updateHud() {
    const scoreEl = document.getElementById("blastScore");
    const bestEl = document.getElementById("blastBest");
    const comboEl = document.getElementById("blastCombo");
    if (scoreEl) {
      scoreEl.textContent = score;
      scoreEl.animate?.([{ transform: "scale(1.22)" }, { transform: "scale(1)" }], { duration: 180 });
    }
    if (bestEl) bestEl.textContent = best;
    if (comboEl) comboEl.textContent = `x${Math.max(1, combo)}`;
  }

  function unlockAudio() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
    } catch (error) {}
  }

  function playClearSound(lines, multiplier) {
    beep(420 + lines * 80, 0.09, "square", 0.055);
    setTimeout(() => beep(590 + lines * 95, 0.12, "triangle", 0.075), 45);
    setTimeout(() => beep(760 + multiplier * 55, 0.15, "sine", 0.065), 105);
  }

  function playFlowSound() {
    beep(520, 0.07, "triangle", 0.06);
    setTimeout(() => beep(690, 0.09, "triangle", 0.065), 60);
    setTimeout(() => beep(860, 0.13, "sine", 0.06), 125);
  }

  function playPickupSound() {
    beep(245, 0.035, "sine", 0.035);
    setTimeout(() => beep(330, 0.045, "triangle", 0.028), 24);
  }

  function playPlacementSound(blockCount) {
    const base = 185 + Math.min(5, blockCount) * 18;
    beep(base, 0.055, "square", 0.045);
    setTimeout(() => beep(base * 1.48, 0.065, "triangle", 0.04), 34);
  }

  function beep(frequency, duration, type, volume) {
    try {
      unlockAudio();
      const oscillator = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(volume, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      oscillator.connect(gain);
      gain.connect(audioCtx.destination);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + duration);
    } catch (error) {}
  }

  function lighten(hex, amount) {
    return shade(hex, amount);
  }

  function darken(hex, amount) {
    return shade(hex, -amount);
  }

  function shade(hex, amount) {
    const value = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, (value >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((value >> 8) & 255) + amount));
    const b = Math.max(0, Math.min(255, (value & 255) + amount));
    return `rgb(${r},${g},${b})`;
  }

  function roundRect(x, y, w, h, radius) {
    const r = Math.min(radius, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  window.BlockBlast = { start, restart, stop };
})();
