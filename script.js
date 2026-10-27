
import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// إعدادات Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCZGRVBgZMSj8phapBIz1duuM7zxvSKE90",
  authDomain: "rowad-aldarb.firebaseapp.com",
  projectId: "rowad-aldarb",
  storageBucket: "rowad-aldarb.firebasestorage.app",
  messagingSenderId: "844956188514",
  appId: "1:844956188514:web:1f7f90ead7b7f7a2aaf63b",
  measurementId: "G-X1KKYNFKJW"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// غيّري هذا الرمز إلى الرمز الذي تريدينه
const TEACHER_CODE = "2468";

const $ = id => document.getElementById(id);
const STORAGE_KEY = "rowad_aldarb_v1";

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

function loadData() {
  try {
    const d = JSON.parse(localStorage.getItem(STORAGE_KEY));

    if (d && Array.isArray(d.students) && d.progress) {
      return d;
    }
  } catch (e) {
    console.warn("تعذر تحميل البيانات المحلية:", e);
  }

  return {
    students: [],
    progress: {}
  };
}

let data = loadData();

let currentStudent = "";
let currentPlanet = 0;
let questions = [];
let questionIndex = 0;
let score = 0;
let answered = false;
let currentAvatar = "girl";
let teacherSignedIn = false;
let rosterUnsubscribe = null;
let cloudReadyFor = "";

function ensureProgress(name) {
  if (!data.progress[name]) {
    data.progress[name] = {
      unlocked: [0],
      completed: [],
      scores: {},
      oralPassed: false
    };
  }

  const p = data.progress[name];

  if (!Array.isArray(p.unlocked)) p.unlocked = [0];
  if (!Array.isArray(p.completed)) p.completed = [];
  if (!p.scores || typeof p.scores !== "object") p.scores = {};

  p.oralPassed = p.oralPassed === true;

  return p;
}

function progressRef(name) {
  return doc(
    db,
    "students",
    encodeURIComponent(name),
    "progress",
    "main"
  );
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("تعذر الحفظ المحلي:", e);
  }

  if (currentStudent && cloudReadyFor === currentStudent) {
    void saveProgressToCloud(currentStudent);
  }
}

async function saveProgressToCloud(name) {
  if (!name || !data.students.includes(name)) return;

  const p = ensureProgress(name);

  try {
    await setDoc(progressRef(name), {
      unlocked: p.unlocked,
      completed: p.completed,
      scores: p.scores,
      oralPassed: p.oralPassed,
      updatedAt: new Date().toISOString()
    });
  } catch (e) {
    console.error("خطأ في حفظ التقدم:", e);

    alert(
      "لم يُحفظ التقدم في Firebase. " +
      "تحققي من قواعد Firestore والاتصال بالإنترنت."
    );
  }
}

async function loadProgressFromCloud(name) {
  const snap = await getDoc(progressRef(name));

  if (snap.exists()) {
    const p = snap.data();

    data.progress[name] = {
      unlocked: Array.isArray(p.unlocked) ? p.unlocked : [0],
      completed: Array.isArray(p.completed) ? p.completed : [],
      scores: p.scores && typeof p.scores === "object" ? p.scores : {},
      oralPassed: p.oralPassed === true
    };
  } else {
    ensureProgress(name);

    const p = data.progress[name];

    await setDoc(progressRef(name), {
      unlocked: p.unlocked,
      completed: p.completed,
      scores: p.scores,
      oralPassed: p.oralPassed,
      updatedAt: new Date().toISOString()
    });
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("تعذر حفظ نسخة محلية:", e);
  }
}

function show(section) {
  ["home", "journey", "quiz", "teacher", "certificate"].forEach(id => {
    if ($(id)) $(id).classList.add("hidden");
  });

  if ($(section)) $(section).classList.remove("hidden");
}

function showMessage(message) {
  if ($("loginMessage")) {
    $("loginMessage").textContent = message;
  }
}

