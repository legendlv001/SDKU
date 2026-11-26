// ==========================================
// LINK GOOGLE APPS SCRIPT (LETAKKAN PALING ATAS)
// ==========================================
const KELAS_APPS_SCRIPT_URL = (typeof APPS_SCRIPT_URL !== 'undefined' && APPS_SCRIPT_URL && APPS_SCRIPT_URL.startsWith('http'))
    ? APPS_SCRIPT_URL
    : "https://script.google.com/macros/s/AKfycbztvCaoz9VoBwjNPUjzf_k_CMbqy9ICOhjT45WLKzmmUIw4aTIEiOaIm00mT-ylgn9o/exec";

// ==========================================
// PENGATURAN LAYAR PENUH KHUSUS BUAT & JAWAB SOAL
// ==========================================
function setKelasModalFullscreen(isFull) {
    const dialogModal = document.getElementById('dialogModal');
    const dialogBox = document.getElementById('dialogModalBox');
    if (!dialogModal || !dialogBox) return;

    if (isFull) {
        if (typeof dialogAutoCloseTimer !== 'undefined' && dialogAutoCloseTimer) {
            clearTimeout(dialogAutoCloseTimer);
        }
        dialogModal.classList.remove('p-2', 'md:p-4');
        dialogModal.classList.add('p-0');

        dialogBox.classList.remove('max-w-md', 'max-h-[90dvh]', 'rounded-3xl', 'border-2');
        dialogBox.classList.add('max-w-none', 'w-screen', 'h-[100dvh]', 'max-h-[100dvh]', 'rounded-none', 'border-0');
    } else {
        dialogModal.classList.remove('p-0');
        dialogModal.classList.add('p-2', 'md:p-4');

        dialogBox.classList.remove('max-w-none', 'w-screen', 'h-[100dvh]', 'max-h-[100dvh]', 'rounded-none', 'border-0');
        dialogBox.classList.add('max-w-md', 'max-h-[90dvh]', 'rounded-3xl', 'border-2');
    }
}

// ==========================================
// KONFIGURASI, VISUAL & INTERAKSI KHUSUS LOKASI 3 (RUANG KELAS)
// ==========================================
const KELAS_CONFIG = {
    id: 3,
    name: "Lokasi : Ruang Kelas (Interior)",
    themeColor: "#22c55e",
    spawnPoint: { x: 110, y: 760 },
    buildings: [
        { 
            id: 'pintu_keluar', 
            name: 'Pintu Keluar', 
            icon: '🚪', 
            x: 10, 
            y: 710, 
            width: 80, 
            height: 140, 
            noBoxFill: true,
            isPortal: true, 
            targetLocation: 1, 
            dialogTitle: 'Keluar Gedung Kelas', 
            dialogText: 'Kembali ke Halaman Sekolah.', 
            actionLabel: 'Keluar Halaman' 
        },
        { 
            id: 'meja_guru', 
            name: 'Meja Guru', 
            icon: '👩‍🏫', 
            x: 1650, 
            y: 80, 
            width: 230, 
            height: 170, 
            noBoxFill: true,
            customKelasAction: 'papan_tugas', 
            dialogTitle: 'Meja Guru — Tugas & PR', 
            actionLabel: 'Buka Meja Guru' 
        },
        { 
            id: 'meja_belajar', 
            name: 'Area Meja Murid (Jawab PR)', 
            icon: '✍️', 
            x: 20, 
            y: 80, 
            width: 1300, 
            height: 560, 
            isSilentZone: true,
            customKelasAction: 'meja_belajar', 
            dialogTitle: 'Meja Belajar Murid', 
            actionLabel: 'Kerjakan Tugas' 
        }
    ]
};

if (typeof MAP_CONFIGS !== 'undefined') {
    MAP_CONFIGS[3] = KELAS_CONFIG;
}

// ==========================================
// 1. SPAWN & VISUAL INTERIOR RUANG KELAS
// ==========================================
function initKelasSpawn(playerObj) {
    if (!playerObj) return;
    playerObj.x = KELAS_CONFIG.spawnPoint.x;
    playerObj.y = KELAS_CONFIG.spawnPoint.y;
}

function drawKelasInterior(ctx, canvas, cameraX, cameraY, zoomScale) {
    if (typeof assetsLoaded !== 'undefined' && assetsLoaded.kelas_inside && ASSETS.kelas_inside) {
        ctx.drawImage(ASSETS.kelas_inside, -cameraX, -cameraY, MAP_WIDTH, MAP_HEIGHT);
    } else {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width / zoomScale, canvas.height / zoomScale);
    }
}

// Daftar role staf (bukan kelas siswa)
const STAFF_ROLES_EXCLUDED = ['admin', 'guru', 'tendik', 'ops', 'l', 'p', 'a'];

// Cek apakah role pengguna boleh membuat tugas (ADMIN, OPS, GURU, TENDIK)
function canCreateKelasTask() {
    const roleUpper = (typeof playerRole !== 'undefined' ? playerRole : "").toUpperCase().trim();
    const statusLower = (typeof currentUserAccount !== 'undefined' && currentUserAccount && currentUserAccount.status)
        ? currentUserAccount.status.toLowerCase().trim() : "";
    return (
        roleUpper === 'ADMIN' ||
        roleUpper === 'OPS' ||
        roleUpper === 'GURU' ||
        roleUpper === 'TENDIK' ||
        statusLower === 'admin' ||
        statusLower === 'full' ||
        (typeof isAdminUser !== 'undefined' && isAdminUser)
    );
}

