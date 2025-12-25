// ===== test.js (fixed) =====

// Где хранятся тесты (созданы в index)
const TESTS_KEY = "believe_or_not_tests_v2";
const ACTIVE_TEST_ID_KEY = "believe_or_not_active_test_id_v2";

// --------------------
// URL JSON
// --------------------
function getJsonUrlFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const json = params.get("json");
  return json ? json.trim() : null;
}

async function loadTestFromJsonUrl(jsonPath) {
  const res = await fetch(jsonPath, { cache: "no-store" });
  if (!res.ok) throw new Error("Не удалось загрузить JSON: " + res.status);

  const data = await res.json();

  // поддержка форматов:
  // - { name, items, settings }
  // - { type, createdAt, items }
  // - [ ...items ]
  if (Array.isArray(data)) {
    return {
      id: "external_json_" + Date.now(),
      name: "Тест",
      items: data,
      settings: { shuffleEnabled: false }
    };
  }

  return {
    id: "external_json_" + Date.now(),
    name: data.name || data.testName || "Тест",
    items: data.items || [],
    settings: data.settings || { shuffleEnabled: false }
  };
}

// --------------------
// DOM
// --------------------
const cardEl = document.getElementById("card");

const startScreen = document.getElementById("startScreen");
const testScreen = document.getElementById("testScreen");
const resultScreen = document.getElementById("resultScreen");

const testTitleStart = document.getElementById("testTitleStart");
const testTitleTop = document.getElementById("testTitleTop");
const testTitleResult = document.getElementById("testTitleResult");

const startSubtitle = document.getElementById("startSubtitle");
const startBtn = document.getElementById("startBtn");

const categoryEl = document.getElementById("category");
const questionEl = document.getElementById("question");
const questionImageEl = document.getElementById("questionImage");

const answersAreaEl = document.getElementById("answersArea");
const btnNext = document.getElementById("btnNext");

const feedbackEl = document.getElementById("feedback");
const progressEl = document.getElementById("progress");

const explanationBoxEl = document.getElementById("explanationBox");
const explanationTextEl = document.getElementById("explanationText");
const explanationImageEl = document.getElementById("explanationImage");

const scoreBigEl = document.getElementById("scoreBig");
const percentTextEl = document.getElementById("percentText");
const resultMetaEl = document.getElementById("resultMeta");
const errorsListEl = document.getElementById("errorsList");

const restartBtn = document.getElementById("restartBtn");
const retryWrongBtn = document.getElementById("retryWrongBtn");
const downloadPngBtn = document.getElementById("downloadPngBtn");

const scoreCanvas = document.getElementById("scoreCanvas");
const pngRenderEl = document.getElementById("pngRender");

// --------------------
// State
// --------------------
let testData = null;
let questions = [];
let originalQuestions = [];

let currentIndex = 0;
let score = 0;
let answered = false;

let results = [];
let onlyWrongMode = false;

// --------------------
// Utils
// --------------------
function safeText(v) {
  return (v === undefined || v === null) ? "" : String(v);
}

function normalize(str) {
  return String(str || "").trim().toLowerCase();
}

