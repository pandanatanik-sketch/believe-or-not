// ====== index.js ======

const TESTS_KEY = "believe_or_not_tests_v2";
const ACTIVE_TEST_ID_KEY = "believe_or_not_active_test_id_v2";

let tests = [];
let activeTestId = null;

// Form state
let tfCorrect = true;
let mcOptions = [];
let mcCorrectIndex = 0;

// Editing
let editingQuestionId = null;
let editState = null;

// DOM
const testsListEl = document.getElementById("testsList");
const newTestBtn = document.getElementById("newTestBtn");

const testNameInput = document.getElementById("testNameInput");
const shuffleToggle = document.getElementById("shuffleToggle");

const qTypeEl = document.getElementById("qType");
const qCategoryEl = document.getElementById("qCategory");
const qTextEl = document.getElementById("qText");
const qExplanationEl = document.getElementById("qExplanation");

const qImageFileEl = document.getElementById("qImageFile");
const qImageFileNameEl = document.getElementById("qImageFileName");
const qImagePreviewEl = document.getElementById("qImagePreview");
const qImageUrlEl = document.getElementById("qImageUrl");

const qExpImageFileEl = document.getElementById("qExpImageFile");
const qExpImageFileNameEl = document.getElementById("qExpImageFileName");
const qExpImagePreviewEl = document.getElementById("qExpImagePreview");
const qExplanationImageUrlEl = document.getElementById("qExplanationImageUrl");

const tfBlock = document.getElementById("tfBlock");
const btnSetTrue = document.getElementById("btnSetTrue");
const btnSetFalse = document.getElementById("btnSetFalse");

const mcBlock = document.getElementById("mcBlock");
const mcListEl = document.getElementById("mcList");
const mcAddOptionBtn = document.getElementById("mcAddOptionBtn");

const openBlock = document.getElementById("openBlock");
const openCorrectTextEl = document.getElementById("openCorrectText");

const addQuestionBtn = document.getElementById("addQuestionBtn");
const clearFormBtn = document.getElementById("clearFormBtn");

const questionsListEl = document.getElementById("questionsList");
const questionsCountEl = document.getElementById("questionsCount");
const questionsCountEl2 = document.getElementById("questionsCount2");

const openTestBtn = document.getElementById("openTestBtn");
const exportBtn = document.getElementById("exportBtn");
const exportAreaEl = document.getElementById("exportArea");
const exportTextareaEl = document.getElementById("exportTextarea");
const copyJsonBtn = document.getElementById("copyJsonBtn");
const downloadJsonBtn = document.getElementById("downloadJsonBtn");
const hideExportBtn = document.getElementById("hideExportBtn");
const clearQuestionsBtn = document.getElementById("clearQuestionsBtn");

// Modal
const modalBackdrop = document.getElementById("modalBackdrop");
const modalContent = document.getElementById("modalContent");
const modalTitle = document.getElementById("modalTitle");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const modalCancelBtn = document.getElementById("modalCancelBtn");
const modalSaveBtn = document.getElementById("modalSaveBtn");

// INIT
loadTests();
ensureAtLeastOneTest();
renderTestsList();
loadActiveIntoEditor();
renderQuestions();
applyTypeUI(qTypeEl.value);
resetMcEditor();

// IMAGE PICKERS
qImageFileEl.addEventListener("change", () => {
  const file = qImageFileEl.files[0];
  if (!file) {
    qImageFileNameEl.textContent = "Файл не выбран";
    qImagePreviewEl.style.display = "none";
    qImagePreviewEl.src = "";
    return;
  }
  qImageFileNameEl.textContent = file.name;
  qImagePreviewEl.src = URL.createObjectURL(file);
  qImagePreviewEl.style.display = "block";
  qImageUrlEl.value = "images/" + file.name;
});

