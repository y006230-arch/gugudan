const STORAGE_KEY = "gugudan-records";
const DANS = [2, 3, 4, 5, 6, 7, 8, 9];

const STATUS = {
  untouched: { label: "미도전", class: "untouched" },
  learning: { label: "배우는중", class: "learning" },
  trying: { label: "노력중", class: "trying" },
  retry: { label: "다시 도전", class: "retry" },
  perfect: { label: "완벽해", class: "perfect" },
};

let records = loadRecords();
let selectedDans = new Set();
let gameQuestions = [];
let currentIndex = 0;
let answered = false;
let recordFilter = "all";

const danButtons = document.getElementById("danButtons");
const startBtn = document.getElementById("startBtn");
const gameArea = document.getElementById("gameArea");
const questionEl = document.getElementById("question");
const answerForm = document.getElementById("answerForm");
const answerInput = document.getElementById("answerInput");
const feedbackEl = document.getElementById("feedback");
const progressText = document.getElementById("progressText");
const danLabel = document.getElementById("danLabel");
const nextBtn = document.getElementById("nextBtn");
const restartBtn = document.getElementById("restartBtn");
const recordBoard = document.getElementById("recordBoard");
const recordDanFilter = document.getElementById("recordDanFilter");

function factKey(dan, num) {
  return `${dan}x${num}`;
}

function loadRecords() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function getRecord(dan, num) {
  const key = factKey(dan, num);
  if (!records[key]) {
    records[key] = { wrongCount: 0, perfect: false };
  }
  return records[key];
}

function getStatus(dan, num) {
  const rec = getRecord(dan, num);
  if (rec.perfect) return STATUS.perfect;
  if (rec.wrongCount >= 3) return STATUS.retry;
  if (rec.wrongCount === 2) return STATUS.trying;
  if (rec.wrongCount === 1) return STATUS.learning;
  return STATUS.untouched;
}

function markCorrect(dan, num) {
  const rec = getRecord(dan, num);
  rec.perfect = true;
  rec.wrongCount = 0;
  saveRecords();
}

function markWrong(dan, num) {
  const rec = getRecord(dan, num);
  rec.perfect = false;
  rec.wrongCount = Math.min(rec.wrongCount + 1, 3);
  saveRecords();
}

function initDanButtons() {
  danButtons.innerHTML = "";
  DANS.forEach((dan) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "dan-btn";
    btn.textContent = `${dan}단`;
    btn.dataset.dan = dan;
    btn.addEventListener("click", () => toggleDan(dan, btn));
    danButtons.appendChild(btn);
  });
}

function toggleDan(dan, btn) {
  if (selectedDans.has(dan)) {
    selectedDans.delete(dan);
    btn.classList.remove("selected");
  } else {
    selectedDans.add(dan);
    btn.classList.add("selected");
  }
  startBtn.disabled = selectedDans.size === 0;
}

