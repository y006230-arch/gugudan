const MIN = 1;
const MAX = 45;
const MAIN_COUNT = 6;
const MIN_SETS = 1;
const MAX_SETS = 5;
const HISTORY_PAGE_SIZE = 30;

const setCountEl = document.getElementById("setCount");
const decreaseBtn = document.getElementById("decrease");
const increaseBtn = document.getElementById("increase");
const drawBtn = document.getElementById("drawBtn");
const resultsEl = document.getElementById("results");
const emptyStateEl = document.getElementById("emptyState");
const drawSearchEl = document.getElementById("drawSearch");
const numberFilterEl = document.getElementById("numberFilter");
const historyMetaEl = document.getElementById("historyMeta");
const historyListEl = document.getElementById("historyList");
const loadMoreBtn = document.getElementById("loadMoreBtn");

let setCount = 1;
let isDrawing = false;
let allDraws = [];
let filteredDraws = [];
let visibleCount = HISTORY_PAGE_SIZE;

function getBallColor(num) {
  if (num <= 10) return "yellow";
  if (num <= 20) return "blue";
  if (num <= 30) return "red";
  if (num <= 40) return "gray";
  return "green";
}

function pickUniqueNumbers(count, exclude = new Set()) {
  const pool = [];
  for (let i = MIN; i <= MAX; i++) {
    if (!exclude.has(i)) pool.push(i);
  }

  const picked = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    picked.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return picked.sort((a, b) => a - b);
}

function drawOneSet() {
  const main = pickUniqueNumbers(MAIN_COUNT);
  const mainSet = new Set(main);
  const bonus = pickUniqueNumbers(1, mainSet)[0];
  return { main, bonus };
}

function createBall(num, { bonus = false, delay = 0 } = {}) {
  const ball = document.createElement("span");
  ball.className = `ball ${getBallColor(num)}${bonus ? " bonus" : ""}`;
  ball.textContent = num;
  if (delay > 0) ball.style.animationDelay = `${delay}ms`;
  ball.setAttribute("aria-label", bonus ? `보너스 번호 ${num}` : `번호 ${num}`);
  return ball;
}

function appendBallRow(container, set, { compact = false, animate = true } = {}) {
  const balls = document.createElement("div");
  balls.className = `balls${compact ? " compact" : ""}`;

  const mainGroup = document.createElement("div");
  mainGroup.className = "balls-main";
  set.main.forEach((num, i) => {
    mainGroup.appendChild(createBall(num, { delay: animate ? i * 60 : 0 }));
  });

  const bonusGroup = document.createElement("div");
  bonusGroup.className = "bonus-separator";
  const plus = document.createElement("span");
  plus.className = "bonus-plus";
  plus.textContent = "+";
  plus.setAttribute("aria-hidden", "true");
  bonusGroup.append(plus, createBall(set.bonus, { bonus: true, delay: animate ? 360 : 0 }));

  balls.append(mainGroup, bonusGroup);
  container.appendChild(balls);
}

function formatForCopy(set) {
  return `${set.main.join(", ")} + ${set.bonus}`;
}