// Ambil kelas siswa saat ini
function getStudentCurrentClass() {
    const roleStr = (typeof playerRole !== 'undefined' ? playerRole : "").trim();
    if (roleStr) return roleStr;
    if (typeof currentUserAccount !== 'undefined' && currentUserAccount && currentUserAccount.role) {
        return String(currentUserAccount.role).trim();
    }
    return "";
}

// Ambil daftar kelas unik dari sheet 'Login' (mengecualikan Guru, Tendik, Admin, OPS)
let cachedLoginClassList = [];
async function fetchUniqueClassesFromLogin() {
    if (cachedLoginClassList.length > 0) return cachedLoginClassList;
    const classSet = new Set();

    try {
        if (typeof getSheetCsvUrl === 'function') {
            const res = await fetch(getSheetCsvUrl('Login'));
            if (res.ok) {
                const csv = await res.text();
                const lines = csv.split('\n').map(l => l.trim()).filter(Boolean);
                for (let i = 1; i < lines.length; i++) {
                    const cols = lines[i].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
                    const roleVal = (cols[2] || "").trim();
                    if (roleVal && !STAFF_ROLES_EXCLUDED.includes(roleVal.toLowerCase())) {
                        classSet.add(roleVal);
                    }
                }
            }
        }
    } catch (e) {}

    if (classSet.size === 0 && KELAS_APPS_SCRIPT_URL && KELAS_APPS_SCRIPT_URL.startsWith('http')) {
        try {
            const res = await fetch(`${KELAS_APPS_SCRIPT_URL}?action=getClassList`);
            const json = await res.json();
            if (json && json.status === 'success' && Array.isArray(json.classes)) {
                json.classes.forEach(c => {
                    const clean = String(c || '').trim();
                    if (clean && !STAFF_ROLES_EXCLUDED.includes(clean.toLowerCase())) {
                        classSet.add(clean);
                    }
                });
            }
        } catch (e) {}
    }

    cachedLoginClassList = Array.from(classSet).sort();
    return cachedLoginClassList;
}

// ==========================================
// 2. PEMUAT LIBRARY PDF.JS & MAMMOTH (WORD) ON-DEMAND
// ==========================================
function loadExternalScript(url) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${url}"]`)) return resolve();
        const s = document.createElement('script');
        s.src = url;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
    });
}

async function extractTextFromUploadedDoc(file) {
    const fileName = file.name.toLowerCase();
    const arrayBuffer = await file.arrayBuffer();

    if (fileName.endsWith('.docx')) {
        await loadExternalScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js');
        const result = await window.mammoth.extractRawText({ arrayBuffer });
        return result.value || "";
    } else if (fileName.endsWith('.pdf')) {
        await loadExternalScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";
        for (let p = 1; p <= pdf.numPages; p++) {
            const page = await pdf.getPage(p);
            const content = await page.getTextContent();
            fullText += content.items.map(item => item.str).join(" ") + "\n";
        }
        return fullText;
    } else {
        return await file.text();
    }
}

function parseRawTextToSimulatedQuestions(rawText, docTitle) {
    const cleanLines = rawText
        .split(/\r?\n|\.\s+/)
        .map(l => l.trim())
        .filter(l => l.length >= 12);

    const generated = [];
    const numberedBlocks = rawText.split(/(?=\b[1-9][0-9]?[\.\)]\s)/g).filter(b => b.trim().length > 15);

    if (numberedBlocks.length >= 2) {
        numberedBlocks.slice(0, 10).forEach((block) => {
            const optMatch = block.match(/A[\.\)]\s*(.+?)\s+B[\.\)]\s*(.+?)\s+C[\.\)]\s*(.+?)(?:\s+D[\.\)]\s*(.+?))?(?:Kunci\s*:\s*([A-D]))?$/i);
            if (optMatch) {
                const qText = block.split(/A[\.\)]/i)[0].replace(/^[0-9]+[\.\)]\s*/, '').trim();
                const opts = [optMatch[1].trim(), optMatch[2].trim(), optMatch[3].trim()];
                if (optMatch[4]) opts.push(optMatch[4].trim());
                const keyMap = { A: 0, B: 1, C: 2, D: 3 };
                const ansIdx = optMatch[5] ? (keyMap[optMatch[5].toUpperCase()] || 0) : 0;
                generated.push({ question: qText, options: opts, answerIndex: ansIdx });
            }
        });
    }

    if (generated.length === 0) {
        const sampleSentences = cleanLines.slice(0, 5);
        if (sampleSentences.length === 0) {
            generated.push({
                question: `Simulasi Tugas (${docTitle}): Apakah Anda sudah membaca dan memahami instruksi tugas yang diunggah guru?`,
                options: ["Ya, sudah paham dan siap mengerjakan", "Belum membaca sama sekali", "Masih bingung sebagian"],
                answerIndex: 0
            });
        } else {
            sampleSentences.forEach((sentence, idx) => {
                const words = sentence.split(/\s+/).filter(w => w.length > 4);
                const targetWord = words[Math.floor(words.length / 2)] || "materi";
                const cleanTarget = targetWord.replace(/[^a-zA-Z0-9\u00C0-\u024F]/g, '');
                const maskedSentence = sentence.replace(targetWord, "________");

                const distractors = ["Pendidikan", "Sekolah", "Belajar", "Kegiatan", "Latihan", "Pengetahuan"]
                    .filter(d => d.toLowerCase() !== cleanTarget.toLowerCase())
                    .sort(() => Math.random() - 0.5)
                    .slice(0, 2);

                const options = [cleanTarget, ...distractors].sort(() => Math.random() - 0.5);
                generated.push({
                    question: `Soal Simulasi #${idx + 1} (Dari Dokumen): Lengkapi bagian rumpang berikut: "${maskedSentence}"`,
                    options: options,
                    answerIndex: options.indexOf(cleanTarget)
                });
            });
        }
    }

    return generated;
}

