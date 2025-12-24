// ===== js/test.js =====

// Где хранятся тесты (созданы в index)
const TESTS_KEY = "believe_or_not_tests_v2";
const ACTIVE_TEST_ID_KEY = "believe_or_not_active_test_id_v2";
function getJsonUrlFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const json = params.get("json");
  return json ? json.trim() : null;
}

async function loadTestFromJsonUrl(jsonPath) {
  // jsonPath будет вроде "tests/mytest.json"
  const res = await fetch(jsonPath, { cache: "no-store" });
  if (!res.ok) throw new Error("Не удалось загрузить JSON: " + res.status);

  const data = await res.json();

  // поддержка двух форматов:
  // 1) файл = { name, items, settings }
  // 2) файл = { type, createdAt, items } + name отдельно отсутствует
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
let testData = null;     // активный тест
let questions = [];      // вопросы для прохождения (учитывает режим "только ошибки")
let originalQuestions = []; // полный список (порядок преподавателя)
let currentIndex = 0;
let score = 0;
let answered = false;

// сюда записываем ответы ученика
// { questionId, questionNumber, type, text, userAnswer, correctAnswer, isCorrect }
let results = [];

let onlyWrongMode = false; // если идём только ошибки

// --------------------
// Utils
// --------------------
function safeText(v) {
  return (v === undefined || v === null) ? "" : String(v);
}

function shortDate(date = new Date()) {
  // Формат: 24.12.2025
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function normalize(str) {
  return String(str || "").trim().toLowerCase();
}

function shuffleArray(arr) {
  // Fisher-Yates
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ✅ Ждём следующий кадр (чтобы DOM успел отрисоваться)
function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

// --------------------
// Load test from storage
// --------------------
function loadActiveTest() {
  try {
    const tests = JSON.parse(localStorage.getItem(TESTS_KEY) || "[]");
    const activeId = localStorage.getItem(ACTIVE_TEST_ID_KEY);
    if (!tests.length) return null;

    // если activeId нет — берём первый тест
    const test = tests.find(t => t.id === activeId) || tests[0];
    return test;
  } catch {
    return null;
  }
}

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
          <b>${jsonPath}</b><br><br>
          ${e}
        </div>
        <div style="margin-top:12px;">
          <a class="channel-btn" href="https://t.me/tutor_Natalya" target="_blank">✨ Мой канал</a>
        </div>
      `;
      return;
    }
  } else {
    // обычный режим: тест из localStorage
    testData = loadActiveTest();
  }


// --------------------
// Start / Restart
// --------------------
function startTest() {
  // reset state
  currentIndex = 0;
  score = 0;
  answered = false;
  results = [];

  // какие вопросы берём
  if (onlyWrongMode) {
    // берём вопросы из прошлой попытки
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
  }

  // перемешивание — только если преподаватель включил
  const shuffleEnabled = !!testData.settings?.shuffleEnabled;
  if (shuffleEnabled) {
    questions = shuffleArray(questions);
  }

  // UI: показать тест
  startScreen.style.display = "none";
  resultScreen.style.display = "none";
  testScreen.style.display = "block";

  renderQuestion();
}

// хранение ошибок последней попытки в sessionStorage
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
// Render question
// --------------------
function renderQuestion() {
  const q = questions[currentIndex];

  questionEl.textContent = safeText(q.text);
  categoryEl.textContent = q.category ? "Категория: " + q.category : "";

  feedbackEl.textContent = "";
  feedbackEl.className = "feedback";

  btnNext.style.display = "none";
  answered = false;

  // explanations hidden by default
  explanationBoxEl.style.display = "none";
  explanationTextEl.textContent = "";
  explanationImageEl.style.display = "none";
  explanationImageEl.src = "";

  // картинка к вопросу
  if (q.imageUrl) {
    questionImageEl.src = q.imageUrl;
    questionImageEl.style.display = "block";
    questionImageEl.onerror = () => {
      questionImageEl.style.display = "none";
    };
  } else {
    questionImageEl.src = "";
    questionImageEl.style.display = "none";
  }

  // answers area
  answersAreaEl.innerHTML = "";

  // прогресс
  progressEl.textContent = `Вопрос ${currentIndex + 1} из ${questions.length}`;

  // отрисовать варианты
  if (!q.type || q.type === "true_false") {
    renderTrueFalse(q);
  } else if (q.type === "multiple_choice") {
    renderMultipleChoice(q);
  } else if (q.type === "open_answer") {
    renderOpenAnswer(q);
  } else {
    renderTrueFalse(q);
  }

  btnNext.onclick = () => nextQuestion();
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

    btn.addEventListener("click", () => {
      handleAnswer(q, idx);
    });

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

  submit.addEventListener("click", () => {
    handleAnswer(q, input.value);
  });

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
// Handle answer
// --------------------
function handleAnswer(q, userAnswer) {
  if (answered) return;
  answered = true;

  let isCorrect = false;
  let correctAnswerReadable = "";
  let userAnswerReadable = "";

  if (!q.type || q.type === "true_false") {
    const correct = !!q.correct;
    isCorrect = (userAnswer === correct);
    correctAnswerReadable = correct ? "✅ Верю" : "❌ Не верю";
    userAnswerReadable = userAnswer ? "✅ Верю" : "❌ Не верю";
  } else if (q.type === "multiple_choice") {
    const correctIndex = Number(q.correctIndex || 0);
    isCorrect = (Number(userAnswer) === correctIndex);

    const options = Array.isArray(q.options) ? q.options : [];
    correctAnswerReadable = safeText(options[correctIndex] ?? "");
    userAnswerReadable = safeText(options[Number(userAnswer)] ?? "");
  } else if (q.type === "open_answer") {
    const correctText = safeText(q.correctText);
    isCorrect = normalize(userAnswer) === normalize(correctText);

    correctAnswerReadable = correctText;
    userAnswerReadable = safeText(userAnswer);
  }

  if (isCorrect) {
    score++;
    feedbackEl.textContent = "Верно!";
    feedbackEl.className = "feedback correct";
  } else {
    feedbackEl.textContent = "Неверно.";
    feedbackEl.className = "feedback incorrect";

    const hasText = !!(q.explanation && q.explanation.trim());
    const hasImage = !!(q.explanationImageUrl && q.explanationImageUrl.trim());

    if (hasText || hasImage) {
      explanationBoxEl.style.display = "block";

      if (hasText) explanationTextEl.textContent = q.explanation;
      else explanationTextEl.textContent = "";

      if (hasImage) {
        explanationImageEl.src = q.explanationImageUrl;
        explanationImageEl.style.display = "block";
        explanationImageEl.onerror = () => explanationImageEl.style.display = "none";
      } else {
        explanationImageEl.style.display = "none";
        explanationImageEl.src = "";
      }
    }
  }

  const originalIndex = originalQuestions.findIndex(x => x.id === q.id);
  const questionNumber = originalIndex >= 0 ? (originalIndex + 1) : (currentIndex + 1);

  results.push({
    questionId: q.id,
    questionNumber,
    type: q.type || "true_false",
    text: safeText(q.text),
    userAnswer: userAnswerReadable,
    correctAnswer: correctAnswerReadable,
    isCorrect
  });

  if (q.type === "multiple_choice") {
    const buttons = answersAreaEl.querySelectorAll("button.option-btn");
    buttons.forEach((b, idx) => {
      if (idx === Number(userAnswer)) b.classList.add("selected");
      b.disabled = true;
    });
  }

  if (!q.type || q.type === "true_false") {
    const btns = answersAreaEl.querySelectorAll("button");
    btns.forEach(b => b.disabled = true);
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
          <b>Ответ ученика:</b> ${escapeHTML(err.userAnswer)}
        </div>

        <div class="error-line">
          <b>Правильный ответ:</b> ${escapeHTML(err.correctAnswer)}
        </div>
      `;

      errorsListEl.appendChild(card);
    });
}

