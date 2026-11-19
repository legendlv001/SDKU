// ==========================================
// SISTEM RUANG KELAS (LOKASI 3) & KUIS INTERAKTIF
// ==========================================

let currentKelasQuizList = [];
let currentQuizIndex = 0;
let currentQuizScore = 0;
let isQuizAnswering = false;

// Menentukan posisi spawn pemain saat memasuki Ruang Kelas (Lokasi 3)
function initKelasSpawn(playerObj) {
    if (!playerObj) return;
    playerObj.x = 360;
    playerObj.y = 540;
    playerObj.direction = 'up';
}

// Helper mengambil URL Apps Script secara otomatis dari game.js
function getKelasAppsScriptUrl() {
    return (typeof APPS_SCRIPT_URL !== 'undefined' && APPS_SCRIPT_URL && APPS_SCRIPT_URL.startsWith('http'))
        ? APPS_SCRIPT_URL
        : "";
}

// Menangani interaksi dengan objek/papan/meja di dalam Ruang Kelas
window.handleKelasInteraction = async function(building) {
    if (!building) return false;

    // Jika objek adalah portal keluar kelas, biarkan game.js yang memindahkan lokasi
    if (building.isPortal || building.targetUrl) {
        return false;
    }

    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    const modalActions = document.getElementById('modalActions');
    const dialogModal = document.getElementById('dialogModal');

    if (!modalTitle || !modalContent || !modalActions || !dialogModal) return false;

    modalTitle.innerHTML = `${building.icon || '🏫'} ${building.dialogTitle || building.name}`;
    modalContent.innerHTML = `
        <div class="flex flex-col items-center justify-center p-4">
            <img src="assets/loading.gif" alt="Loading..." class="w-8 h-8 mb-2" />
            <span class="text-xs text-slate-300">Memuat materi ${building.name}...</span>
        </div>
    `;
    modalActions.innerHTML = `<button type="button" onclick="closeModal()" class="px-5 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl text-xs transition">Tutup</button>`;
    dialogModal.classList.remove('hidden');
    if (typeof resetDialogAutoCloseTimer === 'function') resetDialogAutoCloseTimer();

    // Jika bangunan tidak terhubung ke tab Spreadsheet tertentu, tampilkan teks dialog biasa
    if (!building.sheetName) {
        modalContent.innerHTML = `<div class="p-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-xs leading-relaxed">${building.dialogText || 'Selamat datang di Ruang Kelas!'}</div>`;
        if (typeof resetDialogAutoCloseTimer === 'function') resetDialogAutoCloseTimer();
        return true;
    }

    try {
        const csvUrl = (typeof getSheetCsvUrl === 'function')
            ? getSheetCsvUrl(building.sheetName)
            : `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(building.sheetName)}`;

        const response = await fetch(csvUrl);
        if (!response.ok) throw new Error("Gagal memuat data kelas");

        const csvText = await response.text();
        const lines = csvText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        // Deteksi otomatis apakah tab Spreadsheet berisi Kuis (minimal 6 kolom: Soal, A, B, C, D, Kunci)
        let isQuizSheet = false;
        const parsedQuizzes = [];
        const parsedMaterials = [];

        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
            if (!cols[0]) continue;

            // Format Kuis: Kolom A = Pertanyaan, B = Opsi A, C = Opsi B, D = Opsi C, E = Opsi D, F = Kunci (A/B/C/D), G = Poin (opsional)
            if (cols[1] && cols[2] && cols[5]) {
                isQuizSheet = true;
                const rewardVal = parseInt((cols[6] || "5").replace(/[^0-9]/g, ''), 10);
                parsedQuizzes.push({
                    question: cols[0],
                    options: {
                        A: cols[1],
                        B: cols[2],
                        C: cols[3] || "",
                        D: cols[4] || ""
                    },
                    answer: cols[5].toUpperCase().charAt(0),
                    points: isNaN(rewardVal) || rewardVal <= 0 ? 5 : rewardVal
                });
            } else {
                // Format Materi / Tautan Pembelajaran: Kolom A = Judul, Kolom B = Link/Isi (opsional)
                parsedMaterials.push({
                    title: cols[0],
                    detail: cols[1] || ""
                });
            }
        }

        if (isQuizSheet && parsedQuizzes.length > 0) {
            currentKelasQuizList = parsedQuizzes;
            currentQuizIndex = 0;
            currentQuizScore = 0;
            renderKelasQuizQuestion();
        } else if (parsedMaterials.length > 0) {
            let htmlList = `<div class="flex flex-col gap-2 w-full text-left">`;
            parsedMaterials.forEach(item => {
                if (item.detail.startsWith('http')) {
                    htmlList += `
                        <a href="${item.detail}" target="_blank" class="flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-yellow-400 rounded-xl text-yellow-400 font-semibold text-xs transition">
                            <span>📘 ${item.title}</span>
                            <i class="fas fa-external-link-alt text-[10px] text-slate-400"></i>
                        </a>
                    `;
                } else if (item.detail.toLowerCase().endsWith('.html')) {
                    htmlList += `
                        <button type="button" onclick="navigateToLocalHtml('${item.detail.replace(/'/g, "\\'")}')" class="flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-700 border border-emerald-500/40 hover:border-yellow-400 rounded-xl text-yellow-400 font-bold text-xs transition w-full text-left active:scale-95">
                            <span>🎮 ${item.title}</span>
                            <span class="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-lg text-[10px]">Mulai</span>
                        </button>
                    `;
                } else {
                    htmlList += `
                        <div class="p-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-xs leading-relaxed">
                            <div class="font-bold text-yellow-300 mb-1">📌 ${item.title}</div>
                            ${item.detail ? `<div class="text-slate-300">${item.detail}</div>` : ''}
                        </div>
                    `;
                }
            });
            htmlList += `</div>`;
            modalContent.innerHTML = htmlList;
        } else {
            modalContent.innerHTML = `<div class="text-center text-xs text-slate-400 p-3">Belum ada materi atau soal latihan di papan ini.</div>`;
        }

        if (typeof resetDialogAutoCloseTimer === 'function') resetDialogAutoCloseTimer();
    } catch (err) {
        modalContent.innerHTML = `<div class="text-center text-xs text-slate-400 p-3">Gagal memuat konten kelas. Periksa koneksi internet Anda.</div>`;
        if (typeof resetDialogAutoCloseTimer === 'function') resetDialogAutoCloseTimer();
    }

    return true;
};