function refreshStudentMenus() {
  [$("student"), $("manageStudent")].filter(Boolean).forEach(menu => {
    const old = menu.value;
    menu.innerHTML = "";

    const first = document.createElement("option");
    first.value = "";
    first.textContent =
      menu.id === "student" ? "اختَر اسمك" : "اختَر الطالب";

    menu.appendChild(first);

    data.students.forEach(name => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      menu.appendChild(opt);
    });

    if (data.students.includes(old)) menu.value = old;
  });
}

// عرض الكواكب
function renderPlanets() {
  const p = ensureProgress(currentStudent);

  $("welcome").textContent =
    `${currentAvatar === "girl" ? "👩‍🚀" : "👨‍🚀"} أهلًا ${currentStudent}!`;

  const container = $("planets");
  container.innerHTML = "";

  planetsData.forEach((planet, i) => {
    const unlocked = p.unlocked.includes(i);
    const done = p.completed.includes(i);
    const btn = document.createElement("button");

    btn.className =
      "planet" +
      (unlocked ? "" : " locked") +
      (done ? " done" : "");

    btn.innerHTML = `
      <span class="emoji">${done ? "⭐" : unlocked ? planet.emoji : "🔒"}</span>
      <strong>كوكب ${i + 1}</strong>
      <div>${planet.name}</div>
      <small>جدول ${planet.table}</small>
      <div>${done ? "مكتمل ✓" : unlocked ? "ابدأ التدريب" : "مغلق"}</div>
    `;

    btn.disabled = !unlocked;
    btn.addEventListener("click", () => startQuiz(i));
    container.appendChild(btn);
  });

  const oral = document.createElement("button");
  oral.className = "planet";

  oral.innerHTML = `
    <span class="emoji">🎤</span>
    <strong>محطة التحدي الشفوي</strong>
    <div>${p.oralPassed ? "اجتزت التحدي ✓" : "اختبار المعلمة"}</div>
  `;

  oral.disabled = p.completed.length !== 10 || p.oralPassed;
  oral.addEventListener("click", oralTest);
  container.appendChild(oral);

  if (p.oralPassed) {
    const cert = document.createElement("button");
    cert.className = "planet done";
    cert.innerHTML = '<span class="emoji">🏆</span><strong>شهادتي</strong>';
    cert.addEventListener("click", showCertificate);
    container.appendChild(cert);
  }
}

// دخول الطالب بالاسم فقط
$("startBtn").addEventListener("click", async () => {
  const name = $("student").value;

  if (!name) return alert("اختَر اسمك أولًا!");

  currentStudent = name;
  cloudReadyFor = "";

  const avatar = document.querySelector('input[name="avatar"]:checked');
  if (avatar) currentAvatar = avatar.value;

  $("startBtn").disabled = true;
  showMessage("جارٍ تحميل تقدمك...");

  try {
    await loadProgressFromCloud(name);

    cloudReadyFor = name;
    renderPlanets();
    show("journey");
  } catch (e) {
    console.error("تعذر تحميل تقدم الطالب:", e);

    alert(
      "تعذر تحميل التقدم من Firebase. " +
      "تأكدي من قواعد Firestore ثم حاولي مجددًا."
    );
  } finally {
    $("startBtn").disabled = false;
    showMessage("");
  }
});

$("backBtn").addEventListener("click", () => show("home"));