// ==========================================
// 3. KONTROL INTERAKSI UTAMA DI RUANG KELAS
// ==========================================
let draftKelasQuestions = [];
let activeStudentQuiz = null;
let studentQuizStep = 0;
let studentQuizScore = 0;

function handleKelasInteraction(building) {
    if (!building) return false;
    if (building.isPortal || building.targetUrl) return false;

    if (building.customKelasAction === 'papan_tugas') {
        if (canCreateKelasTask()) {
            openTeacherTaskMenu();
        } else {
            openStudentTaskListModal("Meja Guru — Tugas PR");
        }
        return true;
    }

    if (building.customKelasAction === 'meja_belajar') {
        openStudentTaskListModal("Meja Murid — Jawab Tugas PR");
        return true;
    }

    return false;
}

// ==========================================
// 4. PANEL GURU / TENDIK / ADMIN / OPS (BUAT & KELOLA TUGAS — FULLSCREEN)
// ==========================================
function openTeacherTaskMenu() {
    draftKelasQuestions = [];
    setKelasModalFullscreen(true);

    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    const modalActions = document.getElementById('modalActions');

    modalTitle.innerHTML = `👩‍🏫 Meja Guru (${playerRole})`;
    modalContent.innerHTML = `
        <div class="max-w-3xl mx-auto w-full text-left space-y-3 pb-4">
            <div class="flex gap-2 mb-2">
                <button type="button" onclick="renderCreateTaskForm()" class="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow">
                    ➕ Buat Tugas Baru
                </button>
                <button type="button" onclick="openStudentTaskListModal('Daftar Semua Tugas PR')" class="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-yellow-300 font-bold rounded-xl text-xs shadow">
                    📂 Lihat Semua Tugas PR
                </button>
            </div>
            <div id="teacherPanelBody"></div>
        </div>
    `;
    modalActions.innerHTML = `
        <div class="max-w-3xl mx-auto w-full flex justify-end">
            <button type="button" onclick="closeModal()" class="px-5 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl text-xs transition">Tutup</button>
        </div>
    `;
    document.getElementById('dialogModal').classList.remove('hidden');

    renderCreateTaskForm();
}

window.toggleUseClassCodeInput = function() {
    const chk = document.getElementById('useClassCodeCheckbox');
    const wrap = document.getElementById('classCodeInputWrapper');
    if (!chk || !wrap) return;
    if (chk.checked) {
        wrap.classList.remove('hidden');
    } else {
        wrap.classList.add('hidden');
    }
};

