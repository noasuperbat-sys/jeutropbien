(() => {
  const LEVELS = [
    { title: "Animaux", size: 7, words: ["CHAT", "CHIEN", "LION", "OURS", "LOUP"] },
    { title: "Couleurs", size: 7, words: ["ROUGE", "BLEU", "VERT", "ROSE", "JAUNE"] },
    { title: "Fruits", size: 8, words: ["POMME", "POIRE", "KIWI", "MELON", "FRAISE", "PECHE"] },
    { title: "École", size: 8, words: ["STYLO", "LIVRE", "COLLE", "REGLE", "TABLE", "CLASSE"] },
    { title: "Nature", size: 8, words: ["FLEUR", "ARBRE", "NUAGE", "SOLEIL", "RIVIERE", "HERBE"] },
    { title: "Cuisine", size: 9, words: ["PIZZA", "PAIN", "SOUPE", "FRITES", "SALADE", "GATEAU", "PATES"] },
    { title: "Sports", size: 9, words: ["TENNIS", "RUGBY", "FOOT", "JUDO", "SKI", "BOXE", "VELO"] },
    { title: "Espace", size: 9, words: ["LUNE", "MARS", "ETOILE", "FUSEE", "SATURNE", "COMETE", "ESPACE"] },
    { title: "Voyage", size: 10, words: ["AVION", "TRAIN", "PLAGE", "HOTEL", "VALISE", "BATEAU", "ROUTE", "CARTE"] },
    { title: "Jeux", size: 10, words: ["TETRIS", "SNAKE", "ECHECS", "MEMORY", "SIMON", "PUZZLE", "ARCADE", "SCORE"] },
    { title: "Jungle", size: 10, words: ["SINGE", "TIGRE", "PANDA", "ZEBRE", "LIANE", "TOUCAN", "JAGUAR", "BAMBOU"] },
    { title: "Grand défi", size: 11, words: ["AVENTURE", "VICTOIRE", "CHAMPION", "MYSTERE", "RAPIDITE", "COURAGE", "TRESOR", "SECRET"] }
  ];
  const COLORS = ["#23bfa1", "#ff756f", "#4c86e8", "#9b68dd", "#efaa32", "#ed5a9a", "#5fae42", "#2faec1"];
  const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const SAVE_KEY = "wordSearchUnlocked";

  let levelIndex = 0;
  let grid = [];
  let placedWords = [];
  let foundWords = new Set();
  let selecting = false;
  let startCell = null;
  let currentPath = [];
  let startedAt = 0;
  let timer = null;
  let active = false;
  let audioCtx = null;

  function start() {
    active = true;
    levelIndex = Math.min(LEVELS.length - 1, Math.max(0, Number(localStorage.getItem("wordSearchCurrent") || 0)));
    createLevel(levelIndex);
  }

  function stop() {
    active = false;
    selecting = false;
    clearInterval(timer);
  }

  function createLevel(index) {
    levelIndex = Math.max(0, Math.min(LEVELS.length - 1, index));
    localStorage.setItem("wordSearchCurrent", String(levelIndex));
    foundWords = new Set();
    placedWords = [];
    const level = LEVELS[levelIndex];
    grid = Array.from({ length: level.size }, () => Array(level.size).fill(""));
    const allowReverse = levelIndex >= 3;
    const directions = levelIndex < 2
      ? [[0, 1], [1, 0]]
      : [[0, 1], [1, 0], [1, 1], [1, -1]];

    [...level.words].sort((a, b) => b.length - a.length).forEach((word, wordIndex) => {
      placeWord(normalizeWord(word), directions, allowReverse, wordIndex);
    });
    fillEmptyCells();
    render();
    startedAt = Date.now();
    clearInterval(timer);
    timer = setInterval(updateTimer, 1000);
    updateTimer();
    setMessage(levelIndex < 2 ? "Glisse horizontalement ou verticalement." : "Les diagonales sont maintenant possibles !");
    document.getElementById("wordsearchComplete").hidden = true;
  }

  function placeWord(originalWord, directions, allowReverse, wordIndex) {
    const word = allowReverse && pseudoRandom(wordIndex + levelIndex * 13) > 0.56
      ? [...originalWord].reverse().join("")
      : originalWord;
    const size = grid.length;
    for (let attempt = 0; attempt < 350; attempt++) {
      const direction = directions[Math.floor(pseudoRandom(attempt * 19 + wordIndex * 31 + levelIndex) * directions.length)];
      const row = Math.floor(pseudoRandom(attempt * 43 + wordIndex * 17 + 2) * size);
      const col = Math.floor(pseudoRandom(attempt * 59 + wordIndex * 23 + 7) * size);
      const endRow = row + direction[0] * (word.length - 1);
      const endCol = col + direction[1] * (word.length - 1);
      if (endRow < 0 || endRow >= size || endCol < 0 || endCol >= size) continue;
      const cells = [];
      let valid = true;
      for (let i = 0; i < word.length; i++) {
        const r = row + direction[0] * i;
        const c = col + direction[1] * i;
        if (grid[r][c] && grid[r][c] !== word[i]) valid = false;
        cells.push([r, c]);
      }
      if (!valid) continue;
      cells.forEach(([r, c], i) => { grid[r][c] = word[i]; });
      placedWords.push({ original: originalWord, drawn: word, cells, color: COLORS[wordIndex % COLORS.length] });
      return;
    }
  }

  function fillEmptyCells() {
    grid.forEach((row, r) => row.forEach((letter, c) => {
      if (!letter) grid[r][c] = LETTERS[Math.floor(pseudoRandom(r * 97 + c * 53 + levelIndex * 211) * LETTERS.length)];
    }));
  }

  function render() {
    const level = LEVELS[levelIndex];
    const board = document.getElementById("wordsearchBoard");
    board.style.setProperty("--grid-size", level.size);
    board.innerHTML = grid.flatMap((row, r) => row.map((letter, c) =>
      `<button class="wordsearch-cell" data-row="${r}" data-col="${c}" aria-label="Lettre ${letter}">${letter}</button>`
    )).join("");
    board.onpointerdown = pointerDown;
    board.onpointermove = pointerMove;
    board.onpointerup = pointerUp;
    board.onpointercancel = cancelSelection;
    board.oncontextmenu = event => event.preventDefault();

    document.getElementById("wordsearchLevel").textContent = `${levelIndex + 1}/${LEVELS.length}`;
    document.getElementById("wordsearchTheme").textContent = level.title;
    document.getElementById("wordsearchWords").innerHTML = placedWords.map(word =>
      `<div class="wordsearch-word" data-word="${word.original}" style="--word-color:${word.color}">${displayWord(word.original)}</div>`
    ).join("");
    updateUi();
  }

  function pointerDown(event) {
    const cell = event.target.closest(".wordsearch-cell");
    if (!cell) return;
    unlockAudio();
    selecting = true;
    startCell = cellCoordinates(cell);
    currentPath = [startCell];
    event.currentTarget.setPointerCapture?.(event.pointerId);
    paintSelection();
    event.preventDefault();
  }

  function pointerMove(event) {
    if (!selecting || !startCell) return;
    const element = document.elementFromPoint(event.clientX, event.clientY);
    const cell = element?.closest?.(".wordsearch-cell");
    if (!cell) return;
    currentPath = straightPath(startCell, cellCoordinates(cell));
    paintSelection();
    event.preventDefault();
  }

  function pointerUp(event) {
    if (!selecting) return;
    selecting = false;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    checkSelection();
  }

  function cancelSelection() {
    selecting = false;
    clearSelectingClasses();
  }

  function straightPath(start, end) {
    const rawDr = end.row - start.row;
    const rawDc = end.col - start.col;
    if (!rawDr && !rawDc) return [start];
    let dr = Math.sign(rawDr);
    let dc = Math.sign(rawDc);
    if (Math.abs(rawDr) > Math.abs(rawDc) * 1.65) dc = 0;
    else if (Math.abs(rawDc) > Math.abs(rawDr) * 1.65) dr = 0;
    const length = Math.max(Math.abs(rawDr), Math.abs(rawDc));
    const path = [];
    for (let i = 0; i <= length; i++) {
      const row = start.row + dr * i;
      const col = start.col + dc * i;
      if (!grid[row]?.[col]) break;
      path.push({ row, col });
    }
    return path;
  }

  function paintSelection() {
    clearSelectingClasses();
    currentPath.forEach(({ row, col }) => getCell(row, col)?.classList.add("selecting"));
  }

  function checkSelection() {
    const selected = currentPath.map(({ row, col }) => grid[row][col]).join("");
    const reversed = [...selected].reverse().join("");
    const match = placedWords.find(word =>
      !foundWords.has(word.original) && (word.original === selected || word.original === reversed)
    );
    clearSelectingClasses();
    if (!match) {
      shakeBoard();
      setMessage(selected.length > 1 ? `${selected} n'est pas dans la liste.` : "Continue de glisser.");
      beep(145, 0.08, "sine", 0.025);
      return;
    }
    foundWords.add(match.original);
    match.cells.forEach(([row, col]) => {
      const cell = getCell(row, col);
      cell.classList.add("found");
      cell.style.setProperty("--word-color", match.color);
    });
    const chip = document.querySelector(`[data-word="${match.original}"]`);
    chip?.classList.add("found");
    chip?.style.setProperty("--word-color", match.color);
    setMessage(`${displayWord(match.original)} trouvé !`);
    successSound(foundWords.size);
    updateUi();
    if (foundWords.size === placedWords.length) completeLevel();
  }

  function completeLevel() {
    clearInterval(timer);
    const unlocked = Math.max(Number(localStorage.getItem(SAVE_KEY) || 1), levelIndex + 2);
    localStorage.setItem(SAVE_KEY, String(Math.min(LEVELS.length, unlocked)));
    const seconds = Math.max(1, Math.floor((Date.now() - startedAt) / 1000));
    document.getElementById("wordsearchCompleteTitle").textContent = levelIndex === LEVELS.length - 1 ? "Tous les niveaux terminés !" : "Grille terminée !";
    document.getElementById("wordsearchCompleteText").textContent = `${placedWords.length} mots trouvés en ${formatTime(seconds)}.`;
    document.getElementById("wordsearchNextButton").textContent = levelIndex === LEVELS.length - 1 ? "Rejouer" : "Niveau suivant";
    setTimeout(() => {
      document.getElementById("wordsearchComplete").hidden = false;
      victorySound();
    }, 420);
  }

  function nextLevel() {
    createLevel(levelIndex === LEVELS.length - 1 ? 0 : levelIndex + 1);
  }

  function restart() {
    createLevel(levelIndex);
  }

  function updateUi() {
    document.getElementById("wordsearchFound").textContent = `${foundWords.size}/${placedWords.length}`;
    document.getElementById("wordsearchProgress").style.width = `${placedWords.length ? foundWords.size / placedWords.length * 100 : 0}%`;
  }

  function updateTimer() {
    const seconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
    const element = document.getElementById("wordsearchTime");
    if (element) element.textContent = formatTime(seconds);
  }

  function getCell(row, col) {
    return document.querySelector(`.wordsearch-cell[data-row="${row}"][data-col="${col}"]`);
  }

  function cellCoordinates(cell) {
    return { row: Number(cell.dataset.row), col: Number(cell.dataset.col) };
  }

  function clearSelectingClasses() {
    document.querySelectorAll(".wordsearch-cell.selecting").forEach(cell => cell.classList.remove("selecting"));
  }

  function shakeBoard() {
    const board = document.getElementById("wordsearchBoard");
    board.animate(
      [{ transform: "translateX(0)" }, { transform: "translateX(-7px)" }, { transform: "translateX(7px)" }, { transform: "translateX(0)" }],
      { duration: 220 }
    );
  }

  function setMessage(text) {
    const element = document.getElementById("wordsearchMessage");
    if (element) element.textContent = text;
  }

  function normalizeWord(word) {
    return word.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  }

  function displayWord(word) {
    return word.charAt(0) + word.slice(1).toLowerCase();
  }

  function formatTime(seconds) {
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  }

  function pseudoRandom(seed) {
    const value = Math.sin(seed * 999.91 + 78.233) * 43758.5453;
    return value - Math.floor(value);
  }

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
      gain.gain.setValueAtTime(volume, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      oscillator.connect(gain);
      gain.connect(audioCtx.destination);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + duration);
    } catch (error) {}
  }

  function successSound(step) {
    beep(430 + step * 35, 0.08, "triangle", 0.045);
    setTimeout(() => beep(590 + step * 25, 0.1, "sine", 0.035), 65);
  }

  function victorySound() {
    [520, 660, 820].forEach((frequency, index) => {
      setTimeout(() => beep(frequency, 0.16, "triangle", 0.055), index * 100);
    });
  }

  window.WordSearch = { start, stop, restart, nextLevel };
})();