function shortDate(date = new Date()) {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

function escapeHTML(str) {
  return safeText(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function sanitizeFileName(name) {
  return safeText(name).replace(/[^\wа-яА-Я0-9]+/g, "_").slice(0, 60) || "result";
}

// --------------------
// LocalStorage load
// --------------------
function loadActiveTest() {
  try {
    const tests = JSON.parse(localStorage.getItem(TESTS_KEY) || "[]");
    const activeId = localStorage.getItem(ACTIVE_TEST_ID_KEY);
    if (!tests.length) return null;

    return tests.find(t => t.id === activeId) || tests[0];
  } catch {
    return null;
  }
}

// --------------------
// Wrong mode storage (sessionStorage)
// --------------------
function saveLastWrongQuestionIds(ids) {
  sessionStorage.setItem("believe_or_not_last_wrong_ids_v1", JSON.stringify(ids || []));
}
function getLastWrongQuestionIds() {
  try {
    return JSON.parse(sessionStorage.getItem("believe_or_not_last_wrong_ids_v1") || "[]");
  } catch {
    return [];
  }
}

// --------------------
// Init (FIXED)
// --------------------
async function init() {
  const jsonPath = getJsonUrlFromQuery();

  if (jsonPath) {
    try {
      testData = await loadTestFromJsonUrl(jsonPath);
    } catch (e) {
      cardEl.innerHTML = `
        <div style="font-size:18px;font-weight:900;margin-bottom:6px;">Ошибка загрузки теста</div>
        <div style="font-size:13px;color:#6b7280;line-height:1.4;">
          Не удалось загрузить тест по ссылке:<br>
          <b>${escapeHTML(jsonPath)}</b><br><br>
          ${escapeHTML(e?.message || e)}
        </div>
        <div style="margin-top:12px;">
          <a class="channel-btn" href="https://t.me/tutor_Natalya" target="_blank">✨ Мой канал</a>
        </div>
      `;
      return;
    }
  } else {
    testData = loadActiveTest();
  }

  if (!testData || !Array.isArray(testData.items) || !testData.items.length) {
    cardEl.innerHTML = `
      <div style="font-size:18px;font-weight:900;margin-bottom:6px;">В тесте нет вопросов</div>
      <div style="font-size:13px;color:#6b7280;line-height:1.4;">
        Проверь JSON или создай тест в конструкторе.
      </div>
      <div style="margin-top:12px;">
        <a class="channel-btn" href="https://t.me/tutor_Natalya" target="_blank">✨ Мой канал</a>
      </div>
    `;
    return;
  }

  // ✅ заполняем список вопросов
  originalQuestions = testData.items.slice();

  // заголовки
  const testName = testData.name || "Тест";
  testTitleStart.textContent = testName;
  testTitleTop.textContent = testName;
  testTitleResult.textContent = "Результат";

  // подпись про перемешивание
  const shuffleEnabled = !!testData.settings?.shuffleEnabled;
  startSubtitle.textContent = shuffleEnabled ? "Вопросы будут перемешаны перед началом теста." : "";

  // события
  startBtn.addEventListener("click", startTest);
  btnNext.addEventListener("click", nextQuestion);

  restartBtn.addEventListener("click", () => {
    onlyWrongMode = false;
    startTest();
  });

  retryWrongBtn.addEventListener("click", () => {
    onlyWrongMode = true;
    startTest();
  });

  downloadPngBtn.addEventListener("click", downloadResultPNG);
}

// --------------------
// Start / Restart
// --------------------
function startTest() {
  currentIndex = 0;
  score = 0;
  answered = false;
  results = [];

  if (onlyWrongMode) {
    const wrongIds = getLastWrongQuestionIds();
    const set = new Set(wrongIds);

    const wrongQuestions = originalQuestions.filter(q => set.has(q.id));
    if (!wrongQuestions.length) {
      alert("✅ Ошибок нет! Нечего проходить повторно 🙂");
      onlyWrongMode = false;
      return;
    }
    questions = wrongQuestions.slice();
  } else {
    questions = originalQuestions.slice();
    const shuffleEnabled = !!testData.settings?.shuffleEnabled;
    if (shuffleEnabled) questions = shuffleArray(questions);
  }

  // UI
  startScreen.style.display = "none";
  resultScreen.style.display = "none";
  testScreen.style.display = "block";

  renderQuestion();
}

// --------------------
// Render question
// --------------------
function renderQuestion() {
  const q = questions[currentIndex];

  // текст
  questionEl.textContent = safeText(q.text);
  categoryEl.textContent = q.category ? "Категория: " + q.category : "";

  // reset
  feedbackEl.textContent = "";
  feedbackEl.className = "feedback";
  btnNext.style.display = "none";
  answered = false;

  explanationBoxEl.style.display = "none";
  explanationTextEl.textContent = "";
  explanationImageEl.style.display = "none";
  explanationImageEl.src = "";

  // image
  if (q.imageUrl) {
    questionImageEl.src = q.imageUrl;
    questionImageEl.style.display = "block";
    questionImageEl.onerror = () => (questionImageEl.style.display = "none");
  } else {
    questionImageEl.src = "";
    questionImageEl.style.display = "none";
  }

  // progress (важно: общий номер по порядку преподавателя)
  const num = getQuestionNumber(q);
  progressEl.textContent = `Вопрос ${num} из ${originalQuestions.length}`;

  // answers
  answersAreaEl.innerHTML = "";

  if (!q.type || q.type === "true_false") {
    renderTrueFalse(q);
  } else if (q.type === "multiple_choice") {
    renderMultipleChoice(q);
  } else if (q.type === "open_answer") {
    renderOpenAnswer(q);
  } else {
    renderTrueFalse(q);
  }
}

function getQuestionNumber(q) {
  const idx = originalQuestions.findIndex(x => x.id === q.id);
  return idx >= 0 ? idx + 1 : currentIndex + 1;
}

// --------------------
// Render: True/False
// --------------------
function renderTrueFalse(q) {
  const btnTrue = document.createElement("button");
  btnTrue.className = "answer-btn true-btn";
  btnTrue.textContent = "✅ Верю";
  btnTrue.addEventListener("click", () => handleAnswer(q, true));

  const btnFalse = document.createElement("button");
  btnFalse.className = "answer-btn false-btn";
  btnFalse.textContent = "❌ Не верю";
  btnFalse.addEventListener("click", () => handleAnswer(q, false));

  answersAreaEl.appendChild(btnTrue);
  answersAreaEl.appendChild(btnFalse);
}

// --------------------
// Render: Multiple Choice
// --------------------
function renderMultipleChoice(q) {
  const options = Array.isArray(q.options) ? q.options : [];
  if (!options.length) {
    const warn = document.createElement("div");
    warn.style.color = "#b91c1c";
    warn.style.fontWeight = "800";
    warn.textContent = "⚠️ У этого вопроса нет вариантов.";
    answersAreaEl.appendChild(warn);
    return;
  }

  options.forEach((opt, idx) => {
    const btn = document.createElement("button");
    btn.className = "answer-btn option-btn";
    btn.textContent = safeText(opt);
    btn.addEventListener("click", () => handleAnswer(q, idx));
    answersAreaEl.appendChild(btn);
  });
}

// --------------------
// Render: Open Answer
// --------------------
function renderOpenAnswer(q) {
  const input = document.createElement("input");
  input.className = "input-open";
  input.placeholder = "Введи ответ…";
  input.autocomplete = "off";

  const submit = document.createElement("button");
  submit.className = "submit-open-btn";
  submit.textContent = "✅ Ответить";

  submit.addEventListener("click", () => handleAnswer(q, input.value));

  answersAreaEl.appendChild(input);
  answersAreaEl.appendChild(submit);

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit.click();
    }
  });
}