qExpImageFileEl.addEventListener("change", () => {
  const file = qExpImageFileEl.files[0];
  if (!file) {
    qExpImageFileNameEl.textContent = "Файл не выбран";
    qExpImagePreviewEl.style.display = "none";
    qExpImagePreviewEl.src = "";
    return;
  }
  qExpImageFileNameEl.textContent = file.name;
  qExpImagePreviewEl.src = URL.createObjectURL(file);
  qExpImagePreviewEl.style.display = "block";
  qExplanationImageUrlEl.value = "images/" + file.name;
});

// TESTS
newTestBtn.addEventListener("click", () => {
  const name = prompt("Название нового теста:", "Новый тест");
  if (!name) return;
  const t = createTest(name.trim());
  tests.unshift(t);
  setActiveTest(t.id);
  saveTests();
  renderTestsList();
  loadActiveIntoEditor();
  renderQuestions();
});

testNameInput.addEventListener("input", () => {
  const t = getActiveTest();
  if (!t) return;
  t.name = testNameInput.value.trim() || "Тест";
  touch(t);
  saveTests();
  renderTestsList();
});

shuffleToggle.addEventListener("change", () => {
  const t = getActiveTest();
  if (!t) return;
  t.settings.shuffleEnabled = shuffleToggle.checked;
  touch(t);
  saveTests();
  renderTestsList();
});

// QUESTION TYPE UI
qTypeEl.addEventListener("change", () => applyTypeUI(qTypeEl.value));

function applyTypeUI(type) {
  tfBlock.style.display = (type === "true_false") ? "block" : "none";
  mcBlock.style.display = (type === "multiple_choice") ? "block" : "none";
  openBlock.style.display = (type === "open_answer") ? "block" : "none";
}

// TRUE/FALSE toggle
btnSetTrue.addEventListener("click", () => setTfCorrect(true));
btnSetFalse.addEventListener("click", () => setTfCorrect(false));

function setTfCorrect(val) {
  tfCorrect = val;
  if (val) {
    btnSetTrue.classList.add("primary");
    btnSetTrue.classList.remove("secondary");
    btnSetFalse.classList.add("secondary");
    btnSetFalse.classList.remove("primary");
  } else {
    btnSetFalse.classList.add("primary");
    btnSetFalse.classList.remove("secondary");
    btnSetTrue.classList.add("secondary");
    btnSetTrue.classList.remove("primary");
  }
}

setTfCorrect(true);

// MULTIPLE CHOICE editor
function resetMcEditor() {
  mcOptions = ["", "", "", ""];
  mcCorrectIndex = 0;
  renderMcEditor();
}

function renderMcEditor() {
  mcListEl.innerHTML = "";

  mcOptions.forEach((opt, i) => {
    const row = document.createElement("div");
    row.style.display = "grid";
    row.style.gridTemplateColumns = "28px 1fr auto";
    row.style.gap = "8px";
    row.style.alignItems = "center";
    row.style.marginBottom = "8px";

    const radioWrap = document.createElement("div");
    radioWrap.style.display = "flex";
    radioWrap.style.justifyContent = "center";

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "mcCorrect";
    radio.checked = (i === mcCorrectIndex);
    radio.style.width = "18px";
    radio.style.height = "18px";
    radio.style.cursor = "pointer";
    radio.addEventListener("change", () => mcCorrectIndex = i);

    radioWrap.appendChild(radio);

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Вариант ответа...";
    input.value = opt;
    input.addEventListener("input", () => mcOptions[i] = input.value);

    const del = document.createElement("button");
    del.type = "button";
    del.className = "ghost";
    del.textContent = "✖";
    del.style.padding = "7px 10px";
    del.addEventListener("click", () => {
      if (mcOptions.length <= 2) {
        alert("Нужно минимум 2 варианта.");
        return;
      }
      mcOptions.splice(i, 1);
      if (mcCorrectIndex >= mcOptions.length) mcCorrectIndex = mcOptions.length - 1;
      renderMcEditor();
    });

    row.appendChild(radioWrap);
    row.appendChild(input);
    row.appendChild(del);

    mcListEl.appendChild(row);
  });
}