async function renderCreateTaskForm() {
    setKelasModalFullscreen(true);
    const body = document.getElementById('teacherPanelBody');
    if (!body) return;

    body.innerHTML = `<div class="text-center text-xs text-slate-400 py-6">Memuat daftar kelas dari sheet Login...</div>`;
    const classList = await fetchUniqueClassesFromLogin();

    const classOptionsHTML = [
        `<option value="Semua Kelas">Semua Kelas</option>`,
        ...classList.map(cls => `<option value="${cls}">${cls}</option>`)
    ].join('');

    body.innerHTML = `
        <div class="bg-slate-800/90 border border-slate-700 p-3.5 md:p-4 rounded-2xl space-y-3">
            <p class="text-[11px] font-bold text-yellow-400 uppercase tracking-wider">1. Identitas Tugas & Hadiah Tiket</p>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                    <label class="block text-[10px] text-slate-300 font-bold mb-1">Judul PR *</label>
                    <input type="text" id="taskJudulInput" placeholder="Contoh: PJOK" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-600 text-white text-xs font-bold focus:border-yellow-400 focus:outline-none">
                </div>
                <div>
                    <label class="block text-[10px] text-slate-300 font-bold mb-1">Pilih Kelas (Dari Sheet Login) *</label>
                    <select id="taskKelasInput" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-600 text-white text-xs font-bold focus:border-yellow-400 focus:outline-none">
                        ${classOptionsHTML}
                    </select>
                </div>
                <div>
                    <label class="block text-[10px] text-slate-300 font-bold mb-1">🎟️ Hadiah Tiket (Nilai 100, Max 5) *</label>
                    <select id="taskRewardTicketsInput" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-600 text-sky-300 text-xs font-extrabold focus:border-sky-400 focus:outline-none">
                        <option value="1">1 Tiket</option>
                        <option value="2">2 Tiket</option>
                        <option value="3" selected>3 Tiket</option>
                        <option value="4">4 Tiket</option>
                        <option value="5">5 Tiket (Maksimal)</option>
                    </select>
                </div>
            </div>

            <div>
                <label class="block text-[10px] text-slate-300 font-bold mb-1">Keterangan (Opsional)</label>
                <textarea id="taskKetInput" rows="2" placeholder="Tuliskan petunjuk atau keterangan tambahan jika perlu (boleh dikosongkan)..." class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-600 text-white text-xs focus:border-yellow-400 focus:outline-none"></textarea>
            </div>

            <div class="bg-slate-900/80 border border-slate-700 p-3 rounded-xl space-y-2">
                <label class="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" id="useClassCodeCheckbox" onchange="toggleUseClassCodeInput()" class="w-4 h-4 accent-amber-400 rounded cursor-pointer">
                    <span class="text-xs font-bold text-amber-300">🔒 Pakai Kode Kelas (Siswa wajib memasukkan kode sebelum menjawab)</span>
                </label>
                <div id="classCodeInputWrapper" class="hidden pt-1">
                    <label class="block text-[10px] text-slate-300 font-bold mb-1">Masukkan Kode Kelas *</label>
                    <input type="text" id="taskKodeInput" placeholder="Contoh: PJOK3A atau 12345" class="w-full px-3 py-2 rounded-xl bg-slate-950 border border-amber-500/60 text-amber-200 text-xs font-extrabold uppercase tracking-wider focus:border-amber-400 focus:outline-none">
                </div>
            </div>

            <hr class="border-slate-700 my-1">
            <p class="text-[11px] font-bold text-sky-400 uppercase tracking-wider">2. Buat Soal atau Upload Word / PDF</p>

            <div class="bg-slate-900/90 border border-dashed border-sky-500/60 p-3 rounded-xl">
                <label class="block text-[10px] font-bold text-sky-300 mb-1">📄 Upload File Word (.docx) atau PDF (.pdf):</label>
                <input type="file" id="taskFileUpload" accept=".docx,.pdf,.txt" onchange="handleTaskDocUpload(event)" class="w-full text-[11px] text-slate-300 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-sky-500 file:text-slate-950 hover:file:bg-sky-400 cursor-pointer">
                <p id="uploadDocStatus" class="text-[10px] text-slate-400 mt-1">Otomatis diubah menjadi simulasi soal pilihan ganda untuk dijawab murid.</p>
            </div>

            <div class="bg-slate-900/80 p-3 rounded-xl border border-slate-700 space-y-2">
                <label class="block text-[10px] font-bold text-emerald-300">✍️ Atau Tambah Soal Manual:</label>
                <input type="text" id="manualQText" placeholder="Tulis pertanyaan soal..." class="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white text-xs">
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input type="text" id="manualOptA" placeholder="Pilihan A (Jawaban Benar)" class="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-emerald-600/60 text-white text-xs">
                    <input type="text" id="manualOptB" placeholder="Pilihan B" class="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-600 text-white text-xs">
                    <input type="text" id="manualOptC" placeholder="Pilihan C" class="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-600 text-white text-xs">
                </div>
                <button type="button" onclick="addManualQuestionToDraft()" class="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg text-xs">
                    + Tambahkan ke Daftar Soal
                </button>
            </div>

            <div id="draftQuestionsPreview" class="text-[11px] text-slate-300 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                Belum ada soal ditambahkan (0 soal).
            </div>

            <button type="button" onclick="publishKelasTask()" class="w-full py-2.5 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-extrabold rounded-xl text-xs shadow-lg transition active:scale-95">
                💾 Simpan ke Spreadsheet & Kirim ke Murid
            </button>
        </div>
    `;
}

window.handleTaskDocUpload = async function(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const statusEl = document.getElementById('uploadDocStatus');
    if (statusEl) {
        statusEl.className = "text-[10px] text-yellow-300 mt-1 font-bold";
        statusEl.innerText = `⏳ Membaca "${file.name}" dan membuat simulasi soal...`;
    }

    try {
        const extractedText = await extractTextFromUploadedDoc(file);
        const simulated = parseRawTextToSimulatedQuestions(extractedText, file.name);
        draftKelasQuestions = draftKelasQuestions.concat(simulated);

        if (statusEl) {
            statusEl.className = "text-[10px] text-emerald-400 mt-1 font-bold";
            statusEl.innerText = `✅ Berhasil membuat ${simulated.length} simulasi soal dari "${file.name}"!`;
        }
        updateDraftQuestionsPreview();
    } catch (err) {
        console.error(err);
        if (statusEl) {
            statusEl.className = "text-[10px] text-red-400 mt-1 font-bold";
            statusEl.innerText = `❌ Gagal membaca file. Pastikan format .docx atau .pdf valid.`;
        }
    }
};

window.addManualQuestionToDraft = function() {
    const q = document.getElementById('manualQText').value.trim();
    const a = document.getElementById('manualOptA').value.trim();
    const b = document.getElementById('manualOptB').value.trim();
    const c = document.getElementById('manualOptC').value.trim();

    if (!q || !a || !b) {
        alert("Isi minimal pertanyaan, Pilihan A (jawaban benar), dan Pilihan B.");
        return;
    }

    const opts = c ? [a, b, c] : [a, b];
    const shuffled = [...opts].sort(() => Math.random() - 0.5);

    draftKelasQuestions.push({
        question: q,
        options: shuffled,
        answerIndex: shuffled.indexOf(a)
    });

    document.getElementById('manualQText').value = "";
    document.getElementById('manualOptA').value = "";
    document.getElementById('manualOptB').value = "";
    document.getElementById('manualOptC').value = "";
    updateDraftQuestionsPreview();
};

function updateDraftQuestionsPreview() {
    const box = document.getElementById('draftQuestionsPreview');
    if (!box) return;
    if (draftKelasQuestions.length === 0) {
        box.innerHTML = "Belum ada soal ditambahkan (0 soal).";
        return;
    }
    box.innerHTML = `<div class="font-bold text-emerald-400 mb-1">Daftar Soal Siap Kirim (${draftKelasQuestions.length} Soal):</div>` +
        draftKelasQuestions.map((item, idx) => `<div class="truncate text-[10px] text-slate-300">${idx + 1}. ${item.question}</div>`).join("");
}