function formatDate(isoDate) {
  const date = new Date(isoDate);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}.${m}.${d}`;
}

function formatMoney(amount) {
  if (!amount) return "";
  if (amount >= 100000000) {
    const eok = amount / 100000000;
    return `${eok % 1 === 0 ? eok : eok.toFixed(1)}억원`;
  }
  return `${Math.round(amount / 10000).toLocaleString()}만원`;
}

function normalizeDraw(raw) {
  const firstDivision = raw.divisions?.[0] ?? {};
  return {
    drawNo: raw.draw_no,
    main: [...raw.numbers].sort((a, b) => a - b),
    bonus: raw.bonus_no,
    date: raw.date,
    prize: firstDivision.prize ?? 0,
    winners: firstDivision.winners ?? 0,
  };
}

function renderResults(sets) {
  resultsEl.innerHTML = "";

  sets.forEach((set, index) => {
    const card = document.createElement("article");
    card.className = "result-card";
    card.style.animationDelay = `${index * 80}ms`;

    const header = document.createElement("div");
    header.className = "result-header";

    const label = document.createElement("span");
    label.className = "result-label";
    label.textContent = sets.length > 1 ? `${index + 1}번째 추첨` : "추첨 결과";

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "copy-btn";
    copyBtn.textContent = "복사";
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(formatForCopy(set));
        copyBtn.textContent = "복사됨!";
        copyBtn.classList.add("copied");
        setTimeout(() => {
          copyBtn.textContent = "복사";
          copyBtn.classList.remove("copied");
        }, 1500);
      } catch {
        copyBtn.textContent = "복사 실패";
        setTimeout(() => {
          copyBtn.textContent = "복사";
        }, 1500);
      }
    });

    header.append(label, copyBtn);
    card.append(header);
    appendBallRow(card, set);
    resultsEl.appendChild(card);
  });

  emptyStateEl.classList.add("hidden");
}

function createHistoryItem(draw) {
  const item = document.createElement("article");
  item.className = "history-item";

  const header = document.createElement("div");
  header.className = "history-item-header";

  const info = document.createElement("div");
  const drawEl = document.createElement("div");
  drawEl.className = "history-draw";
  drawEl.textContent = `${draw.drawNo}회`;

  const dateEl = document.createElement("div");
  dateEl.className = "history-date";
  dateEl.textContent = formatDate(draw.date);

  info.append(drawEl, dateEl);

  if (draw.prize && draw.winners) {
    const prizeEl = document.createElement("div");
    prizeEl.className = "history-prize";
    prizeEl.textContent = `1등 ${formatMoney(draw.prize)} · ${draw.winners}명`;
    info.appendChild(prizeEl);
  }

  header.appendChild(info);
  item.append(header);
  appendBallRow(item, draw, { compact: true, animate: false });

  return item;
}

function renderHistoryList() {
  historyListEl.innerHTML = "";
  const visible = filteredDraws.slice(0, visibleCount);

  if (visible.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "조건에 맞는 당첨번호가 없습니다.";
    historyListEl.appendChild(empty);
    loadMoreBtn.classList.add("hidden");
    return;
  }

  visible.forEach((draw) => {
    historyListEl.appendChild(createHistoryItem(draw));
  });

  if (visibleCount < filteredDraws.length) {
    loadMoreBtn.classList.remove("hidden");
    loadMoreBtn.textContent = `더 보기 (${visible.length}/${filteredDraws.length})`;
  } else {
    loadMoreBtn.classList.add("hidden");
  }
}

function updateHistoryMeta() {
  const latest = allDraws[0]?.drawNo ?? 0;
  const oldest = allDraws[allDraws.length - 1]?.drawNo ?? 0;
  const count = filteredDraws.length;

  if (count === allDraws.length) {
    historyMetaEl.textContent = `${oldest}회 ~ ${latest}회 · 총 ${count}회차`;
  } else {
    historyMetaEl.textContent = `검색 결과 ${count}건 (${oldest}회 ~ ${latest}회 중)`;
  }
}

function applyHistoryFilters() {
  const drawQuery = drawSearchEl.value.trim();
  const numberQuery = numberFilterEl.value.trim();

  filteredDraws = allDraws.filter((draw) => {
    if (drawQuery && !String(draw.drawNo).includes(drawQuery)) {
      return false;
    }

    if (numberQuery) {
      const num = Number(numberQuery);
      if (num < MIN || num > MAX) return false;
      const allNumbers = [...draw.main, draw.bonus];
      if (!allNumbers.includes(num)) return false;
    }

    return true;
  });

  visibleCount = HISTORY_PAGE_SIZE;
  updateHistoryMeta();
  renderHistoryList();
}

async function loadHistoryData() {
  try {
    const { default: rawData } = await import("./lotto-data.js");
    allDraws = rawData
      .map(normalizeDraw)
      .sort((a, b) => b.drawNo - a.drawNo);

    filteredDraws = allDraws;
    updateHistoryMeta();
    renderHistoryList();
  } catch {
    historyMetaEl.textContent = "역대 당첨번호를 불러오지 못했습니다.";
    historyListEl.innerHTML = "";
  }
}

function updateSetCountDisplay() {
  setCountEl.textContent = String(setCount);
  decreaseBtn.disabled = setCount <= MIN_SETS;
  increaseBtn.disabled = setCount >= MAX_SETS;
}

decreaseBtn.addEventListener("click", () => {
  if (setCount > MIN_SETS) {
    setCount--;
    updateSetCountDisplay();
  }
});

increaseBtn.addEventListener("click", () => {
  if (setCount < MAX_SETS) {
    setCount++;
    updateSetCountDisplay();
  }
});

drawBtn.addEventListener("click", async () => {
  if (isDrawing) return;
  isDrawing = true;
  drawBtn.disabled = true;

  const sets = [];
  for (let i = 0; i < setCount; i++) {
    sets.push(drawOneSet());
  }

  resultsEl.innerHTML = "";
  renderResults(sets);

  await new Promise((r) => setTimeout(r, 500));

  isDrawing = false;
  drawBtn.disabled = false;
});

drawSearchEl.addEventListener("input", applyHistoryFilters);
numberFilterEl.addEventListener("input", applyHistoryFilters);
loadMoreBtn.addEventListener("click", () => {
  visibleCount += HISTORY_PAGE_SIZE;
  renderHistoryList();
});

updateSetCountDisplay();
loadHistoryData();