// --------------------
// Handle answer (FIXED correctness)
// --------------------
function handleAnswer(q, userAnswer) {
  if (answered) return;
  answered = true;

  let isCorrect = false;
  let correctAnswerReadable = "";
  let userAnswerReadable = "";

  // ✅ TRUE / FALSE (корректно по q.correct)
  if (!q.type || q.type === "true_false") {
    const correct = !!q.correct;
    isCorrect = (userAnswer === correct);

    correctAnswerReadable = correct ? "✅ Верю" : "❌ Не верю";
    userAnswerReadable = userAnswer ? "✅ Верю" : "❌ Не верю";
  }

  // ✅ MULTIPLE CHOICE (поддержка correctIndex И correctText)
  else if (q.type === "multiple_choice") {
    const options = Array.isArray(q.options) ? q.options : [];

    // если есть correctIndex — используем его
    if (q.correctIndex !== undefined && q.correctIndex !== null && q.correctIndex !== "") {
      const correctIndex = Number(q.correctIndex);
      isCorrect = (Number(userAnswer) === correctIndex);
      correctAnswerReadable = safeText(options[correctIndex] ?? "");
      userAnswerReadable = safeText(options[Number(userAnswer)] ?? "");
    }
    // иначе используем correctText (это твой старый формат)
    else {
      const correctText = safeText(q.correctText);
      userAnswerReadable = safeText(options[Number(userAnswer)] ?? "");
      correctAnswerReadable = correctText;
      isCorrect = normalize(userAnswerReadable) === normalize(correctText);
    }
  }

  // ✅ OPEN ANSWER
  else if (q.type === "open_answer") {
    const correctText = safeText(q.correctText);
    userAnswerReadable = safeText(userAnswer);
    correctAnswerReadable = correctText;

    // режим проверки: exact / contains
    const mode = q.checkMode || "exact";
    if (mode === "contains") {
      isCorrect = normalize(userAnswerReadable).includes(normalize(correctText));
    } else {
      isCorrect = normalize(userAnswerReadable) === normalize(correctText);
    }
  }

  if (isCorrect) {
    score++;
    feedbackEl.textContent = "Верно!";
    feedbackEl.className = "feedback correct";
  } else {
    feedbackEl.textContent = "Неверно.";
    feedbackEl.className = "feedback incorrect";

    // ✅ пояснение только при ошибке
    const hasText = !!(q.explanation && q.explanation.trim());
    const hasImage = !!(q.explanationImageUrl && q.explanationImageUrl.trim());

    if (hasText || hasImage) {
      explanationBoxEl.style.display = "block";
      explanationTextEl.textContent = hasText ? q.explanation : "";

      if (hasImage) {
        explanationImageEl.src = q.explanationImageUrl;
        explanationImageEl.style.display = "block";
        explanationImageEl.onerror = () => (explanationImageEl.style.display = "none");
      } else {
        explanationImageEl.style.display = "none";
        explanationImageEl.src = "";
      }
    }
  }

  // Номер по порядку преподавателя
  const questionNumber = getQuestionNumber(q);

  results.push({
    questionId: q.id,
    questionNumber,
    type: q.type || "true_false",
    text: safeText(q.text),
    userAnswer: userAnswerReadable,
    correctAnswer: correctAnswerReadable,
    isCorrect
  });

  // UI disable
  if (q.type === "multiple_choice") {
    const buttons = answersAreaEl.querySelectorAll("button.option-btn");
    buttons.forEach((b, idx) => {
      if (idx === Number(userAnswer)) b.classList.add("selected");
      b.disabled = true;
    });
  } else {
    const btns = answersAreaEl.querySelectorAll("button");
    btns.forEach(b => (b.disabled = true));
  }

  if (q.type === "open_answer") {
    const input = answersAreaEl.querySelector("input");
    const submit = answersAreaEl.querySelector("button");
    if (input) input.disabled = true;
    if (submit) submit.disabled = true;
  }

  btnNext.style.display = "inline-flex";
}