mcAddOptionBtn.addEventListener("click", () => {
  if (mcOptions.length >= 8) {
    alert("Максимум 8 вариантов.");
    return;
  }
  mcOptions.push("");
  renderMcEditor();
});

// ADD QUESTION
addQuestionBtn.addEventListener("click", () => {
  const t = getActiveTest();
  if (!t) return;

  const type = qTypeEl.value;
  const text = qTextEl.value.trim();
  const category = qCategoryEl.value.trim() || null;
  const explanation = qExplanationEl.value.trim() || null;

  const imageUrl = qImageUrlEl.value.trim() || null;
  const explanationImageUrl = qExplanationImageUrlEl.value.trim() || null;

  if (!text) {
    alert("Напиши текст вопроса.");
    qTextEl.focus();
    return;
  }

  const q = {
    id: Date.now(),
    type,
    text,
    category,
    explanation,
    imageUrl,
    explanationImageUrl
  };

  if (type === "true_false") {
    q.correct = tfCorrect;
  }

  if (type === "multiple_choice") {
    const cleaned = mcOptions.map(x => String(x || "").trim()).filter(x => x.length > 0);
    if (cleaned.length < 2) {
      alert("В multiple choice нужно минимум 2 непустых варианта.");
      return;
    }
    if (mcCorrectIndex < 0 || mcCorrectIndex >= cleaned.length) mcCorrectIndex = 0;
    q.options = cleaned;
    q.correctIndex = mcCorrectIndex;
  }

  if (type === "open_answer") {
    const correctText = openCorrectTextEl.value.trim();
    if (!correctText) {
      alert("Для open answer нужно указать правильный ответ.");
      openCorrectTextEl.focus();
      return;
    }
    q.correctText = correctText;
  }

  t.items.push(q);
  touch(t);
  saveTests();
  renderTestsList();
  renderQuestions();
  resetForm();

  if (qImageFileEl.files[0] || qExpImageFileEl.files[0]) {
    alert("✅ Вопрос добавлен!\n\n⚠️ Не забудь загрузить выбранные картинки в GitHub → папку /images.");
  }
});

clearFormBtn.addEventListener("click", resetForm);

function resetForm() {
  qTypeEl.value = "true_false";
  applyTypeUI("true_false");
  qCategoryEl.value = "";
  qTextEl.value = "";
  qExplanationEl.value = "";
  setTfCorrect(true);

  resetMcEditor();
  openCorrectTextEl.value = "";

  qImageFileEl.value = "";
  qImageFileNameEl.textContent = "Файл не выбран";
  qImagePreviewEl.style.display = "none";
  qImagePreviewEl.src = "";
  qImageUrlEl.value = "";

  qExpImageFileEl.value = "";
  qExpImageFileNameEl.textContent = "Файл не выбран";
  qExpImagePreviewEl.style.display = "none";
  qExpImagePreviewEl.src = "";
  qExplanationImageUrlEl.value = "";
}