// ==========================================
// SIMPAN TUGAS KE APPS SCRIPT (kelasTasks)
// ==========================================
window.publishKelasTask = async function() {
    const judul = document.getElementById('taskJudulInput').value.trim();
    const kelas = document.getElementById('taskKelasInput').value.trim();
    const keterangan = document.getElementById('taskKetInput').value.trim(); // Opsional
    const useCode = document.getElementById('useClassCodeCheckbox')?.checked || false;
    const kodeKelas = useCode ? (document.getElementById('taskKodeInput')?.value.trim() || "") : "";
    const rawTickets = parseInt(document.getElementById('taskRewardTicketsInput').value, 10) || 1;
    const rewardTickets = Math.min(5, Math.max(1, rawTickets));

    if (!judul) {
        alert("Harap isi Judul PR terlebih dahulu (misal: PJOK)!");
        return;
    }
    if (useCode && !kodeKelas) {
        alert("Anda mencentang 'Pakai Kode Kelas'. Silakan masukkan kode kelasnya terlebih dahulu!");
        return;
    }
    if (draftKelasQuestions.length === 0) {
        alert("Tambahkan minimal 1 soal (atau upload file Word/PDF) sebelum menyimpan!");
        return;
    }

    const modalContent = document.getElementById('modalContent');
    if (modalContent) {
        modalContent.innerHTML = `
            <div class="flex flex-col items-center justify-center p-4">
                <img src="assets/loading.gif" alt="Loading..." class="w-8 h-8 mb-2" />
                <span class="text-xs text-slate-300">Menyimpan tugas ke Google Spreadsheet...</span>
            </div>
        `;
    }

    const taskId = 'TGS_' + Date.now();
    const taskPayload = {
        action: 'addTask',
        id: taskId,
        judul: judul,
        kode: kodeKelas, // Kosong jika tidak pakai kode kelas
        kelas: kelas,
        keterangan: keterangan,
        rewardTickets: rewardTickets,
        questions: draftKelasQuestions,
        soalText: draftKelasQuestions.map((q, i) => `${i + 1}. ${q.question} [Kunci: ${q.options[q.answerIndex]}]`).join(" | "),
        pembuat: playerCustomName || playerRole,
        createdAt: Date.now()
    };

    try {
        await fetch(KELAS_APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(taskPayload)
        });
    } catch (err) {
        console.warn("Gagal kirim ke Apps Script kelasTasks:", err);
    }

    if (typeof window.sendFirebaseChat === 'function') {
        const codeInfo = kodeKelas ? " (Memakai Kode Kelas)" : "";
        window.sendFirebaseChat("Ruang Kelas", `📚 ${playerCustomName} baru saja membagikan PR "${judul}" untuk ${kelas}${codeInfo} (Hadiah ${rewardTickets} 🎟️ untuk nilai 100)!`);
    }

    setKelasModalFullscreen(false);
    if (modalContent) {
        modalContent.innerHTML = `
            <div class="p-4 bg-emerald-950/90 border border-emerald-500 rounded-2xl text-center space-y-2">
                <div class="text-3xl">✅</div>
                <h4 class="font-extrabold text-emerald-300 text-sm">PR "${judul}" Berhasil Disimpan!</h4>
                <p class="text-xs text-slate-200">Kelas: <strong>${kelas}</strong> • Hadiah: <strong class="text-sky-300">${rewardTickets} 🎟️</strong> (Nilai 100)</p>
                ${kodeKelas ? `<p class="text-xs text-amber-300 font-bold">🔒 Kode Kelas: <span class="px-2 py-0.5 bg-slate-900 rounded border border-amber-500/50">${kodeKelas}</span></p>` : ''}
                <p class="text-[11px] text-slate-300">Murid kelas ${kelas} sekarang bisa menekan <strong>AKSI</strong> di area meja murid untuk menjawab soal (1x kesempatan).</p>
            </div>
        `;
    }
};