function buildQuestions() {
  const questions = [];
  [...selectedDans].sort((a, b) => a - b).forEach((dan) => {
    for (let num = 1; num <= 9; num++) {
      questions.push({ dan, num, answer: dan * num });
    }
  });
  return shuffle(questions);
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function startGame() {
  gameQuestions = buildQuestions();
  currentIndex = 0;
  answered = false;
  gameArea.classList.remove("hidden");
  startBtn.classList.add("hidden");
  restartBtn.classList.add("hidden");
  nextBtn.classList.add("hidden");
  feedbackEl.textContent = "";
  feedbackEl.className = "feedback";
  danLabel.textContent = [...selectedDans].sort((a, b) => a - b).map((d) => `${d}단`).join(", ");
  showQuestion();
}

function showQuestion() {
  const q = gameQuestions[currentIndex];
  questionEl.textContent = `${q.dan} × ${q.num} = ?`;
  progressText.textContent = `${currentIndex + 1} / ${gameQuestions.length}`;
  answerInput.value = "";
  answerInput.disabled = false;
  answerInput.focus();
  answered = false;
  nextBtn.classList.add("hidden");
  feedbackEl.textContent = "";
  feedbackEl.className = "feedback";
}

function handleAnswer(e) {
  e.preventDefault();
  if (answered) return;

  const q = gameQuestions[currentIndex];
  const userAnswer = parseInt(answerInput.value, 10);

  if (isNaN(userAnswer)) {
    feedbackEl.textContent = "숫자를 입력해 주세요!";
    feedbackEl.className = "feedback wrong";
    return;
  }

  answered = true;
  answerInput.disabled = true;

  if (userAnswer === q.answer) {
    markCorrect(q.dan, q.num);
    feedbackEl.textContent = `정답! 🎉 (${getStatus(q.dan, q.num).label})`;
    feedbackEl.className = "feedback correct";
  } else {
    markWrong(q.dan, q.num);
    const status = getStatus(q.dan, q.num);
    feedbackEl.textContent = `틀렸어요. 정답은 ${q.answer} (${status.label})`;
    feedbackEl.className = "feedback wrong";
  }

  if (currentIndex < gameQuestions.length - 1) {
    nextBtn.classList.remove("hidden");
  } else {
    feedbackEl.textContent += " — 모든 문제를 풀었어요!";
    restartBtn.classList.remove("hidden");
  }
}

function nextQuestion() {
  currentIndex++;
  showQuestion();
}

function restartGame() {
  startBtn.classList.remove("hidden");
  gameArea.classList.add("hidden");
  restartBtn.classList.add("hidden");
  nextBtn.classList.add("hidden");
}

function initTabs() {
  const tabs = document.querySelectorAll(".tab");
  const panels = {
    game: document.getElementById("gamePanel"),
    record: document.getElementById("recordPanel"),
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;
      tabs.forEach((t) => {
        t.classList.toggle("active", t === tab);
        t.setAttribute("aria-selected", t === tab ? "true" : "false");
      });
      Object.entries(panels).forEach(([key, panel]) => {
        const isActive = key === target;
        panel.classList.toggle("active", isActive);
        panel.hidden = !isActive;
      });
      if (target === "record") renderRecordBoard();
    });
  });
}

function initRecordFilter() {
  recordDanFilter.innerHTML = "";

  const allBtn = document.createElement("button");
  allBtn.type = "button";
  allBtn.className = "filter-btn active";
  allBtn.textContent = "전체";
  allBtn.addEventListener("click", () => setRecordFilter("all", allBtn));
  recordDanFilter.appendChild(allBtn);

  DANS.forEach((dan) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "filter-btn";
    btn.textContent = `${dan}단`;
    btn.addEventListener("click", () => setRecordFilter(dan, btn));
    recordDanFilter.appendChild(btn);
  });
}

function setRecordFilter(filter, clickedBtn) {
  recordFilter = filter;
  recordDanFilter.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.classList.toggle("active", btn === clickedBtn);
  });
  renderRecordBoard();
}

function renderRecordBoard() {
  recordBoard.innerHTML = "";
  const dansToShow = recordFilter === "all" ? DANS : [recordFilter];

  dansToShow.forEach((dan) => {
    const section = document.createElement("div");
    section.className = "dan-section";

    const title = document.createElement("h3");
    title.className = "dan-section-title";
    title.textContent = `${dan}단`;
    section.appendChild(title);

    const grid = document.createElement("div");
    grid.className = "record-grid";

    for (let num = 1; num <= 9; num++) {
      const status = getStatus(dan, num);
      const cell = document.createElement("div");
      cell.className = `record-cell ${status.class}`;
      cell.innerHTML = `
        <span class="fact">${dan} × ${num} = ${dan * num}</span>
        <span class="status-label">${status.label}</span>
      `;
      grid.appendChild(cell);
    }

    section.appendChild(grid);
    recordBoard.appendChild(section);
  });
}

startBtn.addEventListener("click", startGame);
answerForm.addEventListener("submit", handleAnswer);
nextBtn.addEventListener("click", nextQuestion);
restartBtn.addEventListener("click", restartGame);

initDanButtons();
initTabs();
initRecordFilter();
renderRecordBoard();
