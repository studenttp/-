
const $ = id => document.getElementById(id);

const planetsData = [
  { name: "عطارد", emoji: "🌑", table: 1 },
  { name: "الزهرة", emoji: "🟠", table: 2 },
  { name: "الأرض", emoji: "🌍", table: 3 },
  { name: "المريخ", emoji: "🔴", table: 4 },
  { name: "المشتري", emoji: "🪐", table: 5 },
  { name: "زحل", emoji: "🪐", table: 6 },
  { name: "أورانوس", emoji: "🔵", table: 7 },
  { name: "نبتون", emoji: "🌌", table: 8 },
  { name: "القمر", emoji: "🌙", table: 9 },
  { name: "الشمس", emoji: "☀️", table: 10 }
];

const STORAGE_KEY = "rowad_aldarb_v1";
let data = loadData();
let currentStudent = "";
let currentPlanet = 0;
let questions = [];
let questionIndex = 0;
let score = 0;
let answered = false;
let currentAvatar = "girl";

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && saved.students && saved.progress) return saved;
  } catch (e) {}
  return {
    students: [],
    progress: {},
    teacherCode: "2468"
  };
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function ensureProgress(name) {
  if (!data.progress[name]) {
    data.progress[name] = {
      unlocked: [0],
      completed: [],
      scores: {},
      oralPassed: false
    };
  }
  return data.progress[name];
}

function show(section) {
  ["home", "journey", "quiz", "teacher", "certificate"]
    .forEach(id => $(id).classList.add("hidden"));
  $(section).classList.remove("hidden");
}

function refreshStudentMenus() {
  const menus = [$("student"), $("manageStudent")];

  menus.forEach(menu => {
    const oldValue = menu.value;
    menu.innerHTML = "";

    const first = document.createElement("option");
    first.value = "";
    first.textContent = menu.id === "student"
      ? "اختَر اسمك"
      : "اختَر الطالب";
    menu.appendChild(first);

    data.students.forEach(name => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      menu.appendChild(option);
    });

    if (data.students.includes(oldValue)) menu.value = oldValue;
  });
}

function renderPlanets() {
  const progress = ensureProgress(currentStudent);
  $("welcome").textContent =
    `${currentAvatar === "girl" ? "👩‍🚀" : "👨‍🚀"} أهلًا ${currentStudent}!`;

  const container = $("planets");
  container.innerHTML = "";

  planetsData.forEach((planet, index) => {
    const unlocked = progress.unlocked.includes(index);
    const done = progress.completed.includes(index);

    const button = document.createElement("button");
    button.className = "planet" +
      (unlocked ? "" : " locked") +
      (done ? " done" : "");

    button.innerHTML = `
      <span class="emoji">${done ? "⭐" : unlocked ? planet.emoji : "🔒"}</span>
      <strong>كوكب ${index + 1}</strong>
      <div>${planet.name}</div>
      <small>جدول ${planet.table}</small>
      <div>${done ? "مكتمل ✓" : unlocked ? "ابدأ التدريب" : "مغلق"}</div>
    `;

    button.disabled = !unlocked;
    button.addEventListener("click", () => startQuiz(index));
    container.appendChild(button);
  });

  const allDone = progress.completed.length === 10;
  const oralButton = document.createElement("button");
  oralButton.className = "planet";
  oralButton.innerHTML = `
    <span class="emoji">🎤</span>
    <strong>محطة التحدي الشفوي</strong>
    <div>${progress.oralPassed ? "اجتزت التحدي ✓" : "اختبار المعلمة"}</div>
  `;
  oralButton.disabled = !allDone || progress.oralPassed;
  oralButton.addEventListener("click", oralTest);
  container.appendChild(oralButton);

  if (progress.oralPassed) {
    const certificateButton = document.createElement("button");
    certificateButton.className = "planet done";
    certificateButton.innerHTML =
      '<span class="emoji">🏆</span><strong>شهادتي</strong>';
    certificateButton.addEventListener("click", showCertificate);
    container.appendChild(certificateButton);
  }
}

$("startBtn").addEventListener("click", () => {
  currentStudent = $("student").value;
  if (!currentStudent) {
    alert("اختَر اسمك أولًا!");
    return;
  }

  currentAvatar = document.querySelector(
    'input[name="avatar"]:checked'
  ).value;

  ensureProgress(currentStudent);
  renderPlanets();
  show("journey");
});

$("backBtn").addEventListener("click", () => show("home"));

function startQuiz(index) {
  currentPlanet = index;
  questionIndex = 0;
  score = 0;
  answered = false;

  const table = planetsData[index].table;
  const factors = Array.from({ length: 10 }, (_, i) => i + 1);

  // ترتيب عشوائي للأسئلة
  factors.sort(() => Math.random() - 0.5);

  questions = factors.map(factor => ({
    a: table,
    b: factor,
    answer: table * factor
  }));

  $("quizTitle").textContent =
    `${planetsData[index].emoji} كوكب ${planetsData[index].name} — جدول ${table}`;

  show("quiz");
  renderQuestion();
}

