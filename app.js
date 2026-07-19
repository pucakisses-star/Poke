"use strict";

/* ============ Constants ============ */

const GENERATIONS = [
  { num: "I", region: "Kanto", from: 1, to: 151 },
  { num: "II", region: "Johto", from: 152, to: 251 },
  { num: "III", region: "Hoenn", from: 252, to: 386 },
  { num: "IV", region: "Sinnoh", from: 387, to: 493 },
  { num: "V", region: "Unova", from: 494, to: 649 },
  { num: "VI", region: "Kalos", from: 650, to: 721 },
  { num: "VII", region: "Alola", from: 722, to: 809 },
  { num: "VIII", region: "Galar", from: 810, to: 905 },
  { num: "IX", region: "Paldea", from: 906, to: 1025 },
];

const SIZE_OPTIONS = [8, 16, 32, 64, 128, "all"];

const TYPE_COLORS = {
  normal: "#A8A77A", fire: "#EE8130", water: "#6390F0", electric: "#F7D02C",
  grass: "#7AC74C", ice: "#96D9D6", fighting: "#C22E28", poison: "#A33EA1",
  ground: "#E2BF65", flying: "#A98FF3", psychic: "#F95587", bug: "#A6B91A",
  rock: "#B6A136", ghost: "#735797", dragon: "#6F35FC", dark: "#705746",
  steel: "#B7B7CE", fairy: "#D685AD",
};

const BY_ID = new Map(POKEMON.map((p) => [p.id, p]));

const artUrl = (id) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
const spriteUrl = (id) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;

const PICK_ANIM_MS = 420;

/* ============ State ============ */

const state = {
  selectedGens: new Set(GENERATIONS.map((_, i) => i)),
  sizeChoice: 32,
  screen: "start",
  round: [],      // Pokémon ids still alive in the current round
  next: [],       // winners advancing to the next round
  match: 0,       // index of the current match within the round
  roundNum: 0,
  picks: 0,
  totalPicks: 0,
  losers: [],     // losers[roundNum] = ids eliminated in that round, in pick order
  history: [],    // snapshots for undo
  locked: false,  // input lock during the pick animation
};

/* ============ Helpers ============ */

const $ = (id) => document.getElementById(id);
const cardEls = () => [$("card-a"), $("card-b")];

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function poolIds() {
  const ids = [];
  for (const gi of state.selectedGens) {
    const g = GENERATIONS[gi];
    for (let id = g.from; id <= g.to; id++) ids.push(id);
  }
  return ids;
}

function bracketSizeFor(poolLen) {
  return state.sizeChoice === "all" ? poolLen : Math.min(state.sizeChoice, poolLen);
}

function roundName(len) {
  if (len === 2) return "The Final";
  if (len <= 4) return "Semifinals";
  if (len <= 8) return "Quarterfinals";
  return `Round of ${len}`;
}

function badgeHtml(type) {
  const bg = TYPE_COLORS[type] || "#777";
  const r = parseInt(bg.slice(1, 3), 16);
  const g = parseInt(bg.slice(3, 5), 16);
  const b = parseInt(bg.slice(5, 7), 16);
  const fg = (r * 299 + g * 587 + b * 114) / 1000 >= 150 ? "#141a2e" : "#fff";
  return `<span class="type-badge" style="background:${bg};color:${fg}">${type}</span>`;
}

function attachSpriteFallback(img) {
  img.addEventListener("error", () => {
    const id = img.dataset.id;
    if (id && img.dataset.fallbackTried !== id) {
      img.dataset.fallbackTried = id;
      img.src = spriteUrl(id);
    }
  });
}

function showScreen(name) {
  state.screen = name;
  for (const s of ["start", "battle", "winner"]) {
    $("screen-" + s).classList.toggle("hidden", s !== name);
  }
  if (name !== "winner") stopConfetti();
}

/* ============ Start screen ============ */

function buildStartControls() {
  const grid = $("gen-grid");
  GENERATIONS.forEach((g, i) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "gen-chip active";
    chip.setAttribute("aria-pressed", "true");
    chip.innerHTML =
      `<span class="gen-num">Gen ${g.num}</span>` +
      `<span class="gen-region">${g.region}</span>` +
      `<span class="gen-count">${g.to - g.from + 1} Pokémon</span>`;
    chip.addEventListener("click", () => {
      if (state.selectedGens.has(i)) state.selectedGens.delete(i);
      else state.selectedGens.add(i);
      chip.classList.toggle("active", state.selectedGens.has(i));
      chip.setAttribute("aria-pressed", String(state.selectedGens.has(i)));
      renderStartSummary();
    });
    grid.appendChild(chip);
  });

  $("gens-all").addEventListener("click", () => setAllGens(true));
  $("gens-none").addEventListener("click", () => setAllGens(false));

  const sizeRow = $("size-row");
  SIZE_OPTIONS.forEach((opt) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "size-btn" + (opt === state.sizeChoice ? " active" : "");
    btn.textContent = opt === "all" ? "Everyone" : String(opt);
    btn.addEventListener("click", () => {
      state.sizeChoice = opt;
      sizeRow.querySelectorAll(".size-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderStartSummary();
    });
    sizeRow.appendChild(btn);
  });

  $("btn-start").addEventListener("click", startBracket);
}