function escapeHTML(str) {
  return safeText(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// --------------------
// PNG Export
// --------------------
async function downloadResultPNG() {
  const testName = testData?.name || "Тест";
  const dateStr = shortDate(new Date());

  const total = questions.length;
  const percent = total ? Math.round((score / total) * 100) : 0;

  const wrong = results
    .filter(r => !r.isCorrect)
    .sort((a, b) => a.questionNumber - b.questionNumber);

  // собираем HTML для PNG
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

          <div style="margin-top:10px;font-size:13px;color:#6b7280;line-height:1.35;">
            Учителю можно сохранить этот файл как отчёт.
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
                    <b>Ответ ученика:</b> ${escapeHTML(err.userAnswer)}
                  </div>

                  <div style="margin-top:6px;font-size:14px;">
                    <b>Правильный ответ:</b> ${escapeHTML(err.correctAnswer)}
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

  // показываем блок
  pngRenderEl.style.display = "block";

  // ждём отрисовку
  await nextFrame();
  await nextFrame();

  // рисуем круг в PNG canvas
  const canvas = pngRenderEl.querySelector("#pngCanvas");
  drawCircleOnCanvas(canvas, percent);

  await nextFrame();

  try {
    // ✅ html2canvas — самый стабильный способ
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

function sanitizeFileName(name) {
  return safeText(name).replace(/[^\wа-яА-Я0-9]+/g, "_").slice(0, 60) || "result";
}

async function exportElementToPng(element, fileName) {
  const width = element.offsetWidth;
  const height = element.offsetHeight;

  if (!width || !height) {
    throw new Error("Размер PNG блока равен 0. Проверь отображение элемента.");
  }

  const clone = element.cloneNode(true);

  const originalCanvases = element.querySelectorAll("canvas");
  const cloneCanvases = clone.querySelectorAll("canvas");

  originalCanvases.forEach((c, i) => {
    const data = c.toDataURL("image/png");
    const img = document.createElement("img");
    img.src = data;
    img.style.width = c.width + "px";
    img.style.height = c.height + "px";
    if (cloneCanvases[i]) {
      cloneCanvases[i].replaceWith(img);
    }
  });

  const serializer = new XMLSerializer();
  const html = serializer.serializeToString(clone);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;">
          ${html}
        </div>
      </foreignObject>
    </svg>
  `;

  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.crossOrigin = "anonymous";

  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = svgUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = width * 2;
  canvas.height = height * 2;

  const ctx = canvas.getContext("2d");
  ctx.scale(2, 2);
  ctx.drawImage(img, 0, 0);

  URL.revokeObjectURL(svgUrl);

  const pngUrl = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = pngUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// --------------------
// RUN
// --------------------
init();