// RENDER QUESTIONS + Actions
function renderQuestions() {
  const t = getActiveTest();
  questionsListEl.innerHTML = "";
  updateCounts();

  if (!t) {
    questionsListEl.innerHTML = `<div class="small-muted">Тест не выбран.</div>`;
    return;
  }

  if (!t.items.length) {
    questionsListEl.innerHTML = `<div class="small-muted">Пока нет вопросов. Добавь первый выше 👆</div>`;
    return;
  }

  t.items.forEach((q, idx) => {
    const item = document.createElement("div");
    item.className = "q-item";
    item.setAttribute("draggable", "true");
    item.dataset.id = q.id;

    const handle = document.createElement("div");
    handle.className = "drag-handle";
    handle.innerHTML = `
      <div class="drag-dots">
        <span></span><span></span>
        <span></span><span></span>
      </div>
    `;

    const main = document.createElement("div");

    const textEl = document.createElement("div");
    textEl.className = "q-main";
    textEl.textContent = q.text;
    main.appendChild(textEl);

    if (q.imageUrl) {
      const img = document.createElement("img");
      img.className = "thumb";
      img.src = q.imageUrl;
      img.onerror = () => img.style.display = "none";
      main.appendChild(img);
    }

    const meta = document.createElement("div");
    meta.className = "q-meta";

    const numberPill = document.createElement("span");
    numberPill.className = "pill-type";
    numberPill.textContent = "#" + (idx + 1);

    const typePill = document.createElement("span");
    typePill.className = "pill-type";
    typePill.textContent =
      q.type === "true_false" ? "Верю/Не верю" :
        q.type === "multiple_choice" ? "Multiple" : "Open";

    meta.appendChild(numberPill);
    meta.appendChild(typePill);

    if (q.type === "true_false") {
      const ans = document.createElement("span");
      ans.className = "pill-type " + (q.correct ? "pill-good" : "pill-bad");
      ans.textContent = q.correct ? "✅ Верно" : "❌ Неверно";
      meta.appendChild(ans);
    }

    if (q.category) {
      const cat = document.createElement("span");
      cat.className = "pill-type";
      cat.textContent = q.category;
      meta.appendChild(cat);
    }

    if (q.explanation) {
      const ex = document.createElement("span");
      ex.className = "pill-type";
      ex.textContent = "💬 Пояснение";
      meta.appendChild(ex);
    }

    if (q.explanationImageUrl) {
      const exi = document.createElement("span");
      exi.className = "pill-type";
      exi.textContent = "🖼 Поясн. картинка";
      meta.appendChild(exi);
    }

    main.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "q-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "secondary";
    editBtn.textContent = "✏️ Редактировать";
    editBtn.addEventListener("click", () => openEditModal(q.id));

    const copyBtn = document.createElement("button");
    copyBtn.className = "ghost";
    copyBtn.textContent = "📄 Копировать";
    copyBtn.addEventListener("click", () => duplicateQuestion(q.id));

    const delBtn = document.createElement("button");
    delBtn.className = "danger";
    delBtn.textContent = "🗑 Удалить";
    delBtn.addEventListener("click", () => deleteQuestion(q.id));

    actions.appendChild(editBtn);
    actions.appendChild(copyBtn);
    actions.appendChild(delBtn);

    item.appendChild(handle);
    item.appendChild(main);
    item.appendChild(actions);

    item.addEventListener("dragstart", (e) => onDragStart(e, item));
    item.addEventListener("dragend", () => onDragEnd(item));
    item.addEventListener("dragover", (e) => onDragOver(e, item));
    item.addEventListener("dragleave", () => item.classList.remove("drop-target"));
    item.addEventListener("drop", (e) => onDrop(e, item));

    questionsListEl.appendChild(item);
  });
}

function updateCounts() {
  const t = getActiveTest();
  const count = t?.items?.length || 0;
  questionsCountEl.textContent = count;
  questionsCountEl2.textContent = count;
}

function deleteQuestion(id) {
  const t = getActiveTest();
  if (!t) return;
  const ok = confirm("Удалить этот вопрос?");
  if (!ok) return;
  t.items = t.items.filter(x => x.id !== id);
  touch(t);
  saveTests();
  renderTestsList();
  renderQuestions();
}

function duplicateQuestion(id) {
  const t = getActiveTest();
  if (!t) return;
  const q = t.items.find(x => x.id === id);
  if (!q) return;
  const copy = JSON.parse(JSON.stringify(q));
  copy.id = Date.now();
  const idx = t.items.findIndex(x => x.id === id);
  t.items.splice(idx + 1, 0, copy);
  touch(t);
  saveTests();
  renderTestsList();
  renderQuestions();
}

// Drag & Drop
let dragFromId = null;

function onDragStart(e, item) {
  dragFromId = item.dataset.id;
  item.classList.add("dragging");
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", dragFromId);
}

function onDragEnd(item) {
  item.classList.remove("dragging");
  document.querySelectorAll(".q-item").forEach(x => x.classList.remove("drop-target"));
  dragFromId = null;
}