function setAllGens(on) {
  state.selectedGens = new Set(on ? GENERATIONS.map((_, i) => i) : []);
  document.querySelectorAll(".gen-chip").forEach((chip) => {
    chip.classList.toggle("active", on);
    chip.setAttribute("aria-pressed", String(on));
  });
  renderStartSummary();
}

function renderStartSummary() {
  const pool = poolIds().length;
  const summary = $("pool-summary");
  if (pool < 2) {
    summary.textContent = "Pick at least one generation to get started.";
  } else {
    const size = bracketSizeFor(pool);
    const chosen =
      state.sizeChoice === "all" || size === pool
        ? `all <strong>${size}</strong> of them enter the bracket`
        : `<strong>${size}</strong> random contenders enter the bracket`;
    summary.innerHTML =
      `${pool} Pokémon in the pool — ${chosen}. ` +
      `Crowning your favorite takes <strong>${size - 1}</strong> picks.`;
  }
  $("btn-start").disabled = pool < 2;
}

/* ============ Bracket flow ============ */

function startBracket() {
  const pool = shuffle(poolIds());
  const size = bracketSizeFor(pool.length);
  if (size < 2) return;

  state.round = pool.slice(0, size);
  state.next = [];
  state.match = 0;
  state.roundNum = 0;
  state.picks = 0;
  state.totalPicks = size - 1;
  state.losers = [[]];
  state.history = [];
  state.locked = false;

  showScreen("battle");
  renderBattle(true);
}

function currentPair() {
  return [state.round[state.match * 2], state.round[state.match * 2 + 1]];
}

function snapshot() {
  return {
    round: [...state.round],
    next: [...state.next],
    match: state.match,
    roundNum: state.roundNum,
    picks: state.picks,
    losers: state.losers.map((l) => [...l]),
  };
}

function pick(side) {
  if (state.locked || state.screen !== "battle") return;
  const [a, b] = currentPair();
  if (a === undefined || b === undefined) return;

  state.history.push(snapshot());
  const winner = side === 0 ? a : b;
  const loser = side === 0 ? b : a;
  state.losers[state.roundNum].push(loser);
  state.next.push(winner);
  state.picks++;

  state.locked = true;
  const [cardA, cardB] = cardEls();
  (side === 0 ? cardA : cardB).classList.add("win");
  (side === 0 ? cardB : cardA).classList.add("lose");

  setTimeout(() => {
    cardA.classList.remove("win", "lose");
    cardB.classList.remove("win", "lose");
    state.locked = false;
    advance();
  }, PICK_ANIM_MS);
}

function advance() {
  state.match++;
  const len = state.round.length;

  if (state.match * 2 + 1 >= len) {
    // Round complete. An unpaired straggler gets a bye into the next round.
    if (state.match * 2 < len) state.next.push(state.round[state.match * 2]);

    if (state.next.length === 1) {
      crownChampion(state.next[0]);
      return;
    }
    state.round = shuffle([...state.next]);
    state.next = [];
    state.match = 0;
    state.roundNum++;
    state.losers.push([]);
  }
  renderBattle(true);
}

function undo() {
  if (state.locked) return;
  const s = state.history.pop();
  if (!s) return;
  state.round = s.round;
  state.next = s.next;
  state.match = s.match;
  state.roundNum = s.roundNum;
  state.picks = s.picks;
  state.losers = s.losers;
  showScreen("battle");
  renderBattle(false);
}

function restart() {
  if (state.picks >= 8 && !window.confirm("Abandon this bracket and go back to settings?")) return;
  showScreen("start");
  renderStartSummary();
}

/* ============ Battle rendering ============ */

function fillCard(el, id, deal) {
  const p = BY_ID.get(id);
  el.style.setProperty("--accent", TYPE_COLORS[p.types[0]] || "#ffcb05");
  const img = el.querySelector(".poke-img");
  img.dataset.id = String(id);
  img.dataset.fallbackTried = "";
  img.src = artUrl(id);
  img.alt = `${p.name} artwork`;
  el.querySelector(".poke-id").textContent = "#" + String(id).padStart(4, "0");
  el.querySelector(".poke-name").textContent = p.name;
  el.querySelector(".type-badges").innerHTML = p.types.map(badgeHtml).join("");
  el.setAttribute("aria-label", `Choose ${p.name}`);
  if (deal) {
    el.classList.remove("deal");
    void el.offsetWidth; // restart the deal-in animation
    el.classList.add("deal");
  }
}

function renderBattle(deal) {
  const len = state.round.length;
  const [a, b] = currentPair();
  $("round-label").textContent = roundName(len);
  const toGo = state.totalPicks - state.picks;
  $("match-label").textContent =
    `Match ${state.match + 1} of ${Math.floor(len / 2)} · ` +
    `${toGo} pick${toGo === 1 ? "" : "s"} to go`;
  $("progress-fill").style.width = `${(state.picks / state.totalPicks) * 100}%`;

  const [cardA, cardB] = cardEls();
  fillCard(cardA, a, deal);
  fillCard(cardB, b, deal);
  $("btn-undo").disabled = state.history.length === 0;

  // Warm the cache for the upcoming match.
  const i = (state.match + 1) * 2;
  for (const id of [state.round[i], state.round[i + 1]]) {
    if (id !== undefined) new Image().src = artUrl(id);
  }
}