// ==========================================
// 5. PANEL MURID (FILTER KELAS, VALIDASI KODE KELAS, 1x JAWAB, NILAI 100 = TIKET)
// ==========================================
async function openStudentTaskListModal(headerTitle) {
    setKelasModalFullscreen(false);
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    const modalActions = document.getElementById('modalActions');

    const isStaff = canCreateKelasTask();
    const myClass = getStudentCurrentClass();

    modalTitle.innerHTML = `✍️ ${headerTitle || (isStaff ? 'Semua Tugas PR' : `Tugas PR Kelas ${myClass}`)}`;
    modalContent.innerHTML = `
        <div class="flex flex-col items-center justify-center p-4">
            <img src="assets/loading.gif" alt="Loading..." class="w-8 h-8 mb-2" />
            <span class="text-xs text-slate-300">Mengambil daftar tugas PR dari guru...</span>
        </div>
    `;
    modalActions.innerHTML = `<button type="button" onclick="closeModal()" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl text-xs transition">Tutup</button>`;
    document.getElementById('dialogModal').classList.remove('hidden');

    if (!KELAS_APPS_SCRIPT_URL || !KELAS_APPS_SCRIPT_URL.startsWith('http')) {
        modalContent.innerHTML = `<div class="text-xs text-red-400 text-center p-3">URL Apps Script belum diatur di kelas.js / game.js.</div>`;
        return;
    }

    try {
        const res = await fetch(`${KELAS_APPS_SCRIPT_URL}?action=getTasks&player=${encodeURIComponent(playerCustomName || '')}&t=${Date.now()}`);
        const data = await res.json();
        const allTasks = (data.tasks || []).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        // Guru / Tendik / Admin melihat SEMUA PR; Siswa hanya melihat PR kelasnya (atau "Semua Kelas")
        const taskList = allTasks.filter(t => {
            if (isStaff) return true;
            const targetKls = String(t.kelas || '').trim().toLowerCase();
            if (!targetKls || targetKls === 'semua' || targetKls === 'semua kelas') return true;
            return targetKls === myClass.toLowerCase();
        });

        if (taskList.length === 0) {
            modalContent.innerHTML = `<div class="text-center text-xs text-slate-400 p-4 bg-slate-800/70 rounded-xl">Belum ada tugas PR untuk kelas ${myClass || 'kamu'} saat ini.</div>`;
            return;
        }

        const localDoneMap = JSON.parse(sessionStorage.getItem('kelasDoneMap_' + (playerCustomName || '')) || '{}');
        window._cachedKelasTasks = taskList;

        let html = `
            <div class="mb-2 px-3 py-2 rounded-xl bg-sky-950/80 border border-sky-500/40 text-[11px] text-sky-200 text-left">
                ℹ️ Setiap siswa hanya bisa menjawab <strong>1x</strong> per PR. Hanya <strong>Nilai 100</strong> yang mendapat <strong>🎟️ Tiket</strong>!
            </div>
            <div class="flex flex-col gap-2.5 max-h-64 overflow-y-auto text-left pr-1">
        `;

        taskList.forEach((t, idx) => {
            const qCount = (t.questions && t.questions.length) ? t.questions.length : 0;
            const taskKey = String(t.id || idx);
            const doneRecord = t.alreadySubmitted ? t.submissionResult : localDoneMap[taskKey];
            const isAlreadyDone = Boolean(doneRecord);
            const rewardTix = Math.min(5, Math.max(1, parseInt(t.rewardTickets || 1, 10) || 1));
            const hasLockCode = Boolean(String(t.kode || '').trim());
            const displayJudul = t.judul || t.keterangan || 'Tugas PR';
            const displayKet = (t.judul && t.keterangan) ? t.keterangan : '';

            const deleteBtn = isStaff
                ? `<button type="button" onclick="deleteKelasTask('${t.id}')" class="px-2 py-1 bg-red-600/80 hover:bg-red-600 text-white rounded-lg text-[10px] font-bold">Hapus</button>`
                : '';

            const actionBtn = isAlreadyDone
                ? `<span class="px-2.5 py-1 bg-emerald-950 border border-emerald-500/50 text-emerald-300 font-extrabold rounded-xl text-[10px]">
                       ✅ Selesai (Nilai: ${doneRecord.nilai ?? 0} | +${doneRecord.tiket ?? 0} 🎟️)
                   </span>`
                : `<button type="button" onclick="startStudentQuiz(${idx})" class="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-xl text-xs shadow active:scale-95">
                       ${hasLockCode ? '🔒 ' : ''}Jawab Tugas ➡️
                   </button>`;

            html += `
                <div class="p-3 bg-slate-800 border ${isAlreadyDone ? 'border-emerald-500/40' : 'border-slate-700'} rounded-2xl space-y-1.5">
                    <div class="flex items-center justify-between gap-2">
                        <div class="flex items-center gap-1.5 flex-wrap">
                            <span class="px-2 py-0.5 bg-yellow-400/20 border border-yellow-400/50 text-yellow-300 rounded-md text-[10px] font-extrabold">${t.kelas || 'Semua Kelas'}</span>
                            ${hasLockCode ? `<span class="px-2 py-0.5 bg-amber-500/20 border border-amber-400/40 text-amber-300 rounded-md text-[10px] font-bold">🔒 Pakai Kode${isStaff ? `: ${t.kode}` : ''}</span>` : ''}
                        </div>
                        <span class="text-[10px] font-bold text-sky-300">🎟️ +${rewardTix} Tiket (Nilai 100) • ${qCount} Soal</span>
                    </div>
                    <div class="text-xs md:text-sm text-white font-extrabold">${displayJudul}</div>
                    ${displayKet ? `<p class="text-[11px] text-slate-300">${displayKet}</p>` : ''}
                    <div class="flex items-center justify-between pt-1 gap-2">
                        <span class="text-[10px] text-slate-400">Guru: ${t.pembuat || 'Guru'}</span>
                        <div class="flex items-center gap-1.5">
                            ${deleteBtn}
                            ${actionBtn}
                        </div>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
        modalContent.innerHTML = html;
    } catch (err) {
        console.error(err);
        modalContent.innerHTML = `<div class="text-xs text-red-400 text-center p-3">Gagal memuat daftar tugas dari Spreadsheet.</div>`;
    }
}

window.deleteKelasTask = async function(taskId) {
    if (!canCreateKelasTask() || !KELAS_APPS_SCRIPT_URL) return;
    const modalContent = document.getElementById('modalContent');
    if (modalContent) {
        modalContent.innerHTML = `<div class="text-center text-xs text-slate-300 p-4">Menghapus tugas...</div>`;
    }

    try {
        await fetch(KELAS_APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'deleteTask', id: taskId })
        });
    } catch (err) {
        console.warn("Gagal hapus tugas:", err);
    }

    setTimeout(() => {
        openStudentTaskListModal("Daftar Semua Tugas PR");
    }, 800);
};

// ==========================================
// VERIFIKASI KODE KELAS (JIKA PR MEMAKAI KODE) & MULAI KUIS
// ==========================================
let studentAnswerHistory = [];

window.startStudentQuiz = function(taskIndex) {
    const task = window._cachedKelasTasks && window._cachedKelasTasks[taskIndex];
    if (!task || !task.questions || task.questions.length === 0) return;

    const taskKey = String(task.id || taskIndex);
    const localDoneMap = JSON.parse(sessionStorage.getItem('kelasDoneMap_' + (playerCustomName || '')) || '{}');
    if (task.alreadySubmitted || localDoneMap[taskKey]) {
        alert("Kamu sudah pernah mengerjakan PR ini (maksimal 1x per siswa).");
        return;
    }

    const requiredCode = String(task.kode || '').trim();
    if (requiredCode) {
        renderClassCodePrompt(taskIndex, task);
        return;
    }

    launchStudentQuizQuestions(taskIndex, task);
};

function renderClassCodePrompt(taskIndex, task) {
    setKelasModalFullscreen(false);
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    const modalActions = document.getElementById('modalActions');

    const displayJudul = task.judul || task.keterangan || 'Tugas PR';

    modalTitle.innerHTML = `🔒 Masukkan Kode Kelas`;
    modalContent.innerHTML = `
        <div class="p-4 bg-slate-800/95 border border-amber-500/50 rounded-2xl text-center space-y-3">
            <div class="text-3xl">🔐</div>
            <div class="text-sm font-extrabold text-white">${displayJudul} (${task.kelas || ''})</div>
            <p class="text-xs text-slate-300">PR ini dilindungi kode kelas. Masukkan kode yang diberikan oleh Guru untuk mulai menjawab soal:</p>
            <input type="text" id="studentEnterClassCodeInput" placeholder="Ketik kode kelas di sini..."
                onkeydown="if(event.key==='Enter') verifyStudentClassCode(${taskIndex})"
                class="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-600 focus:border-amber-400 text-center text-amber-300 font-extrabold text-sm uppercase tracking-widest focus:outline-none">
            <div id="classCodeErrorMsg" class="hidden text-[11px] font-bold text-rose-400"></div>
            <button type="button" onclick="verifyStudentClassCode(${taskIndex})"
                class="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs shadow">
                Buka Soal PR ➡️
            </button>
        </div>
    `;
    modalActions.innerHTML = `
        <button type="button" onclick="openStudentTaskListModal('Tugas PR Kelas')" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl text-xs transition">Kembali</button>
    `;

    setTimeout(() => {
        const inp = document.getElementById('studentEnterClassCodeInput');
        if (inp) inp.focus();
    }, 80);
}

window.verifyStudentClassCode = function(taskIndex) {
    const task = window._cachedKelasTasks && window._cachedKelasTasks[taskIndex];
    if (!task) return;

    const inp = document.getElementById('studentEnterClassCodeInput');
    const errEl = document.getElementById('classCodeErrorMsg');
    const entered = (inp ? inp.value : '').trim().toLowerCase();
    const expected = String(task.kode || '').trim().toLowerCase();

    if (!entered) {
        if (errEl) {
            errEl.innerText = "Harap masukkan kode kelas terlebih dahulu!";
            errEl.classList.remove('hidden');
        }
        return;
    }

    if (entered !== expected) {
        if (errEl) {
            errEl.innerText = "❌ Kode kelas salah! Periksa kembali kode dari gurumu.";
            errEl.classList.remove('hidden');
        }
        return;
    }

    launchStudentQuizQuestions(taskIndex, task);
};

function launchStudentQuizQuestions(taskIndex, task) {
    const taskKey = String(task.id || taskIndex);
    activeStudentQuiz = task;
    activeStudentQuiz._taskKey = taskKey;
    studentQuizStep = 0;
    studentQuizScore = 0;
    studentAnswerHistory = [];
    setKelasModalFullscreen(true);
    renderStudentQuizQuestion();
}

function renderStudentQuizQuestion() {
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    const modalActions = document.getElementById('modalActions');
    const q = activeStudentQuiz.questions[studentQuizStep];
    const total = activeStudentQuiz.questions.length;
    const displayJudul = activeStudentQuiz.judul || activeStudentQuiz.keterangan || 'Tugas Kelas';

    modalTitle.innerHTML = `📝 ${displayJudul} (${activeStudentQuiz.kelas || ''}) — Soal ${studentQuizStep + 1} dari ${total}`;

    let optionsHtml = q.options.map((opt, idx) => `
        <button type="button" onclick="submitStudentQuizAnswer(${idx})" class="w-full text-left p-3.5 bg-slate-800 hover:bg-sky-900/70 border border-slate-600 hover:border-sky-400 rounded-2xl text-xs md:text-sm text-white font-semibold transition active:scale-95 flex items-center gap-3">
            <span class="w-7 h-7 rounded-xl bg-slate-700 text-yellow-300 font-extrabold text-xs flex items-center justify-center shrink-0">${String.fromCharCode(65 + idx)}</span>
            <span>${opt}</span>
        </button>
    `).join("");

    modalContent.innerHTML = `
        <div class="max-w-3xl mx-auto w-full text-left space-y-4 py-2">
            <div class="p-4 md:p-5 bg-slate-800/95 border border-slate-700 rounded-2xl text-sm md:text-base font-bold text-yellow-300 leading-relaxed">
                ${q.question}
            </div>
            <div class="space-y-2.5">
                ${optionsHtml}
            </div>
        </div>
    `;

    if (modalActions) {
        modalActions.innerHTML = `
            <div class="max-w-3xl mx-auto w-full flex justify-between items-center">
                <span class="text-[11px] text-slate-400 font-semibold">${activeStudentQuiz.keterangan || ''}</span>
                <button type="button" onclick="openStudentTaskListModal('Tugas PR Kelas')" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl text-xs transition">Batal</button>
            </div>
        `;
    }
}

window.submitStudentQuizAnswer = function(selectedIdx) {
    const q = activeStudentQuiz.questions[studentQuizStep];
    const isCorrect = (selectedIdx === q.answerIndex);
    if (isCorrect) {
        studentQuizScore++;
    }
    studentAnswerHistory.push(`${studentQuizStep + 1}:${String.fromCharCode(65 + selectedIdx)}(${isCorrect ? 'Benar' : 'Salah'})`);

    if (studentQuizStep < activeStudentQuiz.questions.length - 1) {
        studentQuizStep++;
        renderStudentQuizQuestion();
    } else {
        finishStudentQuiz();
    }
};

// ==========================================
// SIMPAN NILAI & TIKET SISWA KE APPS SCRIPT (kelasSubmissions)
// ==========================================
function finishStudentQuiz() {
    const total = activeStudentQuiz.questions.length;
    const nilaiAkhir = Math.round((studentQuizScore / total) * 100);
    const maxTiket = Math.min(5, Math.max(1, parseInt(activeStudentQuiz.rewardTickets || 1, 10) || 1));
    const rewardTiket = (nilaiAkhir === 100) ? maxTiket : 0;

    if (typeof playerTickets !== 'undefined' && rewardTiket > 0) {
        playerTickets += rewardTiket;
        if (typeof currentUserAccount !== 'undefined' && currentUserAccount) {
            currentUserAccount.tickets = playerTickets;
            sessionStorage.setItem('activeUserSession', JSON.stringify(currentUserAccount));
        }
        if (typeof updatePointsDisplay === 'function') {
            updatePointsDisplay();
        }
    }

    const storageKey = 'kelasDoneMap_' + (playerCustomName || '');
    const localDoneMap = JSON.parse(sessionStorage.getItem(storageKey) || '{}');
    localDoneMap[activeStudentQuiz._taskKey] = { nilai: nilaiAkhir, tiket: rewardTiket };
    sessionStorage.setItem(storageKey, JSON.stringify(localDoneMap));
    activeStudentQuiz.alreadySubmitted = true;
    activeStudentQuiz.submissionResult = { nilai: nilaiAkhir, tiket: rewardTiket };

    if (KELAS_APPS_SCRIPT_URL && KELAS_APPS_SCRIPT_URL.startsWith('http')) {
        fetch(KELAS_APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
                action: 'addSubmission',
                taskId: activeStudentQuiz.id || activeStudentQuiz._taskKey,
                judul: activeStudentQuiz.judul || activeStudentQuiz.keterangan || 'Tugas PR',
                kode: activeStudentQuiz.kode || '',
                kelas: activeStudentQuiz.kelas || getStudentCurrentClass(),
                keterangan: activeStudentQuiz.keterangan || '',
                siswa: playerCustomName || 'Siswa',
                benar: studentQuizScore,
                totalSoal: total,
                nilai: nilaiAkhir,
                rewardTickets: maxTiket,
                rincianJawaban: studentAnswerHistory.join(', '),
                timestamp: Date.now()
            })
        }).catch(err => console.warn("Gagal kirim nilai ke Apps Script:", err));
    }

    setKelasModalFullscreen(false);
    const modalContent = document.getElementById('modalContent');
    const modalActions = document.getElementById('modalActions');
    const displayJudul = activeStudentQuiz.judul || activeStudentQuiz.keterangan || 'Tugas PR';

    modalContent.innerHTML = `
        <div class="p-4 bg-slate-800 border-2 ${nilaiAkhir === 100 ? 'border-emerald-400' : 'border-amber-400'} rounded-2xl text-center space-y-2">
            <div class="text-4xl">${nilaiAkhir === 100 ? '🏆' : '📝'}</div>
            <h4 class="font-extrabold text-yellow-400 text-base">PR "${displayJudul}" Selesai!</h4>
            <p class="text-xs text-slate-300">${activeStudentQuiz.kelas || ''}</p>
            <div class="bg-slate-900 p-3 rounded-xl border border-slate-700 my-2">
                <div class="text-xs text-slate-400">Nilai Kamu</div>
                <div class="text-2xl font-black ${nilaiAkhir === 100 ? 'text-emerald-400' : 'text-amber-300'}">${nilaiAkhir}</div>
                <div class="text-[11px] text-slate-300 mt-1">Benar ${studentQuizScore} dari ${total} soal</div>
                <div class="text-[11px] font-extrabold mt-1.5 ${rewardTiket > 0 ? 'text-sky-400' : 'text-slate-400'}">
                    ${rewardTiket > 0
                        ? `🎉 Nilai 100! Kamu mendapat +${rewardTiket} 🎟️ Tiket!`
                        : `Belum mendapat tiket (Wajib Nilai 100 untuk mendapat ${maxTiket} 🎟️ Tiket).`}
                </div>
            </div>
        </div>
    `;

    if (modalActions) {
        modalActions.innerHTML = `<button type="button" onclick="closeModal()" class="px-5 py-2 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-bold rounded-xl text-xs transition">Selesai</button>`;
    }
}