// --------------------
// Next
// --------------------
function nextQuestion() {
  if (!answered) return;

  currentIndex++;
  if (currentIndex >= questions.length) {
    showResults();
  } else {
    renderQuestion();
  }
}

// --------------------
// Results screen
// --------------------
function showResults() {
  testScreen.style.display = "none";
  startScreen.style.display = "none";
  resultScreen.style.display = "block";

  const total = questions.length;
  const percent = total ? Math.round((score / total) * 100) : 0;

  scoreBigEl.textContent = `Твой результат: ${score} из ${total}`;
  percentTextEl.textContent = `${percent}%`;

  const testName = testData?.name || "Тест";
  resultMetaEl.textContent = `${testName} • ${shortDate(new Date())}`;

  drawCircle(percent);

  const wrong = results.filter(r => !r.isCorrect);
  saveLastWrongQuestionIds(wrong.map(x => x.questionId));

  retryWrongBtn.style.display = wrong.length ? "inline-flex" : "none";
  renderErrors(wrong);
}

function drawCircle(percent) {
  const ctx = scoreCanvas.getContext("2d");
  const w = scoreCanvas.width;
  const h = scoreCanvas.height;

  ctx.clearRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h / 2;
  const r = 74;

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 14;
  ctx.stroke();

  const start = -Math.PI / 2;
  const end = start + (Math.PI * 2 * (percent / 100));
  ctx.beginPath();
  ctx.arc(cx, cy, r, start, end);
  ctx.strokeStyle = "#4b6bfb";
  ctx.lineWidth = 14;
  ctx.lineCap = "round";
  ctx.stroke();
}

function renderErrors(wrong) {
  errorsListEl.innerHTML = "";

  if (!wrong.length) {
    errorsListEl.innerHTML = `
      <div style="padding:12px;border-radius:14px;border:1px solid #e5e7eb;background:#f9fafb;">
        ✅ Ошибок нет! Отличная работа 🎉
      </div>
    `;
    return;
  }

  wrong
    .sort((a, b) => a.questionNumber - b.questionNumber)
    .forEach(err => {
      const card = document.createElement("div");
      card.className = "error-card";

      card.innerHTML = `
        <div class="error-head">
          <span class="error-number">Ошибка #${err.questionNumber}</span>
        </div>

        <div class="error-qtext">${escapeHTML(err.text)}</div>

        <div class="error-line">
          <b>Ответ ученика:</b> ${escapeHTML(err.userAnswer || "—")}
        </div>

        <div class="error-line">
          <b>Правильный ответ:</b> ${escapeHTML(err.correctAnswer || "—")}
        </div>
      `;

      errorsListEl.appendChild(card);
    });
}