function onDragOver(e, item) {
  e.preventDefault();
  if (item.dataset.id === dragFromId) return;
  item.classList.add("drop-target");
  e.dataTransfer.dropEffect = "move";
}

function onDrop(e, item) {
  e.preventDefault();
  item.classList.remove("drop-target");

  const toId = item.dataset.id;
  const fromId = e.dataTransfer.getData("text/plain");
  if (!fromId || !toId || fromId === toId) return;

  const t = getActiveTest();
  if (!t) return;

  const fromIndex = t.items.findIndex(q => String(q.id) === String(fromId));
  const toIndex = t.items.findIndex(q => String(q.id) === String(toId));
  if (fromIndex < 0 || toIndex < 0) return;

  const moved = t.items.splice(fromIndex, 1)[0];
  t.items.splice(toIndex, 0, moved);

  touch(t);
  saveTests();
  renderQuestions();
}

// EDIT MODAL
modalCloseBtn.addEventListener("click", closeModal);
modalCancelBtn.addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", (e) => {
  if (e.target === modalBackdrop) closeModal();
});

modalSaveBtn.addEventListener("click", saveModalChanges);

function openEditModal(questionId) {
  const t = getActiveTest();
  if (!t) return;
  const q = t.items.find(x => x.id === questionId);
  if (!q) return;

  editingQuestionId = questionId;
  editState = JSON.parse(JSON.stringify(q));

  modalTitle.textContent = "Редактирование вопроса";
  modalContent.innerHTML = buildEditModalHTML(editState);

  attachEditModalListeners();
  modalBackdrop.style.display = "flex";
}

function buildEditModalHTML(q) {
  return `
    <div class="modal-grid">
      <div>
        <label>Тип вопроса</label>
        <select id="editType">
          <option value="true_false" ${q.type === "true_false" ? "selected" : ""}>Верю / Не верю</option>
          <option value="multiple_choice" ${q.type === "multiple_choice" ? "selected" : ""}>Multiple choice</option>
          <option value="open_answer" ${q.type === "open_answer" ? "selected" : ""}>Open answer</option>
        </select>
      </div>

      <div>
        <label>Категория</label>
        <input type="text" id="editCategory" value="${escapeHtml(q.category || "")}" placeholder="Например: Animals">
      </div>
    </div>

    <div class="field" style="margin-top:12px;">
      <label>Текст вопроса</label>
      <textarea id="editText">${escapeHtml(q.text || "")}</textarea>
    </div>

    <div class="field" id="editTFBlock" style="display:${q.type === "true_false" ? "block" : "none"};">
      <label>Правильный ответ (верю/не верю)</label>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <button class="secondary" type="button" id="editBtnTrue">✅ Верю (правда)</button>
        <button class="secondary" type="button" id="editBtnFalse">❌ Не верю (ложь)</button>
      </div>
    </div>

    <div class="field" id="editMCBlock" style="display:${q.type === "multiple_choice" ? "block" : "none"};">
      <label>Варианты (multiple choice)</label>
      <div class="image-picker">
        <div id="editMcList"></div>
        <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; justify-content:space-between; margin-top:10px;">
          <button class="secondary" type="button" id="editMcAdd">➕ Добавить вариант</button>
          <div class="small-muted">✅ Отметь кружком правильный вариант.</div>
        </div>
      </div>
    </div>

    <div class="field" id="editOpenBlock" style="display:${q.type === "open_answer" ? "block" : "none"};">
      <label>Правильный ответ (open answer)</label>
      <input type="text" id="editCorrectText" value="${escapeHtml(q.correctText || "")}" placeholder="Например: H2O">
    </div>

    <div class="field">
      <label>Путь к картинке вопроса</label>
      <input type="text" id="editImageUrl" value="${escapeHtml(q.imageUrl || "")}" placeholder="images/cat.jpg">
      <div class="hint">Можно очистить поле, если картинка не нужна.</div>
    </div>

    <div class="field">
      <label>Путь к картинке пояснения</label>
      <input type="text" id="editExplanationImageUrl" value="${escapeHtml(q.explanationImageUrl || "")}" placeholder="images/expl.jpg">
    </div>

    <div class="field">
      <label>Пояснение</label>
      <textarea id="editExplanation">${escapeHtml(q.explanation || "")}</textarea>
      <div class="hint">Покажется при неправильном ответе.</div>
    </div>
  `;
}