function renderQuestion() {
  const q = questions[questionIndex];
  answered = false;

  $("questionCount").textContent =
    `السؤال ${questionIndex + 1} من ${questions.length} | الإجابات الصحيحة: ${score}`;

  $("progressBar").style.width =
    `${questionIndex / questions.length * 100}%`;

  $("question").textContent = `${q.a} × ${q.b} = ؟`;
  $("feedback").textContent = "";
  $("nextBtn").classList.add("hidden");

  const options = new Set([q.answer]);

  while (options.size < 4) {
    const offset = Math.floor(Math.random() * 11) - 5;
    const value = q.answer + offset;
    if (value >= 0 && value !== q.answer) options.add(value);
  }

  const shuffled = [...options].sort(() => Math.random() - 0.5);
  const container = $("answers");
  container.innerHTML = "";

  shuffled.forEach(value => {
    const button = document.createElement("button");
    button.textContent = value;

    button.addEventListener("click", () => {
      if (answered) return;
      answered = true;

      container.querySelectorAll("button").forEach(b => {
        b.disabled = true;
      });

      if (value === q.answer) {
        score++;
        button.style.background = "#8ef0b9";
        $("feedback").textContent = "أحسنت! إجابة صحيحة ⭐";
      } else {
        button.style.background = "#ffb4b4";
        $("feedback").textContent = `حاول مرة أخرى في المرة القادمة. الإجابة: ${q.answer}`;
      }

      $("questionCount").textContent =
        `السؤال ${questionIndex + 1} من 10 | الإجابات الصحيحة: ${score}`;

      $("progressBar").style.width =
        `${(questionIndex + 1) / questions.length * 100}%`;

      $("nextBtn").textContent =
        questionIndex === questions.length - 1
          ? "إنهاء التدريب 🏁"
          : "السؤال التالي ➜";

      $("nextBtn").classList.remove("hidden");
    });

    container.appendChild(button);
  });
}

$("nextBtn").addEventListener("click", () => {
  if (questionIndex < questions.length - 1) {
    questionIndex++;
    renderQuestion();
    return;
  }

  const progress = ensureProgress(currentStudent);
  progress.scores[currentPlanet] = score;

  // اجتياز الكوكب يحتاج 8 إجابات صحيحة على الأقل من 10
  if (score >= 8) {
    if (!progress.completed.includes(currentPlanet)) {
      progress.completed.push(currentPlanet);
    }

    const next = currentPlanet + 1;

    // فتح المرحلة التالية لا يحدث تلقائيًا؛ المعلمة تتحكم به.
    $("feedback").textContent =
      "رائع! حققت نتيجة النجاح. انتظر موافقة المعلمة لفتح الكوكب التالي.";
  } else {
    $("feedback").textContent =
      "تحتاج إلى 8 إجابات صحيحة على الأقل. تدرب وحاول مجددًا!";
    progress.completed = progress.completed.filter(
      i => i !== currentPlanet
    );
  }

  saveData();

  $("answers").innerHTML = "";
  $("nextBtn").classList.add("hidden");

  const back = document.createElement("button");
  back.textContent = "العودة إلى الكواكب 🪐";
  back.addEventListener("click", () => {
    renderPlanets();
    show("journey");
  });
  $("answers").appendChild(back);
});

function oralTest() {
  const questions = [
    [2, 3], [4, 5], [6, 7], [8, 3], [9, 4]
  ];
  let index = 0;
  let correct = 0;

  function ask() {
    if (index >= questions.length) {
      const pass = correct >= 4;
      const progress = ensureProgress(currentStudent);

      if (pass) progress.oralPassed = true;

      saveData();
      alert(
        `انتهى التحدي الشفوي!\nالنتيجة: ${correct} من 5\n` +
        (pass ? "مبروك! اجتزت التحدي 🎉" :
          "تحتاج إلى 4 إجابات صحيحة. يمكنك المحاولة مجددًا.")
      );

      renderPlanets();

      if (pass) showCertificate();
      else show("journey");
      return;
    }

    const [a, b] = questions[index];
    const response = prompt(
      `السؤال ${index + 1} من 5:\nكم يساوي ${a} × ${b}؟`
    );

    if (response !== null && Number(response) === a * b) {
      correct++;
    }

    index++;
    ask();
  }

  ask();
}

function showCertificate() {
  $("certificateName").textContent = currentStudent;
  show("certificate");
}

$("returnJourney").addEventListener("click", () => {
  renderPlanets();
  show("journey");
});

$("teacherBtn").addEventListener("click", () => {
  $("teacherLogin").classList.remove("hidden");
  $("teacherTools").classList.add("hidden");
  $("teacherCode").value = "";
  $("loginMessage").textContent = "";
  show("teacher");
});

