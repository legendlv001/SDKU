// ==========================================
// LINK GOOGLE APPS SCRIPT (LETAKKAN PALING ATAS)
// ==========================================
const KELAS_APPS_SCRIPT_URL = (typeof APPS_SCRIPT_URL !== 'undefined' && APPS_SCRIPT_URL && APPS_SCRIPT_URL.startsWith('http'))
    ? APPS_SCRIPT_URL
    : "https://script.google.com/macros/s/AKfycbzBKy8cGnC8qB6ZbQMHWErXThSM34HiiAaKmcWi2h107dh_7mhrKWA7bONvnGUFvTft/exec";

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
            // Tepat di posisi tulisan EXIT merah di dinding kiri gambar
            x: 10, 
            y: 710, 
            width: 80, 
            height: 140, 
            noBoxFill: true, // Transparan agar tulisan EXIT di gambar terlihat
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
            // Tepat di atas meja kuning pojok kanan atas gambar (pusat di X: 1765, Y: 165)
            x: 1650, 
            y: 80, 
            width: 230, 
            height: 170, 
            noBoxFill: true, // Tanpa kotak blok warna agar meja kuning di gambar terlihat
            customKelasAction: 'papan_tugas', 
            dialogTitle: 'Meja Guru — Tugas & PR', 
            actionLabel: 'Buka Meja Guru' 
        },
        { 
            id: 'meja_belajar', 
            name: 'Area Meja Murid (Jawab PR)', 
            icon: '✍️', 
            // Mencakup seluruh 4 kolom deretan meja biru murid di gambar
            x: 20, 
            y: 80, 
            width: 1300, 
            height: 560, 
            isSilentZone: true, // Area luas transparan tanpa kotak/label
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

// Cek apakah role pengguna boleh membuat tugas (ADMIN, OPS, GURU)
function canCreateKelasTask() {
    const roleUpper = (typeof playerRole !== 'undefined' ? playerRole : "").toUpperCase().trim();
    const statusLower = (typeof currentUserAccount !== 'undefined' && currentUserAccount && currentUserAccount.status)
        ? currentUserAccount.status.toLowerCase().trim() : "";
    return (
        roleUpper === 'ADMIN' ||
        roleUpper === 'OPS' ||
        roleUpper === 'GURU' ||
        statusLower === 'admin' ||
        statusLower === 'full' ||
        (typeof isAdminUser !== 'undefined' && isAdminUser)
    );
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
// 4. PANEL GURU / ADMIN / OPS (BUAT & KELOLA TUGAS)
// ==========================================
function openTeacherTaskMenu() {
    draftKelasQuestions = [];
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    const modalActions = document.getElementById('modalActions');

    modalTitle.innerHTML = `👩‍🏫 Meja Guru (${playerRole})`;
    modalContent.innerHTML = `
        <div class="text-left space-y-2.5 max-h-[65vh] overflow-y-auto pr-1">
            <div class="flex gap-2 mb-2">
                <button onclick="renderCreateTaskForm()" class="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow">
                    ➕ Buat Tugas Baru
                </button>
                <button onclick="openStudentTaskListModal('Daftar Tugas Aktif')" class="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-yellow-300 font-bold rounded-xl text-xs shadow">
                    📂 Lihat Tugas Aktif
                </button>
            </div>
            <div id="teacherPanelBody"></div>
        </div>
    `;
    modalActions.innerHTML = `<button onclick="closeModal()" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl text-xs transition">Tutup</button>`;
    document.getElementById('dialogModal').classList.remove('hidden');

    renderCreateTaskForm();
}

function renderCreateTaskForm() {
    const body = document.getElementById('teacherPanelBody');
    if (!body) return;

    body.innerHTML = `
        <div class="bg-slate-800/90 border border-slate-700 p-3 rounded-2xl space-y-2.5">
            <p class="text-[11px] font-bold text-yellow-400 uppercase tracking-wider">1. Identitas Tugas (Tersimpan ke Sheet kelasTasks)</p>
            <div class="grid grid-cols-2 gap-2">
                <div>
                    <label class="block text-[10px] text-slate-300 font-bold mb-1">Kode Tugas *</label>
                    <input type="text" id="taskKodeInput" placeholder="Misal: PR-MTK-01" class="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-600 text-white text-xs font-bold focus:border-yellow-400 focus:outline-none">
                </div>
                <div>
                    <label class="block text-[10px] text-slate-300 font-bold mb-1">Kelas *</label>
                    <input type="text" id="taskKelasInput" placeholder="Misal: Kelas 4A" class="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-600 text-white text-xs font-bold focus:border-yellow-400 focus:outline-none">
                </div>
            </div>
            <div>
                <label class="block text-[10px] text-slate-300 font-bold mb-1">Keterangan / Petunjuk PR *</label>
                <textarea id="taskKetInput" rows="2" placeholder="Tuliskan keterangan tugas untuk murid..." class="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-600 text-white text-xs focus:border-yellow-400 focus:outline-none"></textarea>
            </div>

            <hr class="border-slate-700 my-1">
            <p class="text-[11px] font-bold text-sky-400 uppercase tracking-wider">2. Buat Soal atau Upload Word / PDF</p>

            <div class="bg-slate-900/90 border border-dashed border-sky-500/60 p-2.5 rounded-xl">
                <label class="block text-[10px] font-bold text-sky-300 mb-1">📄 Upload File Word (.docx) atau PDF (.pdf):</label>
                <input type="file" id="taskFileUpload" accept=".docx,.pdf,.txt" onchange="handleTaskDocUpload(event)" class="w-full text-[11px] text-slate-300 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-sky-500 file:text-slate-950 hover:file:bg-sky-400 cursor-pointer">
                <p id="uploadDocStatus" class="text-[10px] text-slate-400 mt-1">Otomatis diubah menjadi simulasi soal pilihan ganda untuk dijawab murid.</p>
            </div>

            <div class="bg-slate-900/80 p-2.5 rounded-xl border border-slate-700 space-y-1.5">
                <label class="block text-[10px] font-bold text-emerald-300">✍️ Atau Tambah Soal Manual:</label>
                <input type="text" id="manualQText" placeholder="Tulis pertanyaan soal..." class="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-600 text-white text-xs">
                <div class="grid grid-cols-3 gap-1.5">
                    <input type="text" id="manualOptA" placeholder="Pilihan A (Benar)" class="px-2 py-1 rounded-lg bg-slate-800 border border-emerald-600/60 text-white text-[11px]">
                    <input type="text" id="manualOptB" placeholder="Pilihan B" class="px-2 py-1 rounded-lg bg-slate-800 border border-slate-600 text-white text-[11px]">
                    <input type="text" id="manualOptC" placeholder="Pilihan C" class="px-2 py-1 rounded-lg bg-slate-800 border border-slate-600 text-white text-[11px]">
                </div>
                <button type="button" onclick="addManualQuestionToDraft()" class="w-full py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg text-[11px]">
                    + Tambahkan ke Daftar Soal
                </button>
            </div>

            <div id="draftQuestionsPreview" class="text-[11px] text-slate-300 bg-slate-950/70 p-2 rounded-xl border border-slate-800">
                Belum ada soal ditambahkan (0 soal).
            </div>

            <button type="button" onclick="publishKelasTask()" class="w-full py-2.5 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-extrabold rounded-xl text-xs shadow-lg transition active:scale-95">
                💾 Simpan ke Apps Script & Kirim ke Murid
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
    const kode = document.getElementById('taskKodeInput').value.trim();
    const kelas = document.getElementById('taskKelasInput').value.trim();
    const keterangan = document.getElementById('taskKetInput').value.trim();

    if (!kode || !kelas || !keterangan) {
        alert("Harap isi Kode Tugas, Kelas, dan Keterangan terlebih dahulu!");
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

    const taskPayload = {
        action: 'addTask',
        kode: kode,
        kelas: kelas,
        keterangan: keterangan,
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
        window.sendFirebaseChat("Ruang Kelas", `📚 ${playerCustomName} baru saja membagikan Tugas PR [${kode}] untuk ${kelas}! Silakan kerjakan di meja murid.`);
    }

    if (modalContent) {
        modalContent.innerHTML = `
            <div class="p-4 bg-emerald-950/90 border border-emerald-500 rounded-2xl text-center space-y-2">
                <div class="text-3xl">✅</div>
                <h4 class="font-extrabold text-emerald-300 text-sm">Tugas PR Berhasil Disimpan!</h4>
                <p class="text-xs text-slate-200">Kode: <strong>${kode}</strong> • Kelas: <strong>${kelas}</strong></p>
                <p class="text-[11px] text-slate-300">Murid sekarang sudah bisa menekan <strong>AKSI</strong> di area meja murid untuk menjawab soal.</p>
            </div>
        `;
    }
};

// ==========================================
// 5. PANEL MURID (AMBIL & JAWAB TUGAS PR DARI APPS SCRIPT)
// ==========================================
async function openStudentTaskListModal(headerTitle) {
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    const modalActions = document.getElementById('modalActions');

    modalTitle.innerHTML = `✍️ ${headerTitle || 'Tugas PR Kelas'}`;
    modalContent.innerHTML = `
        <div class="flex flex-col items-center justify-center p-4">
            <img src="assets/loading.gif" alt="Loading..." class="w-8 h-8 mb-2" />
            <span class="text-xs text-slate-300">Mengambil daftar tugas PR dari guru...</span>
        </div>
    `;
    modalActions.innerHTML = `<button onclick="closeModal()" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl text-xs transition">Tutup</button>`;
    document.getElementById('dialogModal').classList.remove('hidden');

    if (!KELAS_APPS_SCRIPT_URL || !KELAS_APPS_SCRIPT_URL.startsWith('http')) {
        modalContent.innerHTML = `<div class="text-xs text-red-400 text-center p-3">URL Apps Script belum diatur di kelas.js / game.js.</div>`;
        return;
    }

    try {
        const res = await fetch(`${KELAS_APPS_SCRIPT_URL}?action=getTasks`);
        const data = await res.json();
        const taskList = (data.tasks || []).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        if (taskList.length === 0) {
            modalContent.innerHTML = `<div class="text-center text-xs text-slate-400 p-4 bg-slate-800/70 rounded-xl">Belum ada tugas PR yang diberikan oleh guru saat ini.</div>`;
            return;
        }

        window._cachedKelasTasks = taskList;
        let html = `<div class="flex flex-col gap-2.5 max-h-64 overflow-y-auto text-left pr-1">`;
        taskList.forEach((t, idx) => {
            const qCount = (t.questions && t.questions.length) ? t.questions.length : 0;
            const deleteBtn = canCreateKelasTask()
                ? `<button onclick="deleteKelasTask('${t.id}')" class="px-2 py-1 bg-red-600/80 hover:bg-red-600 text-white rounded-lg text-[10px] font-bold">Hapus</button>`
                : '';

            html += `
                <div class="p-3 bg-slate-800 border border-slate-700 rounded-2xl space-y-1.5">
                    <div class="flex items-center justify-between">
                        <span class="px-2 py-0.5 bg-yellow-400/20 border border-yellow-400/50 text-yellow-300 rounded-md text-[10px] font-extrabold">Kode: ${t.kode} • ${t.kelas}</span>
                        <span class="text-[10px] text-slate-400">${qCount} Soal</span>
                    </div>
                    <p class="text-xs text-slate-200 font-semibold">${t.keterangan}</p>
                    <div class="flex items-center justify-between pt-1">
                        <span class="text-[10px] text-slate-400">Guru: ${t.pembuat || 'Guru'}</span>
                        <div class="flex gap-1.5">
                            ${deleteBtn}
                            <button onclick="startStudentQuiz(${idx})" class="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-xl text-xs shadow active:scale-95">
                                Jawab Tugas ➡️
                            </button>
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
        openStudentTaskListModal("Daftar Tugas Aktif");
    }, 800);
};

window.startStudentQuiz = function(taskIndex) {
    const task = window._cachedKelasTasks && window._cachedKelasTasks[taskIndex];
    if (!task || !task.questions || task.questions.length === 0) return;

    activeStudentQuiz = task;
    studentQuizStep = 0;
    studentQuizScore = 0;
    renderStudentQuizQuestion();
};

function renderStudentQuizQuestion() {
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    const q = activeStudentQuiz.questions[studentQuizStep];
    const total = activeStudentQuiz.questions.length;

    modalTitle.innerHTML = `📝 ${activeStudentQuiz.kode} (${studentQuizStep + 1}/${total})`;

    let optionsHtml = q.options.map((opt, idx) => `
        <button onclick="submitStudentQuizAnswer(${idx})" class="w-full text-left p-2.5 bg-slate-800 hover:bg-sky-900/70 border border-slate-600 hover:border-sky-400 rounded-xl text-xs text-white font-semibold transition active:scale-95">
            ${String.fromCharCode(65 + idx)}. ${opt}
        </button>
    `).join("");

    modalContent.innerHTML = `
        <div class="text-left space-y-3">
            <div class="p-3 bg-slate-800/90 border border-slate-700 rounded-xl text-xs font-bold text-yellow-300 leading-relaxed">
                ${q.question}
            </div>
            <div class="space-y-2">
                ${optionsHtml}
            </div>
        </div>
    `;
}

window.submitStudentQuizAnswer = function(selectedIdx) {
    const q = activeStudentQuiz.questions[studentQuizStep];
    if (selectedIdx === q.answerIndex) {
        studentQuizScore++;
    }

    if (studentQuizStep < activeStudentQuiz.questions.length - 1) {
        studentQuizStep++;
        renderStudentQuizQuestion();
    } else {
        finishStudentQuiz();
    }
};

// ==========================================
// SIMPAN NILAI SISWA KE APPS SCRIPT (kelasSubmissions)
// ==========================================
function finishStudentQuiz() {
    const total = activeStudentQuiz.questions.length;
    const nilaiAkhir = Math.round((studentQuizScore / total) * 100);
    const rewardPoin = studentQuizScore * 5;

    if (typeof playerPoints !== 'undefined' && rewardPoin > 0) {
        playerPoints += rewardPoin;
        if (typeof savePlayerPointsToFirebase === 'function') {
            savePlayerPointsToFirebase();
        }
    }

    if (KELAS_APPS_SCRIPT_URL && KELAS_APPS_SCRIPT_URL.startsWith('http')) {
        fetch(KELAS_APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
                action: 'addSubmission',
                kode: activeStudentQuiz.kode,
                kelas: activeStudentQuiz.kelas,
                siswa: playerCustomName,
                benar: studentQuizScore,
                totalSoal: total,
                nilai: nilaiAkhir,
                timestamp: Date.now()
            })
        }).catch(err => console.warn("Gagal kirim nilai ke Apps Script:", err));
    }

    const modalContent = document.getElementById('modalContent');
    modalContent.innerHTML = `
        <div class="p-4 bg-slate-800 border-2 border-emerald-400 rounded-2xl text-center space-y-2">
            <div class="text-4xl">🎉</div>
            <h4 class="font-extrabold text-yellow-400 text-base">Tugas PR Selesai!</h4>
            <p class="text-xs text-slate-300">Kode Tugas: <strong>${activeStudentQuiz.kode}</strong> (${activeStudentQuiz.kelas})</p>
            <div class="bg-slate-900 p-3 rounded-xl border border-slate-700 my-2">
                <div class="text-xs text-slate-400">Nilai Kamu</div>
                <div class="text-2xl font-black text-emerald-400">${nilaiAkhir}</div>
                <div class="text-[11px] text-amber-300 mt-1">Benar ${studentQuizScore} dari ${total} soal (+${rewardPoin} Poin)</div>
            </div>
        </div>
    `;
}