// بدء تدريب الكوكب
function startQuiz(index) {
  currentPlanet = index;
  questionIndex = 0;
  score = 0;
  answered = false;

  const table = planetsData[index].table;

  const factors = Array.from({ length: 10 }, (_, i) => i + 1)
    .sort(() => Math.random() - 0.5);

  questions = factors.map(b => ({
    a: table,
    b,
    answer: table * b
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
    const value = q.answer + Math.floor(Math.random() * 11) - 5;

    if (value >= 0 && value !== q.answer) options.add(value);
  }

  const container = $("answers");
  container.innerHTML = "";

  [...options].sort(() => Math.random() - 0.5).forEach(value => {
    const btn = document.createElement("button");
    btn.textContent = value;

    btn.addEventListener("click", () => {
      if (answered) return;
      answered = true;

      container.querySelectorAll("button").forEach(b => {
        b.disabled = true;
      });

      if (value === q.answer) {
        score++;
        btn.style.background = "#8ef0b9";
        $("feedback").textContent = "أحسنت! إجابة صحيحة ⭐";
      } else {
        btn.style.background = "#ffb4b4";
        $("feedback").textContent =
          `حاول مرة أخرى في المرة القادمة. الإجابة: ${q.answer}`;
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

    container.appendChild(btn);
  });
}

$("nextBtn").addEventListener("click", async () => {
  if (questionIndex < questions.length - 1) {
    questionIndex++;
    renderQuestion();
    return;
  }

  const p = ensureProgress(currentStudent);
  p.scores[currentPlanet] = score;

  if (score >= 8) {
    if (!p.completed.includes(currentPlanet)) {
      p.completed.push(currentPlanet);
    }

    $("feedback").textContent =
      "رائع! حققت نتيجة النجاح. انتظر موافقة المعلمة لفتح الكوكب التالي.";
  } else {
    $("feedback").textContent =
      "تحتاج إلى 8 إجابات صحيحة على الأقل. تدرب وحاول مجددًا!";

    p.completed = p.completed.filter(i => i !== currentPlanet);
  }

  saveData();
  await saveProgressToCloud(currentStudent);

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

// التحدي الشفوي
function oralTest() {
  const qs = [[2, 3], [4, 5], [6, 7], [8, 3], [9, 4]];

  let i = 0;
  let correct = 0;

  function ask() {
    if (i >= qs.length) {
      const pass = correct >= 4;
      const p = ensureProgress(currentStudent);

      if (pass) p.oralPassed = true;

      saveData();
      void saveProgressToCloud(currentStudent);

      $("answers").innerHTML = "";
      $("feedback").textContent = pass
        ? "مبارك! اجتزت التحدي الشفوي 🏆"
        : "حاول مرة أخرى حتى تحقق 4 إجابات صحيحة من 5.";

      $("question").textContent = `نتيجتك: ${correct} من ${qs.length}`;
      $("questionCount").textContent = "انتهى التحدي الشفوي";
      $("nextBtn").classList.add("hidden");

      const back = document.createElement("button");
      back.textContent = "العودة إلى الكواكب 🪐";
      back.addEventListener("click", () => {
        renderPlanets();
        show("journey");
      });
      $("answers").appendChild(back);

      if (pass) {
        const cert = document.createElement("button");
        cert.textContent = "عرض الشهادة 🏆";
        cert.addEventListener("click", showCertificate);
        $("answers").appendChild(cert);
      }

      return;
    }

    const [a, b] = qs[i];

    $("question").textContent = `${a} × ${b} = ؟`;
    $("questionCount").textContent = `السؤال ${i + 1} من ${qs.length}`;
    $("feedback").textContent =
      "أجيبي شفهيًا، ثم اضغطي على الإجابة الصحيحة.";
    $("answers").innerHTML = "";

    const choices = new Set([a * b]);

    while (choices.size < 4) {
      const value = a * b + Math.floor(Math.random() * 11) - 5;
      if (value >= 0 && value !== a * b) choices.add(value);
    }

    [...choices].sort(() => Math.random() - 0.5).forEach(value => {
      const btn = document.createElement("button");
      btn.textContent = value;

      btn.addEventListener("click", () => {
        $("answers").querySelectorAll("button").forEach(b => {
          b.disabled = true;
        });

        if (value === a * b) {
          correct++;
          $("feedback").textContent = "إجابة صحيحة ⭐";
        } else {
          $("feedback").textContent = `الإجابة الصحيحة هي ${a * b}`;
        }

        i++;

        const next = document.createElement("button");
        next.textContent = i < qs.length ? "السؤال التالي ➜" : "عرض النتيجة";
        next.addEventListener("click", ask);

        $("answers").innerHTML = "";
        $("answers").appendChild(next);
      }, { once: true });

      $("answers").appendChild(btn);
    });
  }

  show("quiz");
  ask();
}

// الشهادة
function showCertificate() {
  const p = ensureProgress(currentStudent);

  if (!p.oralPassed) {
    alert("يجب اجتياز التحدي الشفوي أولًا.");
    return;
  }

  show("certificate");

  if ($("certificateName")) {
    $("certificateName").textContent = currentStudent;
  }

  if ($("certificateDate")) {
    $("certificateDate").textContent =
      new Date().toLocaleDateString("ar");
  }
}

if ($("returnJourney")) {
  $("returnJourney").addEventListener("click", () => {
    renderPlanets();
    show("journey");
  });
}

// فتح صفحة المعلمة
if ($("teacherBtn")) {
  $("teacherBtn").addEventListener("click", () => {
    show("teacher");
    teacherSignedIn = false;

    if ($("teacherLogin")) {
      $("teacherLogin").classList.remove("hidden");
    }

    if ($("teacherTools")) {
      $("teacherTools").classList.add("hidden");
    }

    if ($("teacherCode")) $("teacherCode").value = "";
    showMessage("");
  });
}

// تسجيل دخول المعلمة بالرمز السري فقط
if ($("loginBtn")) {
  $("loginBtn").addEventListener("click", () => {
    const code = $("teacherCode").value;

    if (code !== TEACHER_CODE) {
      showMessage("الرمز السري غير صحيح. حاولي مرة أخرى.");
      return;
    }

    teacherSignedIn = true;

    if ($("teacherLogin")) {
      $("teacherLogin").classList.add("hidden");
    }

    if ($("teacherTools")) {
      $("teacherTools").classList.remove("hidden");
    }

    showMessage("تم الدخول بنجاح 🌷");
    renderStudentList();
  });
}

// دعم الضغط على Enter داخل حقل الرمز
if ($("teacherCode")) {
  $("teacherCode").addEventListener("keydown", event => {
    if (event.key === "Enter") {
      $("loginBtn").click();
    }
  });
}

// مزامنة قائمة الطلاب من Firebase.
// تعمل حتى قبل دخول المعلمة لكي تظهر الأسماء للطلاب.
function startRosterListener() {
  if (rosterUnsubscribe) return;

  rosterUnsubscribe = onSnapshot(
    collection(db, "students"),
    snapshot => {
      data.students = snapshot.docs
        .map(d => d.data().name)
        .filter(name => typeof name === "string" && name.trim())
        .sort((a, b) => a.localeCompare(b, "ar"));

      refreshStudentMenus();
      renderStudentList();

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (e) {
        console.warn("تعذر حفظ نسخة محلية:", e);
      }
    },
    error => {
      console.error("تعذر مزامنة الطلاب:", error);
      showMessage("تعذر تحميل قائمة الطلاب. تحققي من قواعد Firestore.");
    }
  );
}

// عرض قائمة الطلاب في لوحة المعلمة
function renderStudentList() {
  const container = $("studentList");
  if (!container) return;

  container.innerHTML = "";

  data.students.forEach(name => {
    const row = document.createElement("div");
    row.className = "student-row";

    const label = document.createElement("span");
    label.textContent = name;

    const remove = document.createElement("button");
    remove.textContent = "حذف الطالب 🗑️";

    remove.addEventListener("click", async () => {
      if (!teacherSignedIn) {
        alert("يجب تسجيل دخول المعلمة أولًا.");
        return;
      }

      if (!confirm(`هل تريدين حذف الطالب ${name}؟`)) return;

      try {
        await deleteDoc(doc(db, "students", encodeURIComponent(name)));

        // حذف سجل التقدم أيضًا
        await deleteDoc(progressRef(name));

        delete data.progress[name];

        if (currentStudent === name) {
          currentStudent = "";
          cloudReadyFor = "";
          show("home");
        }

        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
          console.warn(e);
        }
      } catch (e) {
        console.error(e);
        alert("تعذر حذف الطالب. تحققي من قواعد Firestore.");
      }
    });

    row.appendChild(label);
    row.appendChild(remove);
    container.appendChild(row);
  });
}

// إضافة طالب جديد
if ($("addBtn")) {
  $("addBtn").addEventListener("click", async () => {
    if (!teacherSignedIn) {
      alert("يجب تسجيل دخول المعلمة أولًا.");
      return;
    }

    const input = $("newStudent");
    const name = input.value.trim();

    if (!name) {
      alert("اكتبي اسم الطالب أولًا.");
      return;
    }

    if (data.students.includes(name)) {
      alert("هذا الطالب موجود بالفعل.");
      return;
    }

    try {
      await setDoc(doc(db, "students", encodeURIComponent(name)), {
        name,
        createdAt: new Date().toISOString()
      });

      ensureProgress(name);
      input.value = "";
      alert("تمت إضافة الطالب بنجاح ✅");
    } catch (e) {
      console.error(e);
      alert("تعذرت إضافة الطالب. تحققي من قواعد Firestore.");
    }
  });
}

// اختيار طالب لإدارة تقدمه
if ($("manageStudent")) {
  $("manageStudent").addEventListener("change", async () => {
    const name = $("manageStudent").value;
    if (!name) return;

    try {
      const snap = await getDoc(progressRef(name));

      if (snap.exists()) {
        const p = snap.data();

        data.progress[name] = {
          unlocked: Array.isArray(p.unlocked) ? p.unlocked : [0],
          completed: Array.isArray(p.completed) ? p.completed : [],
          scores: p.scores || {},
          oralPassed: p.oralPassed === true
        };
      } else {
        ensureProgress(name);
      }

      renderUnlockMenu(name);
      renderReport(name);
    } catch (e) {
      console.error(e);
      alert("تعذر تحميل تقدم الطالب.");
    }
  });
}

function renderUnlockMenu(name) {
  const select = $("planetUnlock");
  if (!select) return;

  select.innerHTML = "";

  planetsData.forEach((planet, i) => {
    const option = document.createElement("option");
    option.value = String(i);
    option.textContent =
      `${planet.emoji} ${planet.name} — جدول ${planet.table}`;
    select.appendChild(option);
  });
}

// فتح كوكب لطالب
if ($("unlockBtn")) {
  $("unlockBtn").addEventListener("click", async () => {
    if (!teacherSignedIn) {
      alert("يجب تسجيل دخول المعلمة أولًا.");
      return;
    }

    const name = $("manageStudent").value;
    const index = Number($("planetUnlock").value);

    if (!name || !Number.isInteger(index) || index < 0 || index >= 10) {
      alert("اختاري الطالب والكوكب.");
      return;
    }

    const p = ensureProgress(name);
    if (!p.unlocked.includes(index)) p.unlocked.push(index);
    p.unlocked.sort((a, b) => a - b);

    try {
      await saveStudentProgress(name);
      alert("تم فتح الكوكب بنجاح 🔓");
      renderReport(name);
      if (name === currentStudent) renderPlanets();
    } catch (e) {
      console.error(e);
      alert("تعذر حفظ التعديل في Firebase.");
    }
  });
}

// إغلاق كوكب لطالب
if ($("lockBtn")) {
  $("lockBtn").addEventListener("click", async () => {
    if (!teacherSignedIn) {
      alert("يجب تسجيل دخول المعلمة أولًا.");
      return;
    }

    const name = $("manageStudent").value;
    const index = Number($("planetUnlock").value);

    if (!name || !Number.isInteger(index) || index < 0 || index >= 10) {
      alert("اختاري الطالب والكوكب.");
      return;
    }

    if (index === 0) {
      alert("لا يمكن إغلاق الكوكب الأول.");
      return;
    }

    const p = ensureProgress(name);
    p.unlocked = p.unlocked.filter(i => i !== index);

    try {
      await saveStudentProgress(name);
      alert("تم إغلاق الكوكب 🔒");
      renderReport(name);
      if (name === currentStudent) renderPlanets();
    } catch (e) {
      console.error(e);
      alert("تعذر حفظ التعديل في Firebase.");
    }
  });
}

async function saveStudentProgress(name) {
  const p = ensureProgress(name);

  await setDoc(progressRef(name), {
    unlocked: p.unlocked,
    completed: p.completed,
    scores: p.scores,
    oralPassed: p.oralPassed,
    updatedAt: new Date().toISOString()
  });

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn(e);
  }
}

// تقرير تقدم طالب
function renderReport(name) {
  const container = $("report");
  if (!container) return;

  const p = ensureProgress(name);

  container.innerHTML = `
    <h3>تقرير الطالب: ${escapeHTML(name)}</h3>
    <p>الكواكب المفتوحة: ${p.unlocked.length} من 10</p>
    <p>الكواكب المكتملة: ${p.completed.length} من 10</p>
    <p>التحدي الشفوي: ${p.oralPassed ? "مجتاز ✓" : "لم يجتز بعد"}</p>
    <h4>النتائج</h4>
    <ul>
      ${planetsData.map((planet, i) => `
        <li>
          ${planet.name}:
          ${p.scores[i] === undefined ? "لم يُختبر بعد" : `${p.scores[i]} من 10`}
        </li>
      `).join("")}
    </ul>
  `;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

// تصدير تقرير CSV
if ($("exportBtn")) {
  $("exportBtn").addEventListener("click", async () => {
    if (!teacherSignedIn) {
      alert("يجب تسجيل دخول المعلمة أولًا.");
      return;
    }

    try {
      const rows = [[
        "اسم الطالب",
        "الكواكب المفتوحة",
        "الكواكب المكتملة",
        ...planetsData.map(p => `نتيجة ${p.name}`),
        "التحدي الشفوي"
      ]];

      for (const name of data.students) {
        const snap = await getDoc(progressRef(name));
        const p = snap.exists() ? snap.data() : ensureProgress(name);

        rows.push([
          name,
          (p.unlocked || []).length,
          (p.completed || []).length,
          ...planetsData.map((_, i) =>
            p.scores && p.scores[i] !== undefined ? p.scores[i] : ""
          ),
          p.oralPassed ? "مجتاز" : "غير مجتاز"
        ]);
      }

      const csv = "\uFEFF" + rows.map(row =>
        row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(",")
      ).join("\r\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = url;
      a.download = "تقرير-رواد-الضرب.csv";
      a.click();

      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("تعذر إنشاء التقرير.");
    }
  });
}

// إعادة تعيين تقدم طالب
if ($("resetBtn")) {
  $("resetBtn").addEventListener("click", async () => {
    if (!teacherSignedIn) {
      alert("يجب تسجيل دخول المعلمة أولًا.");
      return;
    }

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

    try {
      await saveStudentProgress(name);
      alert("تمت إعادة تعيين التقدم.");
      renderReport(name);
      if (name === currentStudent) renderPlanets();
    } catch (e) {
      console.error(e);
      alert("تعذر حفظ إعادة التعيين.");
    }
  });
}

// تسجيل الخروج من لوحة المعلمة
if ($("logoutBtn")) {
  $("logoutBtn").addEventListener("click", () => {
    teacherSignedIn = false;

    if ($("teacherLogin")) {
      $("teacherLogin").classList.remove("hidden");
    }

    if ($("teacherTools")) {
      $("teacherTools").classList.add("hidden");
    }

    if ($("teacherCode")) $("teacherCode").value = "";

    showMessage("");
    show("home");
  });
}

// تهيئة الموقع وقائمة الطلاب
refreshStudentMenus();
startRosterListener();