$("loginBtn").addEventListener("click", () => {
  if ($("teacherCode").value === data.teacherCode) {
    $("teacherLogin").classList.add("hidden");
    $("teacherTools").classList.remove("hidden");
    renderTeacher();
  } else {
    $("loginMessage").textContent = "الرمز غير صحيح.";
  }
});

function renderTeacher() {
  refreshStudentMenus();

  $("planetUnlock").innerHTML = "";
  planetsData.forEach((planet, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = `الكوكب ${index + 1} — ${planet.name}`;
    $("planetUnlock").appendChild(option);
  });

  renderStudentList();
  renderReport();
}

$("addBtn").addEventListener("click", () => {
  const name = $("newStudent").value.trim();

  if (!name) {
    alert("اكتبي اسم الطالب.");
    return;
  }

  if (data.students.includes(name)) {
    alert("هذا الاسم موجود بالفعل.");
    return;
  }

  data.students.push(name);
  ensureProgress(name);
  saveData();

  $("newStudent").value = "";
  renderTeacher();
});

function renderStudentList() {
  const container = $("studentList");
  container.innerHTML = "";

  if (!data.students.length) {
    container.textContent = "لم تتم إضافة طلاب بعد.";
    return;
  }

  data.students.forEach(name => {
    const row = document.createElement("div");
    row.className = "student-row";

    const label = document.createElement("span");
    label.textContent = name + " ";

    const remove = document.createElement("button");
    remove.textContent = "حذف الطالب";
    remove.className = "danger";

    remove.addEventListener("click", () => {
      if (!confirm(`هل تريدين حذف ${name} وتقدمه؟`)) return;

      data.students = data.students.filter(s => s !== name);
      delete data.progress[name];
      saveData();
      renderTeacher();
    });

    row.append(label, remove);
    container.appendChild(row);
  });
}

function updateUnlock() {
  const name = $("manageStudent").value;
  const index = Number($("planetUnlock").value);

  if (!name) {
    alert("اختاري الطالب أولًا.");
    return null;
  }

  return ensureProgress(name);
}

$("unlockBtn").addEventListener("click", () => {
  const progress = updateUnlock();
  if (!progress) return;

  const index = Number($("planetUnlock").value);

  if (!progress.unlocked.includes(index)) {
    progress.unlocked.push(index);
    progress.unlocked.sort((a, b) => a - b);
  }

  saveData();
  renderTeacher();
  alert("تم فتح الكوكب للطالب المحدد.");
});

$("lockBtn").addEventListener("click", () => {
  const progress = updateUnlock();
  if (!progress) return;

  const index = Number($("planetUnlock").value);

  progress.unlocked = progress.unlocked.filter(i => i !== index);
  saveData();
  renderTeacher();
  alert("تم قفل الكوكب.");
});

function renderReport() {
  const container = $("report");
  container.innerHTML = "";

  data.students.forEach(name => {
    const p = ensureProgress(name);
    const row = document.createElement("div");
    row.className = "report-row";

    const scores = Object.keys(p.scores).map(
      i => `جدول ${planetsData[Number(i)].table}: ${p.scores[i]}/10`
    ).join(" | ");

    row.textContent =
      `${name} — الكواكب المكتملة: ${p.completed.length}/10 — ` +
      `التحدي الشفوي: ${p.oralPassed ? "مجتاز" : "لم يجتز"} — ` +
      (scores || "لا توجد نتائج بعد");

    container.appendChild(row);
  });
}

$("exportBtn").addEventListener("click", () => {
  const rows = [["اسم الطالب", "الكواكب المكتملة", "نتائج الجداول", "التحدي الشفوي"]];

  data.students.forEach(name => {
    const p = ensureProgress(name);
    rows.push([
      name,
      `${p.completed.length}/10`,
      Object.keys(p.scores).map(
        i => `جدول ${planetsData[Number(i)].table}: ${p.scores[i]}/10`
      ).join("؛ "),
      p.oralPassed ? "مجتاز" : "لم يجتز"
    ]);
  });

  const csv = "\uFEFF" + rows.map(row =>
    row.map(value =>
      `"${String(value).replace(/"/g, '""')}"`
    ).join(",")
  ).join("\r\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "rowad-aldarb-report.csv";
  link.click();
  URL.revokeObjectURL(url);
});

$("resetBtn").addEventListener("click", () => {
  const name = $("manageStudent").value;

  if (!name) {
    alert("اختاري الطالب أولًا.");
    return;
  }

  if (!confirm(`هل تريدين إعادة تعيين تقدم ${name}؟`)) return;

  data.progress[name] = {
    unlocked: [0],
    completed: [],
    scores: {},
    oralPassed: false
  };

  saveData();
  renderTeacher();
});

$("logoutBtn").addEventListener("click", () => {
  show("home");
});

// تهيئة الموقع عند فتحه
refreshStudentMenus();