function attachEditModalListeners() {
  const editType = document.getElementById("editType");
  const editCategory = document.getElementById("editCategory");
  const editText = document.getElementById("editText");
  const editExplanation = document.getElementById("editExplanation");
  const editImageUrl = document.getElementById("editImageUrl");
  const editExplanationImageUrl = document.getElementById("editExplanationImageUrl");

  if (!editState.options) editState.options = ["", "", ""];
  if (typeof editState.correctIndex !== "number") editState.correctIndex = 0;

  const editBtnTrue = document.getElementById("editBtnTrue");
  const editBtnFalse = document.getElementById("editBtnFalse");

  if (editBtnTrue && editBtnFalse) {
    const setTF = (val) => {
      editState.correct = val;
      if (val) {
        editBtnTrue.classList.add("primary"); editBtnTrue.classList.remove("secondary");
        editBtnFalse.classList.add("secondary"); editBtnFalse.classList.remove("primary");
      } else {
        editBtnFalse.classList.add("primary"); editBtnFalse.classList.remove("secondary");
        editBtnTrue.classList.add("secondary"); editBtnTrue.classList.remove("primary");
      }
    };
    editBtnTrue.addEventListener("click", () => setTF(true));
    editBtnFalse.addEventListener("click", () => setTF(false));
    setTF(!!editState.correct);
  }

  renderEditMc();

  editType.addEventListener("change", () => {
    editState.type = editType.value;
    document.getElementById("editTFBlock").style.display = editState.type === "true_false" ? "block" : "none";
    document.getElementById("editMCBlock").style.display = editState.type === "multiple_choice" ? "block" : "none";
    document.getElementById("editOpenBlock").style.display = editState.type === "open_answer" ? "block" : "none";

    if (editState.type === "multiple_choice") {
      if (!editState.options || editState.options.length < 2) editState.options = ["", ""];
      if (typeof editState.correctIndex !== "number") editState.correctIndex = 0;
      renderEditMc();
    }
  });

  editCategory.addEventListener("input", () => editState.category = editCategory.value.trim() || null);
  editText.addEventListener("input", () => editState.text = editText.value.trim());
  editExplanation.addEventListener("input", () => editState.explanation = editExplanation.value.trim() || null);
  editImageUrl.addEventListener("input", () => editState.imageUrl = editImageUrl.value.trim() || null);
  editExplanationImageUrl.addEventListener("input", () => editState.explanationImageUrl = editExplanationImageUrl.value.trim() || null);

  const editCorrectText = document.getElementById("editCorrectText");
  if (editCorrectText) {
    editCorrectText.addEventListener("input", () => editState.correctText = editCorrectText.value.trim());
  }

  const editMcAdd = document.getElementById("editMcAdd");
  if (editMcAdd) {
    editMcAdd.addEventListener("click", () => {
      if (editState.options.length >= 8) {
        alert("Максимум 8 вариантов.");
        return;
      }
      editState.options.push("");
      renderEditMc();
    });
  }

  function renderEditMc() {
    const list = document.getElementById("editMcList");
    if (!list) return;
    list.innerHTML = "";

    const options = editState.options || [];
    options.forEach((opt, i) => {
      const row = document.createElement("div");
      row.style.display = "grid";
      row.style.gridTemplateColumns = "28px 1fr auto";
      row.style.gap = "8px";
      row.style.alignItems = "center";
      row.style.marginBottom = "8px";

      const radioWrap = document.createElement("div");
      radioWrap.style.display = "flex";
      radioWrap.style.justifyContent = "center";

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "editMcCorrect";
      radio.checked = i === editState.correctIndex;
      radio.style.width = "18px";
      radio.style.height = "18px";
      radio.addEventListener("change", () => editState.correctIndex = i);

      radioWrap.appendChild(radio);

      const input = document.createElement("input");
      input.type = "text";
      input.value = opt || "";
      input.placeholder = "Вариант ответа...";
      input.addEventListener("input", () => editState.options[i] = input.value);

      const del = document.createElement("button");
      del.type = "button";
      del.className = "ghost";
      del.textContent = "✖";
      del.style.padding = "7px 10px";
      del.addEventListener("click", () => {
        if (editState.options.length <= 2) {
          alert("Нужно минимум 2 варианта.");
          return;
        }
        editState.options.splice(i, 1);
        if (editState.correctIndex >= editState.options.length) editState.correctIndex = editState.options.length - 1;
        renderEditMc();
      });

      row.appendChild(radioWrap);
      row.appendChild(input);
      row.appendChild(del);

      list.appendChild(row);
    });
  }
}

