// ===== test.js =====

// Где хранятся тесты (созданы в index)
const TESTS_KEY = "believe_or_not_tests_v2";
const ACTIVE_TEST_ID_KEY = "believe_or_not_active_test_id_v2";

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
let testData = null;        // активный тест
let questions = [];         // вопросы для прохождения (учитывает режим "только ошибки")
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

// --------------------
// Load test from URL (?json=...)
// --------------------
function getJsonParam() {
  try {
    const p = new URLSearchParams(window.location.search).get("json");
    return p ? p.trim() : "";
  } catch {
    return "";
  }
}

async function loadTestFromUrlParam() {
  const param = getJsonParam();
  if (!param) return null;

  // относительный путь (tests/xxx.json) или абсолютная ссылка
  const url = /^https?:\/\//i.test(param) ? param : encodeURI(param);

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Не удалось загрузить JSON (${res.status})`);
  }

  const data = await res.json();

  // Нормализация на случай старых форматов
  if (Array.isArray(data)) {
    return { id: "url", name: "Тест", settings: { shuffleEnabled: false }, items: data };
  }
  if (data && typeof data === "object") {
    if (Array.isArray(data.items)) return data;
    if (Array.isArray(data.questions)) {
      return { ...data, items: data.questions };
    }
  }

  throw new Error("JSON имеет неизвестный формат");
}

// --------------------
// Persistence for wrong-only mode
// --------------------
function saveLastWrongQuestionIds(ids) {
  try {
    localStorage.setItem("believe_or_not_last_wrong_ids_v2", JSON.stringify(ids || []));
  } catch { }
}

function getLastWrongQuestionIds() {
  try {
    return JSON.parse(localStorage.getItem("believe_or_not_last_wrong_ids_v2") || "[]");
  } catch {
    return [];
  }
}

// --------------------
// Init
// --------------------
async function init() {
  try {
    testData = await loadTestFromUrlParam();
    if (!testData) testData = loadActiveTest();
  } catch (e) {
    console.warn(e);
    cardEl.innerHTML = `
      <div style="font-size:18px;font-weight:900;margin-bottom:6px;">Не удалось открыть тест</div>
      <div style="font-size:13px;color:#6b7280;line-height:1.4;">
        Проверь ссылку <b>?json=...</b> и что файл доступен в репозитории.<br>
        Текст ошибки: <b>${safeText(e?.message || e)}</b>
      </div>
      <div style="margin-top:12px;">
        <a class="channel-btn" href="https://t.me/tutor_Natalya" target="_blank" rel="noopener">✨ Мой канал</a>
      </div>
    `;
    return;
  }

  if (!testData || !testData.items || !testData.items.length) {
    cardEl.innerHTML = `
      <div style="font-size:18px;font-weight:900;margin-bottom:6px;">Вопросы не найдены</div>
      <div style="font-size:13px;color:#6b7280;line-height:1.4;">
        Похоже, в выбранном тесте нет вопросов.<br>
        Открой конструктор (index.html), добавь вопросы — и затем снова зайди сюда.
      </div>
      <div style="margin-top:12px;">
        <a class="channel-btn" href="https://t.me/tutor_Natalya" target="_blank" rel="noopener">✨ Мой канал</a>
      </div>
    `;
    return;
  }

  const testName = testData.name || "Тест";
  testTitleStart.textContent = testName;
  testTitleTop.textContent = testName;
  testTitleResult.textContent = "Результат — " + testName;

  originalQuestions = testData.items.slice();

  // Подзаголовок на стартовом экране
  const shuffleEnabled = !!testData.settings?.shuffleEnabled;
  startSubtitle.textContent = shuffleEnabled
    ? "Вопросы будут перемешаны перед началом теста."
    : "";

  startBtn.addEventListener("click", startTest);

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
  // reset state
  currentIndex = 0;
  score = 0;
  answered = false;
  results = [];

  // какие вопросы берём
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

    // перемешивание — если включено
    const shuffleEnabled = !!testData.settings?.shuffleEnabled;
    if (shuffleEnabled) {
      questions = shuffleArray(questions);
    }
  }

  // show test screen
  startScreen.style.display = "none";
  resultScreen.style.display = "none";
  testScreen.style.display = "block";

  btnNext.style.display = "none";
  explanationBoxEl.style.display = "none";

  btnNext.onclick = nextQuestion;

  renderQuestion();
}

// --------------------
// Render
// --------------------
function renderQuestion() {
  const q = questions[currentIndex];

  // reset UI
  answered = false;
  btnNext.style.display = "none";

  explanationBoxEl.style.display = "none";
  feedbackEl.textContent = "";
  explanationTextEl.textContent = "";
  explanationImageEl.style.display = "none";
  explanationImageEl.src = "";

  categoryEl.textContent = q.category ? ("Категория: " + q.category) : "";
  questionEl.textContent = safeText(q.text);

  // question image
  const imgUrl = q.imageUrl || "";
  if (imgUrl) {
    questionImageEl.src = imgUrl;
    questionImageEl.style.display = "block";
    questionImageEl.onerror = () => {
      questionImageEl.style.display = "none";
      questionImageEl.src = "";
    };
  } else {
    questionImageEl.style.display = "none";
    questionImageEl.src = "";
  }

  progressEl.textContent = `Вопрос ${getQuestionNumber(q)} из ${originalQuestions.length}`;

  // answers
  answersAreaEl.innerHTML = "";

  // Поддержка: true_false / multiple_choice / open_answer
  if (q.type === "true_false") {
    renderTrueFalse(q);
    return;
  }
  if (q.type === "multiple_choice") {
    renderMultipleChoice(q);
    return;
  }
  if (q.type === "open_answer") {
    renderOpenAnswer(q);
    return;
  }

  // fallback
  answersAreaEl.innerHTML = `<div class="subtitle">Неизвестный тип вопроса: ${safeText(q.type)}</div>`;
}

function getQuestionNumber(q) {
  // номер в порядке преподавателя (оригинальный индекс)
  const idx = originalQuestions.findIndex(x => x.id === q.id);
  return idx >= 0 ? (idx + 1) : (currentIndex + 1);
}

// --------------------
// Question types
// --------------------
function renderTrueFalse(q) {
  const wrap = document.createElement("div");
  wrap.className = "buttons";

  const bTrue = document.createElement("button");
  bTrue.className = "true-btn";
  bTrue.textContent = "✅ Верю";

  const bFalse = document.createElement("button");
  bFalse.className = "false-btn";
  bFalse.textContent = "❌ Не верю";

  bTrue.onclick = () => submitAnswer(q, "Верю");
  bFalse.onclick = () => submitAnswer(q, "Не верю");

  wrap.appendChild(bTrue);
  wrap.appendChild(bFalse);
  answersAreaEl.appendChild(wrap);
}

function renderMultipleChoice(q) {
  const options = Array.isArray(q.options) ? q.options : [];

  const list = document.createElement("div");
  list.className = "mc-list";

  options.forEach((optText) => {
    const btn = document.createElement("button");
    btn.className = "mc-btn";
    btn.type = "button";
    btn.textContent = safeText(optText);

    btn.onclick = () => submitAnswer(q, safeText(optText));
    list.appendChild(btn);
  });

  // если вдруг options нет — покажем подсказку
  if (!options.length) {
    const empty = document.createElement("div");
    empty.className = "subtitle";
    empty.textContent = "У этого вопроса нет вариантов ответа.";
    answersAreaEl.appendChild(empty);
  } else {
    answersAreaEl.appendChild(list);
  }
}

function renderOpenAnswer(q) {
  const box = document.createElement("div");
  box.className = "open-box";

  const input = document.createElement("input");
  input.className = "open-input";
  input.type = "text";
  input.placeholder = "Введи ответ…";

  const btn = document.createElement("button");
  btn.className = "open-submit";
  btn.type = "button";
  btn.textContent = "✅ Ответить";

  btn.onclick = () => submitAnswer(q, input.value);

  box.appendChild(input);
  box.appendChild(btn);
  answersAreaEl.appendChild(box);

  // Enter = отправить
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      btn.click();
    }
  });
}

// --------------------
// Check + submit
// --------------------
function isAnswerCorrect(q, userAnswerText) {
  const correct = safeText(q.correctText);

  if (q.type === "open_answer") {
    // checkMode: exact / contains
    const mode = q.checkMode || "exact";
    const ua = normalize(userAnswerText);
    const ca = normalize(correct);

    if (mode === "contains") return ua.includes(ca);
    return ua === ca;
  }

  // true_false + multiple_choice
  return normalize(userAnswerText) === normalize(correct);
}

function submitAnswer(q, userAnswerText) {
  if (answered) return;
  answered = true;

  const correct = safeText(q.correctText);
  const isCorrect = isAnswerCorrect(q, userAnswerText);

  if (isCorrect) score++;

  // сохраним результат
  results.push({
    questionId: q.id,
    questionNumber: getQuestionNumber(q),
    type: q.type,
    text: safeText(q.text),
    userAnswer: safeText(userAnswerText),
    correctAnswer: correct,
    isCorrect,
  });

  // визуально подсветим (для multiple choice)
  if (q.type === "multiple_choice") {
    const btns = answersAreaEl.querySelectorAll("button.mc-btn");
    btns.forEach((b) => {
      const t = normalize(b.textContent);
      if (t === normalize(correct)) b.classList.add("mc-correct");
      if (t === normalize(userAnswerText) && !isCorrect) b.classList.add("mc-wrong");
      b.disabled = true;
    });
  }

  // для true/false — блокируем кнопки
  if (q.type === "true_false") {
    const btns = answersAreaEl.querySelectorAll("button");
    btns.forEach(b => (b.disabled = true));
  }

  // для open — тоже блокируем
  if (q.type === "open_answer") {
    const input = answersAreaEl.querySelector("input");
    const btn = answersAreaEl.querySelector("button");
    if (input) input.disabled = true;
    if (btn) btn.disabled = true;
  }

  // показываем пояснение ТОЛЬКО если ошибка
  if (!isCorrect) {
    explanationBoxEl.style.display = "block";
    feedbackEl.textContent = "Неверно.";

    if (q.explanation) {
      explanationTextEl.textContent = safeText(q.explanation);
    }

    if (q.explanationImageUrl) {
      explanationImageEl.src = q.explanationImageUrl;
      explanationImageEl.style.display = "block";
      explanationImageEl.onerror = () => {
        explanationImageEl.style.display = "none";
        explanationImageEl.src = "";
      };
    }
  } else {
    explanationBoxEl.style.display = "none";
  }

  btnNext.style.display = "inline-flex";
}

function nextQuestion() {
  if (!answered) return;

  currentIndex++;
  if (currentIndex >= questions.length) {
    showResult();
  } else {
    renderQuestion();
  }
}

// --------------------
// Result screen
// --------------------
function showResult() {
  testScreen.style.display = "none";
  resultScreen.style.display = "block";

  const total = results.length;
  const percent = total ? Math.round((score / total) * 100) : 0;

  scoreBigEl.textContent = `${score}/${total}`;
  percentTextEl.textContent = `${percent}%`;
  resultMetaEl.textContent = `Дата: ${shortDate()} • Вопросов: ${total}`;

  drawPercentCircle(percent);

  // ошибки (в порядке номеров вопросов)
  const wrong = results.filter(r => !r.isCorrect).sort((a, b) => a.questionNumber - b.questionNumber);
  saveLastWrongQuestionIds(wrong.map(r => r.questionId));

  errorsListEl.innerHTML = "";
  if (!wrong.length) {
    errorsListEl.innerHTML = `<div class="subtitle">✅ Ошибок нет — идеально!</div>`;
    return;
  }

  wrong.forEach((w) => {
    const card = document.createElement("div");
    card.className = "error-card";

    const num = document.createElement("div");
    num.className = "error-number";
    num.textContent = `№${w.questionNumber}`;

    const qtext = document.createElement("div");
    qtext.className = "error-qtext";
    qtext.textContent = w.text;

    const line1 = document.createElement("div");
    line1.className = "error-line";
    line1.innerHTML = `<b>Ответ ученика:</b> ${escapeHtml(w.userAnswer || "—")}`;

    const line2 = document.createElement("div");
    line2.className = "error-line";
    line2.innerHTML = `<b>Правильный ответ:</b> ${escapeHtml(w.correctAnswer || "—")}`;

    card.appendChild(num);
    card.appendChild(qtext);
    card.appendChild(line1);
    card.appendChild(line2);

    errorsListEl.appendChild(card);
  });
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function drawPercentCircle(percent) {
  if (!scoreCanvas) return;

  const ctx = scoreCanvas.getContext("2d");
  const w = scoreCanvas.width;
  const h = scoreCanvas.height;

  ctx.clearRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) / 2 - 10;

  // bg
  ctx.beginPath();
  ctx.lineWidth = 12;
  ctx.strokeStyle = "#eef2ff";
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  // arc
  const start = -Math.PI / 2;
  const end = start + (Math.PI * 2) * (percent / 100);

  ctx.beginPath();
  ctx.lineWidth = 12;
  ctx.strokeStyle = "#4b6bfb";
  ctx.lineCap = "round";
  ctx.arc(cx, cy, r, start, end);
  ctx.stroke();
}

// --------------------
// PNG export
// --------------------
async function downloadResultPNG() {
  try {
    const testName = safeText(testData?.name || "Тест");
    const dateStr = shortDate(new Date());
    const fileName = `${testName}_${dateStr}.png`.replaceAll(" ", "_");

    // Соберём большой информативный PNG в pngRender
    const total = results.length;
    const percent = total ? Math.round((score / total) * 100) : 0;

    const wrong = results.filter(r => !r.isCorrect).sort((a, b) => a.questionNumber - b.questionNumber);

    pngRenderEl.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:14px;">
        <div>
          <div style="font-size:22px;font-weight:900;">${escapeHtml(testName)}</div>
          <div style="font-size:13px;color:#6b7280;margin-top:4px;">
            Дата: <b>${escapeHtml(dateStr)}</b> • Вопросов: <b>${total}</b>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:24px;font-weight:900;color:#111827;">${percent}%</div>
          <div style="font-size:13px;color:#6b7280;">${score}/${total}</div>
        </div>
      </div>

      <div style="height:12px;"></div>

      <div style="font-size:16px;font-weight:900;margin-bottom:10px;">Ошибки</div>

      ${
        wrong.length
          ? wrong.map(w => `
              <div style="border:1px solid #eef0f8;border-radius:14px;padding:12px;margin-bottom:10px;">
                <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                  <span style="font-weight:900;color:#b91c1c;background:#fee2e2;border:1px solid #fecaca;padding:2px 10px;border-radius:999px;font-size:12px;">
                    №${w.questionNumber}
                  </span>
                  <span style="font-weight:900;font-size:13px;color:#111827;">${escapeHtml(w.text)}</span>
                </div>

                <div style="margin-top:8px;font-size:13px;">
                  <b>Ответ ученика:</b> ${escapeHtml(w.userAnswer || "—")}
                </div>
                <div style="margin-top:4px;font-size:13px;">
                  <b>Правильный ответ:</b> ${escapeHtml(w.correctAnswer || "—")}
                </div>
              </div>
            `).join("")
          : `<div style="font-size:13px;color:#15803d;font-weight:800;">✅ Ошибок нет — идеально!</div>`
      }

      <div style="margin-top:10px;font-size:12px;color:#6b7280;">
        Сгенерировано в “Верю / Не верю”
      </div>
    `;

    // Рендерим HTML в SVG -> PNG (без canvas taint)
    const width = 980;
    const height = Math.max(420, pngRenderEl.scrollHeight + 40);

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <foreignObject x="0" y="0" width="${width}" height="${height}">
          <div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;">
            ${pngRenderEl.innerHTML}
          </div>
        </foreignObject>
      </svg>
    `.trim();

    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(blob);

    const img = new Image();
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

  } catch (e) {
    console.warn(e);
    alert("⚠️ Не удалось скачать PNG. Попробуй ещё раз.");
  }
}

// --------------------
// RUN
// --------------------
init();