// Merender soal kuis kelas satu per satu
function renderKelasQuizQuestion() {
    const modalContent = document.getElementById('modalContent');
    if (!modalContent) return;

    if (currentQuizIndex >= currentKelasQuizList.length) {
        finishKelasQuiz();
        return;
    }

    isQuizAnswering = false;
    const q = currentKelasQuizList[currentQuizIndex];
    const total = currentKelasQuizList.length;

    let optionsHTML = '';
    ['A', 'B', 'C', 'D'].forEach(key => {
        if (!q.options[key]) return;
        optionsHTML += `
            <button type="button" id="quizOptBtn_${key}" onclick="submitKelasQuizAnswer('${key}')"
                class="w-full p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-yellow-400 text-left text-xs font-semibold text-white transition flex items-center gap-2.5 active:scale-98">
                <span class="w-6 h-6 rounded-lg bg-slate-700 text-yellow-400 font-extrabold flex items-center justify-center shrink-0">${key}</span>
                <span class="leading-snug">${q.options[key]}</span>
            </button>
        `;
    });

    modalContent.innerHTML = `
        <div class="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-2">
            <span>Soal ${currentQuizIndex + 1} dari ${total}</span>
            <span class="text-amber-400">Hadiah: +${q.points} Poin</span>
        </div>
        <div class="p-3 bg-slate-800/90 border border-indigo-500/40 rounded-2xl text-xs md:text-sm font-bold text-white mb-3 leading-relaxed">
            ${q.question}
        </div>
        <div class="flex flex-col gap-2">
            ${optionsHTML}
        </div>
        <div id="quizFeedbackBox" class="hidden mt-3 p-2.5 rounded-xl text-xs font-bold text-center"></div>
    `;

    if (typeof resetDialogAutoCloseTimer === 'function') resetDialogAutoCloseTimer();
}