function saveModalChanges() {
  const t = getActiveTest();
  if (!t) return;
  const q = t.items.find(x => x.id === editingQuestionId);
  if (!q) return;

  if (!editState.text || !editState.text.trim()) {
    alert("Текст вопроса не может быть пустым.");
    return;
  }

  if (editState.type === "multiple_choice") {
    const cleaned = (editState.options || []).map(x => String(x || "").trim()).filter(x => x.length > 0);
    if (cleaned.length < 2) {
      alert("В multiple choice должно быть минимум 2 непустых варианта.");
      return;
    }
    if (editState.correctIndex < 0 || editState.correctIndex >= cleaned.length) editState.correctIndex = 0;
    editState.options = cleaned;
  }

  if (editState.type === "open_answer") {
    if (!editState.correctText || !editState.correctText.trim()) {
      alert("Для open answer нужно указать правильный ответ.");
      return;
    }
  }

  Object.assign(q, editState);

  touch(t);
  saveTests();
  renderTestsList();
  renderQuestions();
  closeModal();
}

function closeModal() {
  modalBackdrop.style.display = "none";
  editingQuestionId = null;
  editState = null;
  modalContent.innerHTML = "";
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// EXPORT JSON
exportBtn.addEventListener("click", () => {
  const t = getActiveTest();
  if (!t) return;
  if (!t.items.length) {
    alert("Нечего экспортировать — список вопросов пуст.");
    return;
  }
  exportTextareaEl.value = JSON.stringify(t, null, 2);
  exportAreaEl.style.display = "block";
});

hideExportBtn.addEventListener("click", () => exportAreaEl.style.display = "none");

downloadJsonBtn.addEventListener("click", () => {
  const content = exportTextareaEl.value.trim();
  if (!content) return;

  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  const t = getActiveTest();
  const safeName = (t?.name || "test").replace(/[^\wа-яА-Я0-9]+/g, "_");
  a.href = url;
  a.download = `${safeName}_${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
});

copyJsonBtn.addEventListener("click", async () => {
  const txt = exportTextareaEl.value;
  if (!txt.trim()) return;
  try {
    await navigator.clipboard.writeText(txt);
    copyJsonBtn.textContent = "✅ Скопировано!";
    setTimeout(() => copyJsonBtn.textContent = "📋 Копировать", 1200);
  } catch {
    alert("Не удалось скопировать. Возможно браузер блокирует доступ к буферу.");
  }
});

// OPEN TEST
openTestBtn.addEventListener("click", () => window.open("test.html", "_blank"));

// CLEAR QUESTIONS
clearQuestionsBtn.addEventListener("click", () => {
  const t = getActiveTest();
  if (!t) return;
  if (!t.items.length) return;
  const ok = confirm("Точно удалить все вопросы в этом тесте?");
  if (!ok) return;
  t.items = [];
  touch(t);
  saveTests();
  renderTestsList();
  renderQuestions();
  exportAreaEl.style.display = "none";
});

// TEST LIST RENDER
function renderTestsList() {
  testsListEl.innerHTML = "";

  tests.forEach(t => {
    const el = document.createElement("div");
    el.className = "test-item" + (t.id === activeTestId ? " active" : "");
    el.addEventListener("click", () => {
      setActiveTest(t.id);
      saveTests();
      renderTestsList();
      loadActiveIntoEditor();
      renderQuestions();
      exportAreaEl.style.display = "none";
    });

    const left = document.createElement("div");

    const name = document.createElement("div");
    name.className = "test-name";
    name.textContent = t.name || "Тест";
    left.appendChild(name);

    const meta = document.createElement("div");
    meta.className = "test-meta";

    const qCount = document.createElement("span");
    qCount.className = "pill";
    qCount.textContent = "🧩 " + (t.items?.length || 0);

    const shuffle = document.createElement("span");
    shuffle.className = "pill";
    shuffle.textContent = (t.settings?.shuffleEnabled ? "🔀 ON" : "🔀 OFF");

    meta.appendChild(qCount);
    meta.appendChild(shuffle);
    left.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "test-actions";

    const renameBtn = document.createElement("button");
    renameBtn.className = "secondary mini-btn";
    renameBtn.textContent = "✏️ Имя";
    renameBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const newName = prompt("Новое название теста:", t.name || "Тест");
      if (!newName) return;
      t.name = newName.trim();
      touch(t);
      saveTests();
      renderTestsList();
      loadActiveIntoEditor();
    });

    const delBtn = document.createElement("button");
    delBtn.className = "danger mini-btn";
    delBtn.textContent = "🗑 Удалить";
    delBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const ok = confirm(`Удалить тест «${t.name}»?`);
      if (!ok) return;

      tests = tests.filter(x => x.id !== t.id);

      if (!tests.length) {
        const nt = createTest("Новый тест");
        tests = [nt];
        activeTestId = nt.id;
      } else if (activeTestId === t.id) {
        activeTestId = tests[0].id;
      }

      saveTests();
      localStorage.setItem(ACTIVE_TEST_ID_KEY, activeTestId);
      renderTestsList();
      loadActiveIntoEditor();
      renderQuestions();
    });

    actions.appendChild(renameBtn);
    actions.appendChild(delBtn);

    el.appendChild(left);
    el.appendChild(actions);
    testsListEl.appendChild(el);
  });
}

function loadActiveIntoEditor() {
  const t = getActiveTest();
  if (!t) return;
  testNameInput.value = t.name || "";
  shuffleToggle.checked = !!t.settings?.shuffleEnabled;
  updateCounts();
}

// STORAGE HELPERS
function touch(t) { t.updatedAt = new Date().toISOString(); }

function saveTests() {
  localStorage.setItem(TESTS_KEY, JSON.stringify(tests));
  localStorage.setItem(ACTIVE_TEST_ID_KEY, activeTestId);
}

function loadTests() {
  try {
    tests = JSON.parse(localStorage.getItem(TESTS_KEY) || "[]");
    activeTestId = localStorage.getItem(ACTIVE_TEST_ID_KEY);
  } catch {
    tests = [];
    activeTestId = null;
  }
}

function ensureAtLeastOneTest() {
  if (!tests.length) {
    const t = createTest("Мой первый тест");
    tests = [t];
    activeTestId = t.id;
    saveTests();
  }
  if (!activeTestId) {
    activeTestId = tests[0].id;
    saveTests();
  }
}

function createTest(name) {
  return {
    id: String(Date.now()),
    name: name || "Тест",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    settings: { shuffleEnabled: false },
    items: []
  };
}

function setActiveTest(id) {
  activeTestId = id;
  localStorage.setItem(ACTIVE_TEST_ID_KEY, id);
}

function getActiveTest() {
  return tests.find(t => t.id === activeTestId) || null;
}