// --------------------
// PNG Export (html2canvas)
// --------------------
async function downloadResultPNG() {
  const testName = testData?.name || "Тест";
  const dateStr = shortDate(new Date());

  const total = questions.length;
  const percent = total ? Math.round((score / total) * 100) : 0;

  const wrong = results
    .filter(r => !r.isCorrect)
    .sort((a, b) => a.questionNumber - b.questionNumber);

  pngRenderEl.innerHTML = `
    <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
        <div style="font-size:24px;font-weight:900;">${escapeHTML(testName)}</div>
        <div style="font-size:14px;color:#6b7280;font-weight:800;">${dateStr}</div>
      </div>

      <div style="margin-top:14px;display:grid;grid-template-columns: 260px 1fr;gap:16px;">
        <div style="border:1px solid #eef0f8;border-radius:18px;padding:14px;background:#f9fafb;">
          <div style="font-size:18px;font-weight:900;">Результат</div>
          <div style="margin-top:6px;font-size:14px;color:#6b7280;">${score} из ${total} (${percent}%)</div>

          <div style="margin-top:12px;display:flex;justify-content:center;">
            <canvas id="pngCanvas" width="220" height="220"></canvas>
          </div>
        </div>

        <div style="border:1px solid #eef0f8;border-radius:18px;padding:14px;background:#fff;">
          <div style="font-size:18px;font-weight:900;margin-bottom:10px;">Ошибки</div>
          ${
            wrong.length
              ? wrong.map(err => `
                <div style="border:1px solid #dde1eb;border-radius:16px;padding:12px;background:#f9fafb;margin-bottom:10px;">
                  <div style="font-weight:900;color:#b91c1c;background:#fee2e2;border:1px solid #fecaca;padding:3px 10px;border-radius:999px;font-size:13px;">
                    Ошибка #${err.questionNumber}
                  </div>

                  <div style="margin-top:8px;font-weight:800;font-size:14px;">
                    ${escapeHTML(err.text)}
                  </div>

                  <div style="margin-top:10px;font-size:14px;">
                    <b>Ответ ученика:</b> ${escapeHTML(err.userAnswer || "—")}
                  </div>

                  <div style="margin-top:6px;font-size:14px;">
                    <b>Правильный ответ:</b> ${escapeHTML(err.correctAnswer || "—")}
                  </div>
                </div>
              `).join("")
              : `
                <div style="border:1px solid #e5e7eb;border-radius:16px;padding:12px;background:#f9fafb;">
                  ✅ Ошибок нет! Отличная работа 🎉
                </div>
              `
          }
        </div>
      </div>
    </div>
  `;

  pngRenderEl.style.display = "block";
  await nextFrame();
  await nextFrame();

  const canvas = pngRenderEl.querySelector("#pngCanvas");
  drawCircleOnCanvas(canvas, percent);

  await nextFrame();

  try {
    const canvasResult = await html2canvas(pngRenderEl, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff"
    });

    const pngUrl = canvasResult.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = pngUrl;
    a.download = `${sanitizeFileName(testName)}_${dateStr}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

  } catch (e) {
    alert("⚠️ Не удалось скачать PNG.\n\n" + e);
  } finally {
    pngRenderEl.style.display = "none";
  }
}

function drawCircleOnCanvas(canvas, percent) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h / 2;
  const r = 84;

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 16;
  ctx.stroke();

  const start = -Math.PI / 2;
  const end = start + Math.PI * 2 * (percent / 100);

  ctx.beginPath();
  ctx.arc(cx, cy, r, start, end);
  ctx.strokeStyle = "#4b6bfb";
  ctx.lineWidth = 16;
  ctx.lineCap = "round";
  ctx.stroke();

  ctx.fillStyle = "#111827";
  ctx.font = "900 34px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${percent}%`, cx, cy - 6);

  ctx.fillStyle = "#6b7280";
  ctx.font = "700 14px system-ui";
  ctx.fillText(`правильных`, cx, cy + 24);
}

// --------------------
// RUN
// --------------------
init();