window.submitKelasQuizAnswer = function(chosenKey) {
    if (isQuizAnswering) return;
    isQuizAnswering = true;

    if (typeof resetDialogAutoCloseTimer === 'function') resetDialogAutoCloseTimer();
    const q = currentKelasQuizList[currentQuizIndex];
    const feedbackBox = document.getElementById('quizFeedbackBox');
    const chosenBtn = document.getElementById(`quizOptBtn_${chosenKey}`);
    const correctBtn = document.getElementById(`quizOptBtn_${q.answer}`);

    const isCorrect = (chosenKey === q.answer);

    if (isCorrect) {
        currentQuizScore += q.points;
        if (chosenBtn) {
            chosenBtn.classList.remove('border-slate-600', 'bg-slate-800');
            chosenBtn.classList.add('border-emerald-400', 'bg-emerald-950/80');
        }
        if (feedbackBox) {
            feedbackBox.className = "mt-3 p-2.5 rounded-xl text-xs font-bold text-center bg-emerald-950/90 border border-emerald-500 text-emerald-300";
            feedbackBox.innerHTML = `✅ Jawaban Benar! (+${q.points} Poin)`;
            feedbackBox.classList.remove('hidden');
        }
    } else {
        if (chosenBtn) {
            chosenBtn.classList.remove('border-slate-600', 'bg-slate-800');
            chosenBtn.classList.add('border-red-500', 'bg-red-950/80');
        }
        if (correctBtn) {
            correctBtn.classList.remove('border-slate-600', 'bg-slate-800');
            correctBtn.classList.add('border-emerald-400', 'bg-emerald-950/60');
        }
        if (feedbackBox) {
            feedbackBox.className = "mt-3 p-2.5 rounded-xl text-xs font-bold text-center bg-red-950/90 border border-red-500 text-red-300";
            feedbackBox.innerHTML = `❌ Kurang tepat! Jawaban yang benar adalah <strong>${q.answer}</strong>.`;
            feedbackBox.classList.remove('hidden');
        }
    }

    setTimeout(() => {
        currentQuizIndex++;
        renderKelasQuizQuestion();
    }, 1300);
};

// Menyelesaikan kuis dan menyimpan poin hadiah ke Spreadsheet via game.js
function finishKelasQuiz() {
    const modalContent = document.getElementById('modalContent');
    if (!modalContent) return;

    if (currentQuizScore > 0) {
        playerPoints = (typeof playerPoints === 'number' ? playerPoints : 0) + currentQuizScore;

        if (typeof savePlayerPointsToFirebase === 'function') {
            savePlayerPointsToFirebase();
        } else {
            const scriptUrl = getKelasAppsScriptUrl();
            if (scriptUrl && typeof playerCustomName !== 'undefined' && playerCustomName) {
                fetch(scriptUrl, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify({
                        action: 'updatePoints',
                        player: playerCustomName,
                        points: playerPoints,
                        updatedAt: Date.now()
                    })
                }).catch(() => {});
            }
        }

        if (typeof window.sendFirebaseChat === 'function' && typeof playerCustomName !== 'undefined') {
            window.sendFirebaseChat("Ruang Kelas", `🎓 ${playerCustomName} menyelesaikan latihan kelas dan mendapatkan +${currentQuizScore} Poin!`);
        }
    }

    modalContent.innerHTML = `
        <div class="text-center p-4 bg-slate-800/90 border border-yellow-400/50 rounded-2xl">
            <div class="text-3xl mb-2">🎉</div>
            <h4 class="text-sm md:text-base font-extrabold text-yellow-400 mb-1">Latihan Selesai!</h4>
            <p class="text-xs text-slate-300 mb-3">Total poin yang berhasil Anda kumpulkan dari sesi ini:</p>
            <div class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-950/90 border border-amber-400/60">
                <img src="assets/poin.png" alt="Poin" class="w-5 h-5 object-contain coin-spin" />
                <span class="text-base font-extrabold text-amber-300">+${currentQuizScore} Poin</span>
            </div>
        </div>
    `;

    if (typeof resetDialogAutoCloseTimer === 'function') resetDialogAutoCloseTimer();
}