/* ============ Champion screen ============ */

function crownChampion(id) {
  const p = BY_ID.get(id);
  const img = $("champ-img");
  img.dataset.id = String(id);
  img.dataset.fallbackTried = "";
  img.src = artUrl(id);
  img.alt = `${p.name} artwork`;
  $("champ-hero").querySelector(".champ-glow").style.setProperty(
    "--accent", TYPE_COLORS[p.types[0]] || "#ffcb05"
  );
  $("champ-name").textContent = p.name;
  $("champ-meta").innerHTML =
    `<span class="poke-id">#${String(id).padStart(4, "0")}</span>` +
    p.types.map(badgeHtml).join("");
  $("champ-stats").textContent =
    `Decided in ${state.picks} pick${state.picks === 1 ? "" : "s"} ` +
    `from a bracket of ${state.totalPicks + 1}.`;

  const finalRound = state.losers.length - 1;
  const podium = [];
  const finalLosers = state.losers[finalRound] || [];
  if (finalLosers.length > 0) {
    podium.push({ id: finalLosers[finalLosers.length - 1], place: "Runner-up" });
  }
  if (finalRound > 0) {
    for (const l of state.losers[finalRound - 1]) podium.push({ id: l, place: "Top 4" });
  }
  $("podium").innerHTML = podium
    .map((s) => {
      const q = BY_ID.get(s.id);
      return (
        `<div class="podium-slot">` +
        `<img src="${artUrl(s.id)}" alt="${q.name}" loading="lazy" ` +
        `onerror="this.onerror=null;this.src='${spriteUrl(s.id)}'">` +
        `<span class="podium-place">${s.place}</span>` +
        `<span class="podium-name">${q.name}</span>` +
        `</div>`
      );
    })
    .join("");

  showScreen("winner");
  startConfetti();
}

/* ============ Confetti ============ */

let confettiRaf = null;

function startConfetti() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const canvas = $("confetti");
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.classList.remove("hidden");

  const colors = ["#ffcb05", "#e3350d", "#3b4cca", "#7ac74c", "#f95587", "#96d9d6"];
  const parts = Array.from({ length: 130 }, () => ({
    x: Math.random() * canvas.width,
    y: -30 - Math.random() * canvas.height * 0.6,
    w: 5 + Math.random() * 6,
    h: 8 + Math.random() * 8,
    vx: -0.8 + Math.random() * 1.6,
    vy: 2 + Math.random() * 3,
    rot: Math.random() * Math.PI,
    vr: -0.1 + Math.random() * 0.2,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));

  const started = performance.now();
  const tick = (now) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const part of parts) {
      part.x += part.vx;
      part.y += part.vy;
      part.rot += part.vr;
      if (part.y > canvas.height + 30 && now - started < 5500) {
        part.y = -30;
        part.x = Math.random() * canvas.width;
      }
      ctx.save();
      ctx.translate(part.x, part.y);
      ctx.rotate(part.rot);
      ctx.fillStyle = part.color;
      ctx.fillRect(-part.w / 2, -part.h / 2, part.w, part.h);
      ctx.restore();
    }
    if (now - started < 8000) confettiRaf = requestAnimationFrame(tick);
    else stopConfetti();
  };
  confettiRaf = requestAnimationFrame(tick);
}

function stopConfetti() {
  if (confettiRaf !== null) cancelAnimationFrame(confettiRaf);
  confettiRaf = null;
  const canvas = $("confetti");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  canvas.classList.add("hidden");
}

/* ============ Wiring ============ */

function init() {
  buildStartControls();
  renderStartSummary();

  const [cardA, cardB] = cardEls();
  cardA.addEventListener("click", () => pick(0));
  cardB.addEventListener("click", () => pick(1));
  attachSpriteFallback(cardA.querySelector(".poke-img"));
  attachSpriteFallback(cardB.querySelector(".poke-img"));
  attachSpriteFallback($("champ-img"));

  $("btn-undo").addEventListener("click", undo);
  $("btn-restart").addEventListener("click", restart);
  $("btn-home").addEventListener("click", () => {
    if (state.screen === "battle") restart();
    else {
      showScreen("start");
      renderStartSummary();
    }
  });

  $("btn-again").addEventListener("click", startBracket);
  $("btn-settings").addEventListener("click", () => {
    showScreen("start");
    renderStartSummary();
  });
  $("btn-undo-final").addEventListener("click", undo);

  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" && state.screen === "battle") {
      e.preventDefault();
      pick(0);
    } else if (e.key === "ArrowRight" && state.screen === "battle") {
      e.preventDefault();
      pick(1);
    } else if (
      (e.key.toLowerCase() === "z" || e.key === "Backspace") &&
      (state.screen === "battle" || state.screen === "winner")
    ) {
      e.preventDefault();
      undo();
    }
  });
}

init();
