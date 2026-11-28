// ==========================================
// MODUL TAMAN BERMAIN EDUKASI (taman.js)
// Terintegrasi penuh dengan index.html & game.js
// ==========================================

const TAMAN_APPS_SCRIPT_URL = (typeof APPS_SCRIPT_URL !== 'undefined' && APPS_SCRIPT_URL && APPS_SCRIPT_URL.startsWith('http'))
    ? APPS_SCRIPT_URL
    : "https://script.google.com/macros/s/AKfycbztvCaoz9VoBwjNPUjzf_k_CMbqy9ICOhjT45WLKzmmUIw4aTIEiOaIm00mT-ylgn9o/exec";

let tamanIsClaimingTicket = false;
const tamanConfig = {
    ticketSystemActive: true,
    claimedRides: []
};

const tamanState = {
    stars: 0,
    soundEnabled: true,
    currentRide: null,
    questions: [],
    currentIndex: 0,
    roundStars: 0,
    answered: false
};

// ==========================================
// 1. INJEKSI STYLE & LIBRARY PENDUKUNG (TONE.JS & CONFETTI)
// ==========================================
function ensureTamanStylesAndLibs() {
    if (!document.getElementById('taman-custom-styles')) {
        const style = document.createElement('style');
        style.id = 'taman-custom-styles';
        style.textContent = `
            @keyframes floatCloudTaman {
                0%, 100% { transform: translateX(0px); }
                50% { transform: translateX(25px); }
            }
            .taman-cloud-1 { animation: floatCloudTaman 8s ease-in-out infinite; }
            .taman-cloud-2 { animation: floatCloudTaman 11s ease-in-out infinite reverse; }

            @keyframes spinFerrisTaman {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            .taman-ferris-spin {
                transform-origin: 100px 95px;
                animation: spinFerrisTaman 20s linear infinite;
            }

            @keyframes seesawMotionTaman {
                0%, 100% { transform: rotate(-13deg); }
                50% { transform: rotate(13deg); }
            }
            .taman-seesaw-anim {
                transform-origin: 100px 125px;
                animation: seesawMotionTaman 2.8s ease-in-out infinite;
            }

            @keyframes swingMotionTaman {
                0%, 100% { transform: rotate(-16deg); }
                50% { transform: rotate(16deg); }
            }
            .taman-swing-anim {
                transform-origin: 100px 42px;
                animation: swingMotionTaman 3s ease-in-out infinite;
            }

            .taman-btn-3d {
                transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 5px 0 rgba(0, 0, 0, 0.18);
            }
            .taman-btn-3d:active {
                transform: translateY(3px);
                box-shadow: 0 2px 0 rgba(0, 0, 0, 0.18);
            }

            .taman-ride-card {
                background: rgba(255, 255, 255, 0.94);
                backdrop-filter: blur(8px);
                border: 3px solid #ffffff;
                box-shadow: 0 10px 20px -5px rgba(14, 116, 144, 0.18), 0 6px 0 #cbd5e1;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
            }
            .taman-ride-card:hover {
                transform: translateY(-4px);
                box-shadow: 0 15px 25px -5px rgba(14, 116, 144, 0.25), 0 9px 0 #94a3b8;
            }
            .taman-ride-card:active {
                transform: translateY(2px);
                box-shadow: 0 4px 10px rgba(0,0,0,0.1), 0 3px 0 #94a3b8;
            }

            @keyframes tamanShake {
                0%, 100% { transform: translateX(0); }
                20%, 60% { transform: translateX(-8px); }
                40%, 80% { transform: translateX(8px); }
            }
            .taman-animate-shake {
                animation: tamanShake 0.4s ease-in-out;
            }

            @keyframes tamanPopIn {
                0% { opacity: 0; transform: scale(0.9) translateY(12px); }
                100% { opacity: 1; transform: scale(1) translateY(0); }
            }
            .taman-animate-pop-in {
                animation: tamanPopIn 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
            }
        `;
        document.head.appendChild(style);
    }

    if (typeof Tone === 'undefined' && !document.querySelector('script[src*="tone"]')) {
        const sTone = document.createElement('script');
        sTone.src = 'https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js';
        document.head.appendChild(sTone);
    }

    if (typeof confetti === 'undefined' && !document.querySelector('script[src*="confetti"]')) {
        const sConfetti = document.createElement('script');
        sConfetti.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js';
        document.head.appendChild(sConfetti);
    }
}

// ==========================================
// 2. AUDIO SINTESIS (TONE.JS)
// ==========================================
let tamanSynth = null;
function initTamanAudio() {
    if (!tamanSynth && typeof Tone !== 'undefined') {
        tamanSynth = new Tone.PolySynth(Tone.Synth).toDestination();
        tamanSynth.volume.value = -8;
    }
}

function playTamanSound(type) {
    if (!tamanState.soundEnabled) return;
    try {
        initTamanAudio();
        if (typeof Tone !== 'undefined' && Tone.context.state !== 'running') {
            Tone.start();
        }
        if (!tamanSynth) return;
        const now = Tone.now();
        if (type === 'click') {
            tamanSynth.triggerAttackRelease('C5', '16n', now);
        } else if (type === 'correct') {
            tamanSynth.triggerAttackRelease(['C5', 'E5', 'G5'], '16n', now);
            tamanSynth.triggerAttackRelease(['C6'], '8n', now + 0.12);
        } else if (type === 'wrong') {
            tamanSynth.triggerAttackRelease(['E4', 'Eb4'], '8n', now);
        } else if (type === 'win') {
            tamanSynth.triggerAttackRelease('C5', '16n', now);
            tamanSynth.triggerAttackRelease('E5', '16n', now + 0.1);
            tamanSynth.triggerAttackRelease('G5', '16n', now + 0.2);
            tamanSynth.triggerAttackRelease('C6', '4n', now + 0.3);
        }
    } catch (e) {}
}

window.toggleTamanSound = function() {
    tamanState.soundEnabled = !tamanState.soundEnabled;
    const btn = document.getElementById('taman-sound-toggle');
    if (btn) btn.textContent = tamanState.soundEnabled ? '🔊' : '🔇';
    if (tamanState.soundEnabled) playTamanSound('click');
};

// ==========================================
// 3. BUKA & TUTUP OVERLAY TAMAN BERMAIN
// ==========================================
window.openTamanModal = function() {
    ensureTamanStylesAndLibs();
    playTamanSound('click');

    if (typeof dialogAutoCloseTimer !== 'undefined' && dialogAutoCloseTimer) {
        clearTimeout(dialogAutoCloseTimer);
    }

    let overlay = document.getElementById('tamanPlaygroundOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'tamanPlaygroundOverlay';
        overlay.className = 'fixed inset-0 z-[65] overflow-y-auto flex flex-col justify-between text-slate-800';
        overlay.style.background = 'linear-gradient(180deg, #7dd3fc 0%, #e0f2fe 65%, #86efac 65%, #4ade80 100%)';
        document.body.appendChild(overlay);
    }

    const activePlayerName = (typeof playerCustomName !== 'undefined' && playerCustomName) ? playerCustomName : 'Tamu';
    const currentTickets = (typeof playerTickets !== 'undefined') ? playerTickets : 0;

    overlay.innerHTML = `
        <!-- Dekorasi Matahari & Awan -->
        <div class="fixed inset-0 pointer-events-none overflow-hidden z-0">
            <svg class="w-20 h-20 sm:w-28 sm:h-28 absolute top-4 right-4 sm:right-12 text-amber-300 drop-shadow-md" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="28" fill="#FBBF24"/>
                <g stroke="#F59E0B" stroke-width="5" stroke-linecap="round">
                    <line x1="50" y1="8" x2="50" y2="16"/><line x1="50" y1="84" x2="50" y2="92"/>
                    <line x1="8" y1="50" x2="16" y2="50"/><line x1="84" y1="50" x2="92" y2="50"/>
                    <line x1="20" y1="20" x2="26" y2="26"/><line x1="74" y1="74" x2="80" y2="80"/>
                    <line x1="80" y1="20" x2="74" y2="26"/><line x1="26" y1="74" x2="20" y2="80"/>
                </g>
                <circle cx="42" cy="46" r="3" fill="#78350F"/><circle cx="58" cy="46" r="3" fill="#78350F"/>
                <path d="M 42 56 Q 50 63 58 56" stroke="#78350F" stroke-width="3" fill="none" stroke-linecap="round"/>
            </svg>
            <svg class="w-32 h-16 absolute top-10 left-6 text-white/90 taman-cloud-1" viewBox="0 0 120 60">
                <path d="M25,50 L95,50 C108,50 115,40 115,30 C115,20 105,12 94,14 C90,5 78,0 66,4 C56,-2 40,2 35,14 C20,12 10,22 10,34 C10,43 17,50 25,50 Z" fill="currentColor"/>
            </svg>
            <svg class="w-24 h-14 absolute top-20 left-1/3 text-white/80 taman-cloud-2 hidden sm:block" viewBox="0 0 120 60">
                <path d="M25,50 L95,50 C108,50 115,40 115,30 C115,20 105,12 94,14 C90,5 78,0 66,4 C56,-2 40,2 35,14 C20,12 10,22 10,34 C10,43 17,50 25,50 Z" fill="currentColor"/>
            </svg>
        </div>

        <!-- Header -->
        <header class="relative z-10 w-full max-w-6xl mx-auto px-3 sm:px-4 pt-3 pb-2 flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
                <button type="button" onclick="closeTamanModal()" class="taman-btn-3d bg-yellow-400 hover:bg-yellow-300 text-slate-900 border-2 border-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl font-extrabold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer">
                    <span>⬅️</span>
                    <span>Kembali ke Sekolah</span>
                </button>
                <div class="flex items-center gap-2 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-2xl shadow-md border-2 border-white">
                    <span class="text-2xl sm:text-3xl">🎪</span>
                    <div>
                        <h1 class="text-sm sm:text-xl font-extrabold text-sky-700 leading-tight">Taman Bermain Ceria</h1>
                        <p class="text-[10px] sm:text-xs font-semibold text-emerald-600">Belajar Sambil Bermain!</p>
                    </div>
                </div>
            </div>

            <div class="flex flex-wrap items-center gap-2">
                <div class="flex items-center gap-1.5 bg-sky-100 border-2 border-sky-300 px-3 py-1.5 rounded-2xl shadow-sm">
                    <span class="text-base sm:text-lg">👤</span>
                    <div class="text-left">
                        <span class="text-[9px] font-bold text-sky-700 block uppercase">Pemain</span>
                        <span id="taman-player-name" class="text-xs sm:text-sm font-extrabold text-sky-900 leading-none">${activePlayerName}</span>
                    </div>
                </div>

                <div class="flex items-center gap-1.5 bg-amber-100 border-2 border-amber-300 px-3 py-1.5 rounded-2xl shadow-sm">
                    <span class="text-lg sm:text-xl">⭐</span>
                    <div>
                        <span class="text-[9px] font-bold text-amber-700 block uppercase">Bintang</span>
                        <span id="taman-star-count" class="text-sm sm:text-lg font-extrabold text-amber-600 leading-none">${tamanState.stars}</span>
                    </div>
                </div>

                <div class="flex items-center gap-1.5 bg-rose-100 border-2 border-rose-300 px-3 py-1.5 rounded-2xl shadow-sm">
                    <span class="text-lg sm:text-xl">🎟️</span>
                    <div>
                        <span class="text-[9px] font-bold text-rose-700 block uppercase">Tiket</span>
                        <span id="taman-ticket-count" class="text-sm sm:text-lg font-extrabold text-rose-600 leading-none">${currentTickets}</span>
                    </div>
                </div>

                <button type="button" id="taman-sound-toggle" onclick="toggleTamanSound()" class="taman-btn-3d bg-white hover:bg-sky-50 text-sky-600 border-2 border-sky-200 p-2 sm:p-2.5 rounded-2xl font-bold text-base sm:text-lg cursor-pointer">
                    ${tamanState.soundEnabled ? '🔊' : '🔇'}
                </button>
            </div>
        </header>

        <!-- Konten Utama -->
        <main class="relative z-10 flex-grow w-full max-w-6xl mx-auto px-3 sm:px-4 py-3 flex flex-col justify-center">
            <!-- LAYAR 1: PETA TAMAN -->
            <section id="taman-map-view" class="w-full">
                <div class="text-center mb-4 sm:mb-6">
                    <span id="taman-ticket-banner" class="inline-block bg-white/90 text-sky-700 font-bold px-4 py-1 rounded-full text-xs sm:text-sm shadow-sm mb-1.5 border border-sky-100">
                        🎟️ Jawab <strong>semua 5 soal benar</strong> untuk meraih <strong>1 Tiket Hadiah</strong> (1x per wahana)!
                    </span>
                    <h2 class="text-xl sm:text-3xl font-extrabold text-slate-800 drop-shadow-sm">Peta Petualangan Taman Bermain</h2>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <!-- WAHANA 1: JUNGKAT-JUNGKIT -->
                    <div onclick="startTamanRide('seesaw')" class="taman-ride-card rounded-3xl p-4 cursor-pointer flex flex-col items-center text-center relative">
                        <span id="taman-claimed-seesaw" class="hidden absolute top-2.5 right-2.5 bg-emerald-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-sm">✅ Diklaim</span>
                        <div class="w-36 h-32 mb-2.5 flex items-center justify-center bg-sky-50 rounded-2xl p-2 border-2 border-sky-100">
                            <svg viewBox="0 0 200 180" class="w-full h-full overflow-visible">
                                <line x1="20" y1="168" x2="180" y2="168" stroke="#16A34A" stroke-width="6" stroke-linecap="round"/>
                                <g class="taman-seesaw-anim">
                                    <rect x="24" y="119" width="152" height="12" rx="6" fill="#F43F5E" stroke="#BE123C" stroke-width="2.5"/>
                                    <rect x="28" y="113" width="22" height="7" rx="3" fill="#FBBF24"/>
                                    <circle cx="39" cy="96" r="13" fill="#38BDF8" stroke="#0284C7" stroke-width="2.5"/>
                                    <text x="39" y="101" text-anchor="middle" fill="#FFFFFF" font-weight="bold" font-size="14">2</text>
                                    <rect x="150" y="113" width="22" height="7" rx="3" fill="#FBBF24"/>
                                    <circle cx="161" cy="96" r="13" fill="#34D399" stroke="#047857" stroke-width="2.5"/>
                                    <text x="161" y="101" text-anchor="middle" fill="#FFFFFF" font-weight="bold" font-size="14">3</text>
                                </g>
                                <polygon points="100,125 76,168 124,168" fill="#F59E0B" stroke="#B45309" stroke-width="3" stroke-linejoin="round"/>
                                <circle cx="100" cy="125" r="7" fill="#FFFFFF" stroke="#475569" stroke-width="3"/>
                            </svg>
                        </div>
                        <span class="bg-rose-100 text-rose-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full mb-1.5">🔢 BERHITUNG CERDAS</span>
                        <h3 class="text-lg font-extrabold text-slate-800 mb-1">Jungkat-Jungkit Angka</h3>
                        <p class="text-xs text-slate-600 mb-3 flex-grow">Seimbangkan sisi kiri & kanan dengan soal penjumlahan dan pengurangan!</p>
                        <button type="button" class="taman-btn-3d w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-2.5 px-3 rounded-2xl text-sm">Main Jungkat-Jungkit 🚀</button>
                    </div>

                    <!-- WAHANA 2: AYUNAN -->
                    <div onclick="startTamanRide('swing')" class="taman-ride-card rounded-3xl p-4 cursor-pointer flex flex-col items-center text-center relative">
                        <span id="taman-claimed-swing" class="hidden absolute top-2.5 right-2.5 bg-emerald-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-sm">✅ Diklaim</span>
                        <div class="w-36 h-32 mb-2.5 flex items-center justify-center bg-amber-50 rounded-2xl p-2 border-2 border-amber-100">
                            <svg viewBox="0 0 200 180" class="w-full h-full overflow-visible">
                                <line x1="35" y1="168" x2="60" y2="42" stroke="#D97706" stroke-width="7" stroke-linecap="round"/>
                                <line x1="165" y1="168" x2="140" y2="42" stroke="#D97706" stroke-width="7" stroke-linecap="round"/>
                                <line x1="48" y1="42" x2="152" y2="42" stroke="#B45309" stroke-width="9" stroke-linecap="round"/>
                                <g class="taman-swing-anim">
                                    <line x1="82" y1="42" x2="82" y2="128" stroke="#64748B" stroke-width="3"/>
                                    <line x1="118" y1="42" x2="118" y2="128" stroke="#64748B" stroke-width="3"/>
                                    <rect x="72" y="126" width="56" height="10" rx="5" fill="#EC4899" stroke="#9D174D" stroke-width="2"/>
                                    <polygon points="100,92 84,124 116,124" fill="#38BDF8" stroke="#0284C7" stroke-width="2"/>
                                </g>
                                <line x1="20" y1="168" x2="180" y2="168" stroke="#16A34A" stroke-width="6" stroke-linecap="round"/>
                            </svg>
                        </div>
                        <span class="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full mb-1.5">🎨 WARNA & GEOMETRI</span>
                        <h3 class="text-lg font-extrabold text-slate-800 mb-1">Ayunan Bentuk & Warna</h3>
                        <p class="text-xs text-slate-600 mb-3 flex-grow">Temukan kombinasi warna dan bangun datar yang tepat agar ayunan meluncur tinggi!</p>
                        <button type="button" class="taman-btn-3d w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 px-3 rounded-2xl text-sm">Main Ayunan ✨</button>
                    </div>

                    <!-- WAHANA 3: PEROSOTAN -->
                    <div onclick="startTamanRide('slide')" class="taman-ride-card rounded-3xl p-4 cursor-pointer flex flex-col items-center text-center relative">
                        <span id="taman-claimed-slide" class="hidden absolute top-2.5 right-2.5 bg-emerald-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-sm">✅ Diklaim</span>
                        <div class="w-36 h-32 mb-2.5 flex items-center justify-center bg-emerald-50 rounded-2xl p-2 border-2 border-emerald-100">
                            <svg viewBox="0 0 200 180" class="w-full h-full overflow-visible">
                                <line x1="45" y1="168" x2="45" y2="55" stroke="#0284C7" stroke-width="6" stroke-linecap="round"/>
                                <line x1="68" y1="168" x2="68" y2="55" stroke="#0284C7" stroke-width="6" stroke-linecap="round"/>
                                <rect x="38" y="48" width="42" height="10" rx="4" fill="#F59E0B"/>
                                <path d="M 76 54 C 110 54, 115 155, 168 158" fill="none" stroke="#10B981" stroke-width="14" stroke-linecap="round"/>
                                <circle cx="112" cy="108" r="11" fill="#FBBF24" stroke="#FFFFFF" stroke-width="2"/>
                                <line x1="25" y1="168" x2="180" y2="168" stroke="#15803D" stroke-width="6" stroke-linecap="round"/>
                            </svg>
                        </div>
                        <span class="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full mb-1.5">📚 KATA & LOGIKA ALAM</span>
                        <h3 class="text-lg font-extrabold text-slate-800 mb-1">Perosotan Pengetahuan</h3>
                        <p class="text-xs text-slate-600 mb-3 flex-grow">Lengkapi huruf yang hilang dan tebak fakta seru tentang alam di sekitar kita!</p>
                        <button type="button" class="taman-btn-3d w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 px-3 rounded-2xl text-sm">Meluncur Seru 🛝</button>
                    </div>

                    <!-- WAHANA 4: BIANG LALA PJOK -->
                    <div onclick="startTamanRide('ferris')" class="taman-ride-card rounded-3xl p-4 cursor-pointer flex flex-col items-center text-center relative">
                        <span id="taman-claimed-ferris" class="hidden absolute top-2.5 right-2.5 bg-emerald-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-sm">✅ Diklaim</span>
                        <div class="w-36 h-32 mb-2.5 flex items-center justify-center bg-indigo-50 rounded-2xl p-2 border-2 border-indigo-100">
                            <svg viewBox="0 0 200 180" class="w-full h-full overflow-visible">
                                <line x1="100" y1="95" x2="55" y2="170" stroke="#475569" stroke-width="7" stroke-linecap="round"/>
                                <line x1="100" y1="95" x2="145" y2="170" stroke="#475569" stroke-width="7" stroke-linecap="round"/>
                                <line x1="40" y1="170" x2="160" y2="170" stroke="#334155" stroke-width="8" stroke-linecap="round"/>
                                <g class="taman-ferris-spin">
                                    <circle cx="100" cy="95" r="62" fill="none" stroke="#6366F1" stroke-width="6"/>
                                    <line x1="100" y1="33" x2="100" y2="157" stroke="#A5B4FC" stroke-width="3"/>
                                    <line x1="38" y1="95" x2="162" y2="95" stroke="#A5B4FC" stroke-width="3"/>
                                    <rect x="90" y="23" width="20" height="16" rx="5" fill="#FBBF24"/>
                                    <rect x="90" y="149" width="20" height="16" rx="5" fill="#38BDF8"/>
                                    <rect x="28" y="87" width="20" height="16" rx="5" fill="#34D399"/>
                                    <rect x="152" y="87" width="20" height="16" rx="5" fill="#F43F5E"/>
                                </g>
                                <circle cx="100" cy="95" r="10" fill="#F59E0B" stroke="#FFFFFF" stroke-width="3"/>
                            </svg>
                        </div>
                        <span class="bg-indigo-100 text-indigo-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full mb-1.5">⚽ OLAHRAGA & KESEHATAN</span>
                        <h3 class="text-lg font-extrabold text-slate-800 mb-1">Biang Lala PJOK</h3>
                        <p class="text-xs text-slate-600 mb-3 flex-grow">Putar roda kebugaran dan jawab kuis seru tentang olahraga dan hidup sehat!</p>
                        <button type="button" class="taman-btn-3d w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2.5 px-3 rounded-2xl text-sm">Naik Biang Lala 🎡</button>
                    </div>
                </div>

                <!-- Koleksi Lencana -->
                <div class="mt-5 bg-white/85 backdrop-blur-sm rounded-3xl p-3.5 sm:p-4 border-2 border-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div class="flex items-center gap-3 text-center sm:text-left">
                        <div class="text-2xl sm:text-3xl bg-sky-100 p-2.5 rounded-2xl">🏆</div>
                        <div>
                            <h4 class="font-bold text-slate-800 text-sm sm:text-base">Koleksi Lencana Penjelajah</h4>
                            <p id="taman-badge-status" class="text-xs text-slate-600">Kumpulkan 3 bintang untuk membuka Lencana Bintang Pertama!</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <div id="taman-badge-1" class="w-10 h-10 rounded-2xl bg-slate-200 flex items-center justify-center text-xl opacity-40 border-2 border-slate-300 transition-all" title="3 Bintang">🥉</div>
                        <div id="taman-badge-2" class="w-10 h-10 rounded-2xl bg-slate-200 flex items-center justify-center text-xl opacity-40 border-2 border-slate-300 transition-all" title="6 Bintang">🥈</div>
                        <div id="taman-badge-3" class="w-10 h-10 rounded-2xl bg-slate-200 flex items-center justify-center text-xl opacity-40 border-2 border-slate-300 transition-all" title="10 Bintang">🥇</div>
                    </div>
                </div>
            </section>

            <!-- LAYAR 2: ARENA SOAL -->
            <section id="taman-arena-view" class="hidden w-full max-w-2xl mx-auto taman-animate-pop-in">
                <div class="flex items-center justify-between mb-3 gap-2">
                    <button type="button" onclick="returnToTamanPark()" class="taman-btn-3d bg-white hover:bg-slate-50 text-slate-700 font-bold py-2 px-3.5 rounded-2xl border-2 border-slate-200 text-xs sm:text-sm cursor-pointer">
                        ⬅️ Peta Taman
                    </button>
                    <div class="flex-grow max-w-xs bg-white/80 p-1 rounded-full border-2 border-white shadow-inner">
                        <div id="taman-progress-bar" class="h-3 bg-gradient-to-r from-amber-400 to-emerald-500 rounded-full transition-all duration-500" style="width: 20%;"></div>
                    </div>
                    <span id="taman-question-counter" class="bg-white/90 text-slate-700 font-extrabold px-3 py-1.5 rounded-2xl text-xs sm:text-sm border-2 border-white shadow-sm">
                        Soal 1/5
                    </span>
                </div>

                <div class="bg-white/95 backdrop-blur-md rounded-3xl p-4 sm:p-6 border-4 border-white shadow-xl">
                    <div class="flex justify-center mb-3">
                        <span id="taman-active-badge" class="bg-rose-100 text-rose-700 font-extrabold px-4 py-1 rounded-full text-xs uppercase">⚖️ Jungkat-Jungkit Angka</span>
                    </div>
                    <div id="taman-visual-box" class="bg-sky-50/90 border-2 border-sky-100 rounded-2xl p-3 sm:p-4 mb-4 flex flex-col items-center justify-center min-h-[120px]"></div>
                    <h3 id="taman-question-text" class="text-lg sm:text-xl font-bold text-center text-slate-800 mb-4 leading-snug">Pertanyaan...</h3>
                    <div id="taman-options-grid" class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3"></div>

                    <div id="taman-feedback-box" class="hidden mt-4 p-3.5 rounded-2xl border-2 text-center taman-animate-pop-in">
                        <p id="taman-feedback-title" class="font-extrabold text-base mb-1"></p>
                        <p id="taman-feedback-exp" class="text-xs sm:text-sm font-semibold mb-3"></p>
                        <button type="button" id="taman-next-btn" onclick="nextTamanQuestion()" class="taman-btn-3d bg-sky-500 hover:bg-sky-600 text-white font-bold py-2.5 px-6 rounded-2xl text-sm cursor-pointer">
                            Lanjut Bermain ➡️
                        </button>
                    </div>
                </div>
            </section>

            <!-- LAYAR 3: RINGKASAN WAHANA -->
            <section id="taman-summary-view" class="hidden w-full max-w-lg mx-auto text-center taman-animate-pop-in">
                <div class="bg-white/95 backdrop-blur-md rounded-3xl p-5 sm:p-8 border-4 border-white shadow-2xl">
                    <div id="taman-summary-emoji" class="text-5xl sm:text-6xl mb-3 animate-bounce">🎉</div>
                    <h2 class="text-2xl sm:text-3xl font-extrabold text-slate-800 mb-1.5">Wahana Selesai!</h2>
                    <p id="taman-summary-subtitle" class="text-slate-600 font-semibold text-xs sm:text-sm mb-5"></p>

                    <div class="grid grid-cols-2 gap-3 mb-5">
                        <div class="bg-amber-50 border-2 border-amber-200 rounded-2xl p-3">
                            <span class="text-2xl block mb-1">⭐</span>
                            <span class="text-[10px] font-bold text-amber-700 uppercase">Bintang Didapat</span>
                            <p id="taman-round-stars" class="text-xl sm:text-2xl font-extrabold text-amber-600">+5</p>
                        </div>
                        <div id="taman-reward-card" class="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-3">
                            <span class="text-2xl block mb-1">🎟️</span>
                            <span id="taman-reward-label" class="text-[10px] font-bold text-emerald-700 uppercase">Tiket Hadiah</span>
                            <p id="taman-round-tickets" class="text-xl sm:text-2xl font-extrabold text-emerald-600">+1</p>
                        </div>
                    </div>

                    <div class="flex flex-col sm:flex-row gap-2.5 justify-center">
                        <button type="button" onclick="replayTamanRide()" class="taman-btn-3d bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 px-5 rounded-2xl text-sm cursor-pointer">🔄 Main Lagi</button>
                        <button type="button" onclick="returnToTamanPark()" class="taman-btn-3d bg-sky-500 hover:bg-sky-600 text-white font-bold py-2.5 px-5 rounded-2xl text-sm cursor-pointer">🗺️ Pilih Wahana Lain</button>
                    </div>
                </div>
            </section>
        </main>
    `;

    overlay.classList.remove('hidden');
    updateTamanHeaderStats();
    sinkronkanTamanDariSpreadsheet();
};

window.closeTamanModal = function() {
    playTamanSound('click');
    const overlay = document.getElementById('tamanPlaygroundOverlay');
    if (overlay) overlay.classList.add('hidden');
    if (typeof updatePointsDisplay === 'function') updatePointsDisplay();
};

// ==========================================
// 4. SINKRONISASI TIKET DENGAN GAME.JS & SPREADSHEET
// ==========================================
function sinkronkanTamanDariSpreadsheet() {
    const playerName = (typeof playerCustomName !== 'undefined' && playerCustomName) ? playerCustomName : '';
    if (!TAMAN_APPS_SCRIPT_URL || !TAMAN_APPS_SCRIPT_URL.startsWith('http')) return;

    fetch(`${TAMAN_APPS_SCRIPT_URL}?action=getTamanStatus&player=${encodeURIComponent(playerName)}&_t=${Date.now()}`)
        .then(res => res.json())
        .then(data => {
            if (data && data.status === 'success') {
                tamanConfig.ticketSystemActive = Boolean(data.ticketSystemActive);
                tamanConfig.claimedRides = Array.isArray(data.claimedRides) ? data.claimedRides : [];
                perbaruiBannerTiketTaman();
            }
        })
        .catch(() => {});
}

function perbaruiBannerTiketTaman() {
    const bannerSpan = document.getElementById('taman-ticket-banner');
    const playerName = (typeof playerCustomName !== 'undefined' && playerCustomName) ? playerCustomName : '';

    ['seesaw', 'swing', 'slide', 'ferris'].forEach(ride => {
        const badge = document.getElementById(`taman-claimed-${ride}`);
        if (badge) {
            if (playerName && tamanConfig.ticketSystemActive && tamanConfig.claimedRides.includes(ride)) {
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    });

    if (!bannerSpan) return;
    if (!tamanConfig.ticketSystemActive) {
        bannerSpan.innerHTML = `ℹ️ <strong>Sistem Tiket Sedang Tidak Aktif</strong> — Kamu tetap bisa bermain dan mengumpulkan Bintang!`;
        bannerSpan.className = "inline-block bg-amber-100 text-amber-800 font-bold px-4 py-1 rounded-full text-xs sm:text-sm shadow-sm mb-1.5 border border-amber-300";
    } else {
        const sisa = Math.max(0, 4 - tamanConfig.claimedRides.length);
        bannerSpan.innerHTML = `🎟️ Jawab <strong>semua 5 soal benar</strong> untuk meraih <strong>1 Tiket</strong> (1x per wahana • Sisa kesempatan: <strong>${sisa}/4 wahana</strong>)`;
        bannerSpan.className = "inline-block bg-white/90 text-sky-700 font-bold px-4 py-1 rounded-full text-xs sm:text-sm shadow-sm mb-1.5 border border-sky-100";
    }
}

function klaimTiketTamanKeServer(rideName, totalTiketBaru) {
    const playerName = (typeof playerCustomName !== 'undefined' && playerCustomName) ? playerCustomName : '';
    if (!playerName) return;

    tamanIsClaimingTicket = true;
    if (typeof playerTickets !== 'undefined') playerTickets = totalTiketBaru;
    if (typeof currentUserAccount !== 'undefined' && currentUserAccount) {
        currentUserAccount.tickets = totalTiketBaru;
        sessionStorage.setItem('activeUserSession', JSON.stringify(currentUserAccount));
    }
    if (typeof updatePointsDisplay === 'function') updatePointsDisplay();
    updateTamanHeaderStats();

    const url = `${TAMAN_APPS_SCRIPT_URL}?action=claimTamanTicket&player=${encodeURIComponent(playerName)}&ride=${encodeURIComponent(rideName)}&_t=${Date.now()}`;
    fetch(url)
        .then(res => res.json())
        .then(data => {
            tamanIsClaimingTicket = false;
            if (data && data.status === 'success') {
                const serverTickets = Number(data.tickets) || totalTiketBaru;
                if (typeof playerTickets !== 'undefined') playerTickets = serverTickets;
                if (typeof currentUserAccount !== 'undefined' && currentUserAccount) {
                    currentUserAccount.tickets = serverTickets;
                    sessionStorage.setItem('activeUserSession', JSON.stringify(currentUserAccount));
                }
                if (typeof updatePointsDisplay === 'function') updatePointsDisplay();
                updateTamanHeaderStats();
            }
        })
        .catch(() => { tamanIsClaimingTicket = false; });
}

// ==========================================
// 5. BANK SOAL 4 WAHANA TAMAN BERMAIN
// ==========================================
function genTamanNumberOptions(correct) {
    const set = new Set([correct]);
    while (set.size < 4) {
        const candidate = correct + (Math.floor(Math.random() * 5) - 2);
        if (candidate >= 1 && candidate <= 15) set.add(candidate);
    }
    return Array.from(set).sort(() => Math.random() - 0.5);
}

function genTamanSeesawQuestions() {
    const items = [
        { icon: '🎈', name: 'balon warna-warni' },
        { icon: '🍦', name: 'es krim manis' },
        { icon: '🧸', name: 'boneka beruang' },
        { icon: '🍎', name: 'apel merah segar' },
        { icon: '🐥', name: 'anak ayam lucu' }
    ];
    return items.map((item, i) => {
        if (i % 2 === 0) {
            const a = Math.floor(Math.random() * 5) + 2;
            const b = Math.floor(Math.random() * 5) + 1;
            const ans = a + b;
            const opts = genTamanNumberOptions(ans);
            return {
                visualHTML: `<div class="flex flex-wrap items-center justify-center gap-3 text-2xl sm:text-3xl"><div class="bg-white px-3 py-1.5 rounded-2xl border border-sky-200">${item.icon.repeat(a)}</div><span class="font-extrabold text-rose-500">+</span><div class="bg-white px-3 py-1.5 rounded-2xl border border-sky-200">${item.icon.repeat(b)}</div></div><p class="text-xs font-bold text-sky-700 mt-2">Sisi kiri ada ${a} ${item.name}, sisi kanan ada ${b} ${item.name}</p>`,
                question: `Berapa jumlah seluruh ${item.name} di kedua sisi jungkat-jungkit?`,
                options: opts.map(n => `${n} ${item.icon}`),
                correctIndex: opts.indexOf(ans),
                explanation: `Benar! ${a} ditambah ${b} sama dengan ${ans} ${item.name}.`
            };
        } else {
            const total = Math.floor(Math.random() * 5) + 5;
            const taken = Math.floor(Math.random() * 3) + 1;
            const ans = total - taken;
            const opts = genTamanNumberOptions(ans);
            return {
                visualHTML: `<div class="flex flex-wrap items-center justify-center gap-2 text-2xl sm:text-3xl bg-white px-4 py-2 rounded-2xl border border-sky-200"><span>${item.icon.repeat(ans)}</span><span class="opacity-30 line-through">${item.icon.repeat(taken)}</span></div><p class="text-xs font-bold text-sky-700 mt-2">Awalnya ada ${total} ${item.name}, lalu diambil ${taken}.</p>`,
                question: `Berapa sisa ${item.name} agar jungkat-jungkit tetap seimbang?`,
                options: opts.map(n => `${n} ${item.icon}`),
                correctIndex: opts.indexOf(ans),
                explanation: `Tepat sekali! ${total} dikurangi ${taken} menyisakan ${ans} ${item.name}.`
            };
        }
    });
}

function genTamanSwingQuestions() {
    return [
        {
            visualHTML: `<svg class="w-20 h-20" viewBox="0 0 100 100"><polygon points="50,12 12,85 88,85" fill="#F59E0B" stroke="#B45309" stroke-width="4" stroke-linejoin="round"/></svg><span class="text-xs font-bold text-amber-800 mt-1">Perhatikan jumlah sudut dan sisinya!</span>`,
            question: "Bangun datar pada kursi ayunan di atas memiliki 3 sisi. Apa namanya?",
            options: ["🔺 Segitiga", "🟦 Persegi", "⚪ Lingkaran", "⭐ Bintang"],
            correctIndex: 0,
            explanation: "Hebat! Bangun datar yang memiliki 3 sisi dan 3 titik sudut disebut Segitiga."
        },
        {
            visualHTML: `<div class="flex items-center gap-3 text-2xl font-extrabold"><div class="w-12 h-12 rounded-full bg-red-500 border-2 border-white shadow"></div><span>+</span><div class="w-12 h-12 rounded-full bg-yellow-400 border-2 border-white shadow"></div><span>=</span><div class="w-12 h-12 rounded-full bg-slate-200 border-2 border-dashed border-slate-400 flex items-center justify-center text-base">?</div></div>`,
            question: "Jika cat warna Merah dicampur dengan warna Kuning, warna apa yang terbentuk?",
            options: ["🟠 Oranye (Jingga)", "🟢 Hijau", "🟣 Ungu", "🔵 Biru"],
            correctIndex: 0,
            explanation: "Benar! Pencampuran warna Merah dan Kuning menghasilkan warna Oranye (Jingga)."
        },
        {
            visualHTML: `<svg class="w-20 h-20" viewBox="0 0 100 100"><circle cx="50" cy="50" r="38" fill="#38BDF8" stroke="#0284C7" stroke-width="4"/></svg><span class="text-xs font-bold text-sky-800 mt-1">Bentuknya bulat seperti bola atau roda!</span>`,
            question: "Bentuk apakah yang tidak memiliki sudut dan berbentuk bulat penuh seperti roda?",
            options: ["⚪ Lingkaran", "🟧 Persegi Panjang", "🔺 Segitiga", "💎 Belah Ketupat"],
            correctIndex: 0,
            explanation: "Betul! Lingkaran memiliki garis lengkung tertutup dan tidak memiliki titik sudut."
        },
        {
            visualHTML: `<div class="flex items-center gap-3 text-2xl font-extrabold"><div class="w-12 h-12 rounded-full bg-blue-500 border-2 border-white shadow"></div><span>+</span><div class="w-12 h-12 rounded-full bg-yellow-400 border-2 border-white shadow"></div><span>=</span><div class="w-12 h-12 rounded-full bg-slate-200 border-2 border-dashed border-slate-400 flex items-center justify-center text-base">?</div></div>`,
            question: "Warna Biru dicampur dengan warna Kuning akan menghasilkan warna daun, yaitu...",
            options: ["🟢 Hijau", "🟣 Ungu", "🟤 Cokelat", "🩷 Merah Muda"],
            correctIndex: 0,
            explanation: "Cerdas! Warna Biru + Kuning menghasilkan warna Hijau yang segar."
        },
        {
            visualHTML: `<svg class="w-20 h-20" viewBox="0 0 100 100"><rect x="18" y="18" width="64" height="64" rx="6" fill="#EC4899" stroke="#9D174D" stroke-width="4"/></svg><span class="text-xs font-bold text-pink-800 mt-1">Keempat sisinya sama panjang!</span>`,
            question: "Bangun datar dengan 4 sisi yang sama panjang dan 4 sudut siku-siku disebut...",
            options: ["🟥 Persegi", "🔺 Segitiga", "🥚 Oval", "🌙 Bulan Sabit"],
            correctIndex: 0,
            explanation: "Tepat sekali! Persegi memiliki empat sisi yang sama panjang."
        }
    ].sort(() => Math.random() - 0.5);
}

function genTamanSlideQuestions() {
    return [
        {
            visualHTML: `<div class="text-4xl mb-1.5">🦋</div><div class="flex gap-1.5 text-xl font-extrabold"><span class="bg-white px-2.5 py-1 rounded-lg border border-emerald-200">K</span><span class="bg-white px-2.5 py-1 rounded-lg border border-emerald-200">U</span><span class="bg-amber-100 text-amber-600 px-2.5 py-1 rounded-lg border border-dashed border-amber-400">_</span><span class="bg-white px-2.5 py-1 rounded-lg border border-emerald-200">U</span></div>`,
            question: "Huruf apa yang hilang untuk melengkapi nama hewan bersayap indah di taman ini?",
            options: ["Huruf P (KUPU)", "Huruf T (KUTU)", "Huruf M (KUMU)", "Huruf S (KUSU)"],
            correctIndex: 0,
            explanation: "Benar! K-U-P-U membentuk kata KUPU-KUPU yang suka hinggap di bunga taman."
        },
        {
            visualHTML: `<div class="flex items-center gap-3 text-3xl"><span>🌱</span><span>➡️</span><span>💧 + ☀️</span><span>➡️</span><span>🌳</span></div>`,
            question: "Agar tanaman di taman bermain tumbuh subur dan hijau, apa yang sangat dibutuhkan?",
            options: ["💧 Air & Sinar Matahari", "🍬 Permen & Es Krim", "🧸 Mainan Plastik", "❄️ Salju Beku"],
            correctIndex: 0,
            explanation: "Hebat! Tumbuhan memerlukan air, tanah subur, dan sinar matahari untuk berfotosintesis."
        },
        {
            visualHTML: `<div class="text-4xl mb-1.5">🌈</div><p class="text-xs font-bold text-sky-700">Muncul di langit setelah hujan turun saat matahari bersinar!</p>`,
            question: "Fenomena alam melengkung warna-warni di langit setelah hujan disebut...",
            options: ["🌈 Pelangi", "⚡ Petir", "🌪️ Angin Topan", "☄️ Meteor"],
            correctIndex: 0,
            explanation: "Tepat! Pelangi terjadi karena pembiasan cahaya matahari oleh tetesan air hujan."
        },
        {
            visualHTML: `<div class="text-4xl mb-1.5">🐝</div><div class="flex gap-1.5 text-xl font-extrabold"><span class="bg-white px-2.5 py-1 rounded-lg border border-emerald-200">L</span><span class="bg-amber-100 text-amber-600 px-2.5 py-1 rounded-lg border border-dashed border-amber-400">_</span><span class="bg-white px-2.5 py-1 rounded-lg border border-emerald-200">B</span><span class="bg-white px-2.5 py-1 rounded-lg border border-emerald-200">A</span><span class="bg-white px-2.5 py-1 rounded-lg border border-emerald-200">H</span></div>`,
            question: "Serangga penghasil madu manis ini bernama L _ B A H. Huruf apakah yang tepat?",
            options: ["Huruf E (LEBAH)", "Huruf O (LOBAH)", "Huruf I (LIBAH)", "Huruf U (LUBAH)"],
            correctIndex: 0,
            explanation: "Pintar! L-E-B-A-H adalah serangga rajin yang membantu penyerbukan bunga."
        },
        {
            visualHTML: `<div class="text-4xl mb-1.5">🗑️♻️</div><p class="text-xs font-bold text-emerald-700">Menjaga kebersihan taman bermain adalah tugas kita bersama.</p>`,
            question: "Jika kamu selesai makan camilan di taman bermain, di mana bungkusnya harus dibuang?",
            options: ["🗑️ Tempat Sampah", "🌿 Semak Bunga", "🛝 Atas Perosotan", "💧 Kolam Air"],
            correctIndex: 0,
            explanation: "Luar biasa! Membuang sampah di tempat sampah membuat taman tetap bersih dan sehat."
        }
    ].sort(() => Math.random() - 0.5);
}

function genTamanFerrisQuestions() {
    return [
        {
            visualHTML: `<div class="text-4xl mb-1.5">🤸‍♂️🏃‍♀️</div><p class="text-xs font-bold text-indigo-700">Gerakan ringan sebelum memulai olahraga inti!</p>`,
            question: "Sebelum mulai berolahraga lari atau bermain bola, apa yang harus kita lakukan terlebih dahulu?",
            options: ["🤸 Pemanasan", "🛌 Tidur Siang", "🍔 Makan Banyak", "📺 Menonton TV"],
            correctIndex: 0,
            explanation: "Benar! Pemanasan membuat otot tubuh siap bergerak dan mencegah cedera."
        },
        {
            visualHTML: `<div class="text-4xl mb-1.5">⚽🥅</div><p class="text-xs font-bold text-indigo-700">Olahraga tim menggunakan bola besar di lapangan rumput!</p>`,
            question: "Dalam permainan sepak bola, bagian tubuh mana yang TIDAK boleh menyentuh bola (kecuali kiper)?",
            options: ["✋ Tangan", "🦶 Kaki", "🗣️ Kepala", "🦵 Lutut"],
            correctIndex: 0,
            explanation: "Tepat sekali! Pemain sepak bola dilarang menyentuh bola dengan tangan (handball)."
        },
        {
            visualHTML: `<div class="flex items-center gap-2 text-3xl mb-1.5"><span>🥦</span><span>🍎</span><span>🥕</span><span>🥛</span></div><p class="text-xs font-bold text-emerald-700">Asupan bergizi agar tubuh kuat beraktivitas!</p>`,
            question: "Manakah di bawah ini yang termasuk makanan dan minuman sehat untuk kebugaran tubuh?",
            options: ["🥗 Sayur, Buah & Susu", "🍭 Permen & Soda", "🍟 Gorengan Berlebih", "🍫 Cokelat Setiap Jam"],
            correctIndex: 0,
            explanation: "Hebat! Sayuran, buah-buahan, dan susu kaya vitamin serta kalsium untuk pertumbuhan."
        },
        {
            visualHTML: `<div class="text-4xl mb-1.5">🦩🧍‍♂️</div><p class="text-xs font-bold text-indigo-700">Berdiri tegak dengan satu kaki terangkat seperti burung bangau!</p>`,
            question: "Gerakan meniru sikap kapal terbang atau berdiri satu kaki bertujuan melatih...",
            options: ["⚖️ Keseimbangan Tubuh", "🎤 Suara Merdu", "😴 Rasa Kantuk", "✍️ Tulisan Tangan"],
            correctIndex: 0,
            explanation: "Cerdas! Berdiri satu kaki melatih fokus dan keseimbangan tubuh."
        },
        {
            visualHTML: `<div class="text-4xl mb-1.5">🧼💧🤲</div><p class="text-xs font-bold text-sky-700">Kebiasaan bersih setelah selesai bermain di taman!</p>`,
            question: "Setelah selesai bermain di taman, mengapa kita harus mencuci tangan dengan sabun?",
            options: ["🦠 Menghilangkan Kuman", "🎨 Mewarnai Jari", "❄️ Mendinginkan Sepatu", "⏳ Membuang Waktu"],
            correctIndex: 0,
            explanation: "Luar biasa! Mencuci tangan pakai sabun membunuh kuman yang menempel setelah bermain."
        }
    ].sort(() => Math.random() - 0.5);
}

// ==========================================
// 6. KONTROL ALUR PERMAINAN TAMAN
// ==========================================
window.startTamanRide = function(rideType) {
    playTamanSound('click');
    tamanState.currentRide = rideType;
    tamanState.currentIndex = 0;
    tamanState.roundStars = 0;
    tamanState.answered = false;

    const badgeEl = document.getElementById('taman-active-badge');
    if (rideType === 'seesaw') {
        tamanState.questions = genTamanSeesawQuestions();
        badgeEl.textContent = '⚖️ Jungkat-Jungkit Angka';
        badgeEl.className = 'bg-rose-100 text-rose-700 font-extrabold px-4 py-1 rounded-full text-xs uppercase';
    } else if (rideType === 'swing') {
        tamanState.questions = genTamanSwingQuestions();
        badgeEl.textContent = '🎠 Ayunan Bentuk & Warna';
        badgeEl.className = 'bg-amber-100 text-amber-800 font-extrabold px-4 py-1 rounded-full text-xs uppercase';
    } else if (rideType === 'slide') {
        tamanState.questions = genTamanSlideQuestions();
        badgeEl.textContent = '🛝 Perosotan Pengetahuan';
        badgeEl.className = 'bg-emerald-100 text-emerald-800 font-extrabold px-4 py-1 rounded-full text-xs uppercase';
    } else {
        tamanState.questions = genTamanFerrisQuestions();
        badgeEl.textContent = '🎡 Biang Lala PJOK';
        badgeEl.className = 'bg-indigo-100 text-indigo-800 font-extrabold px-4 py-1 rounded-full text-xs uppercase';
    }

    document.getElementById('taman-map-view').classList.add('hidden');
    document.getElementById('taman-summary-view').classList.add('hidden');
    document.getElementById('taman-arena-view').classList.remove('hidden');

    renderTamanQuestion();
};

function renderTamanQuestion() {
    tamanState.answered = false;
    const q = tamanState.questions[tamanState.currentIndex];
    const total = tamanState.questions.length;

    document.getElementById('taman-question-counter').textContent = `Soal ${tamanState.currentIndex + 1}/${total}`;
    document.getElementById('taman-progress-bar').style.width = `${((tamanState.currentIndex + 1) / total) * 100}%`;
    document.getElementById('taman-visual-box').innerHTML = q.visualHTML;
    document.getElementById('taman-question-text').textContent = q.question;
    document.getElementById('taman-feedback-box').classList.add('hidden');

    const optionsGrid = document.getElementById('taman-options-grid');
    optionsGrid.innerHTML = '';

    const btnColors = [
        'bg-sky-50 hover:bg-sky-100 border-sky-200 text-sky-900',
        'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-900',
        'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-900',
        'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-900'
    ];

    q.options.forEach((optText, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `taman-btn-3d p-3 rounded-2xl border-2 font-extrabold text-sm sm:text-base text-center transition-all cursor-pointer ${btnColors[idx % btnColors.length]}`;
        btn.textContent = optText;
        btn.onclick = () => handleTamanAnswer(idx);
        optionsGrid.appendChild(btn);
    });
}

function handleTamanAnswer(selectedIndex) {
    if (tamanState.answered) return;
    tamanState.answered = true;

    const q = tamanState.questions[tamanState.currentIndex];
    const isCorrect = selectedIndex === q.correctIndex;
    const allButtons = document.getElementById('taman-options-grid').querySelectorAll('button');

    allButtons.forEach((btn, idx) => {
        btn.disabled = true;
        if (idx === q.correctIndex) {
            btn.className = 'p-3 rounded-2xl border-4 border-emerald-500 bg-emerald-100 text-emerald-900 font-extrabold text-sm sm:text-base shadow-md scale-[1.02]';
        } else if (idx === selectedIndex && !isCorrect) {
            btn.className = 'p-3 rounded-2xl border-4 border-rose-500 bg-rose-100 text-rose-900 font-extrabold text-sm sm:text-base taman-animate-shake opacity-90';
        } else {
            btn.classList.add('opacity-50');
        }
    });

    const feedbackBox = document.getElementById('taman-feedback-box');
    const feedbackTitle = document.getElementById('taman-feedback-title');
    const feedbackExp = document.getElementById('taman-feedback-exp');
    const nextBtn = document.getElementById('taman-next-btn');

    feedbackBox.classList.remove('hidden', 'bg-emerald-50', 'border-emerald-300', 'text-emerald-900', 'bg-amber-50', 'border-amber-300', 'text-amber-900');

    if (isCorrect) {
        playTamanSound('correct');
        tamanState.stars += 1;
        tamanState.roundStars += 1;
        updateTamanHeaderStats();

        feedbackBox.classList.add('bg-emerald-50', 'border-emerald-300', 'text-emerald-900');
        feedbackTitle.textContent = '🌟 Hebat! Jawabanmu Benar (+1 Bintang)';
        if (typeof confetti === 'function') confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
    } else {
        playTamanSound('wrong');
        feedbackBox.classList.add('bg-amber-50', 'border-amber-300', 'text-amber-900');
        feedbackTitle.textContent = '💡 Hampir Tepat! Ayo Kita Pelajari:';
    }

    feedbackExp.textContent = q.explanation;
    nextBtn.textContent = (tamanState.currentIndex < tamanState.questions.length - 1) ? 'Soal Berikutnya ➡️' : 'Lihat Hasil Wahana 🎉';
}

window.nextTamanQuestion = function() {
    playTamanSound('click');
    if (tamanState.currentIndex < tamanState.questions.length - 1) {
        tamanState.currentIndex++;
        renderTamanQuestion();
    } else {
        finishTamanRide();
    }
};

function finishTamanRide() {
    const totalQuestions = tamanState.questions.length;
    const isPerfectScore = tamanState.roundStars === totalQuestions;
    const playerName = (typeof playerCustomName !== 'undefined' && playerCustomName) ? playerCustomName : '';
    const alreadyClaimed = tamanConfig.claimedRides.includes(tamanState.currentRide);
    const canEarnTicket = isPerfectScore && Boolean(playerName) && tamanConfig.ticketSystemActive && !alreadyClaimed;

    if (canEarnTicket) {
        playTamanSound('win');
        const newTickets = ((typeof playerTickets !== 'undefined') ? playerTickets : 0) + 1;
        tamanConfig.claimedRides.push(tamanState.currentRide);
        klaimTiketTamanKeServer(tamanState.currentRide, newTickets);
        perbaruiBannerTiketTaman();
    } else {
        playTamanSound(isPerfectScore ? 'win' : 'click');
    }

    document.getElementById('taman-arena-view').classList.add('hidden');
    document.getElementById('taman-summary-view').classList.remove('hidden');

    document.getElementById('taman-round-stars').textContent = `+${tamanState.roundStars}`;
    const rewardCard = document.getElementById('taman-reward-card');
    const rewardLabel = document.getElementById('taman-reward-label');
    const roundTicketsEl = document.getElementById('taman-round-tickets');
    const emojiEl = document.getElementById('taman-summary-emoji');
    const subtitleEl = document.getElementById('taman-summary-subtitle');

    if (canEarnTicket) {
        emojiEl.textContent = '🏆';
        subtitleEl.textContent = `Sempurna! Semua 5 jawaban benar! +1 Tiket Hadiah telah dikirim ke akun ${playerName}!`;
        rewardCard.className = 'bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-3';
        rewardLabel.className = 'text-[10px] font-bold text-emerald-700 uppercase';
        roundTicketsEl.className = 'text-xl sm:text-2xl font-extrabold text-emerald-600';
        roundTicketsEl.textContent = '+1';
        if (typeof confetti === 'function') confetti({ particleCount: 90, spread: 85, origin: { y: 0.6 } });
    } else if (isPerfectScore && !tamanConfig.ticketSystemActive) {
        emojiEl.textContent = '🌟';
        subtitleEl.textContent = 'Sempurna! Semua 5 jawaban benar! (Sistem pembagian tiket sedang tidak aktif).';
        rewardCard.className = 'bg-slate-100 border-2 border-slate-200 rounded-2xl p-3 opacity-80';
        roundTicketsEl.textContent = 'Nonaktif';
    } else if (isPerfectScore && alreadyClaimed) {
        emojiEl.textContent = '🌟';
        subtitleEl.textContent = 'Sempurna! Kamu sudah mengambil 1 Tiket dari wahana ini sebelumnya. Coba wahana lain!';
        rewardCard.className = 'bg-amber-50 border-2 border-amber-200 rounded-2xl p-3 opacity-90';
        roundTicketsEl.textContent = 'Sudah Klaim';
    } else {
        emojiEl.textContent = '🌟';
        subtitleEl.textContent = `Kamu menjawab ${tamanState.roundStars} dari ${totalQuestions} soal dengan benar. Jawab semua 5 soal benar untuk meraih 1 Tiket!`;
        rewardCard.className = 'bg-slate-100 border-2 border-slate-200 rounded-2xl p-3 opacity-80';
        roundTicketsEl.textContent = '0';
    }
}

window.replayTamanRide = function() {
    if (tamanState.currentRide) startTamanRide(tamanState.currentRide);
};

window.returnToTamanPark = function() {
    playTamanSound('click');
    document.getElementById('taman-arena-view').classList.add('hidden');
    document.getElementById('taman-summary-view').classList.add('hidden');
    document.getElementById('taman-map-view').classList.remove('hidden');
};

function updateTamanHeaderStats() {
    const starEl = document.getElementById('taman-star-count');
    const ticketEl = document.getElementById('taman-ticket-count');
    if (starEl) starEl.textContent = tamanState.stars;
    if (ticketEl) ticketEl.textContent = (typeof playerTickets !== 'undefined') ? playerTickets : 0;

    const b1 = document.getElementById('taman-badge-1');
    const b2 = document.getElementById('taman-badge-2');
    const b3 = document.getElementById('taman-badge-3');
    const statusText = document.getElementById('taman-badge-status');
    if (!b1 || !statusText) return;

    if (tamanState.stars >= 3) {
        b1.classList.remove('opacity-40', 'bg-slate-200');
        b1.classList.add('bg-amber-100', 'border-amber-400', 'scale-110', 'shadow-sm');
        statusText.textContent = 'Lencana Perunggu terbuka! Kumpulkan 6 bintang untuk Lencana Perak.';
    }
    if (tamanState.stars >= 6) {
        b2.classList.remove('opacity-40', 'bg-slate-200');
        b2.classList.add('bg-sky-100', 'border-sky-400', 'scale-110', 'shadow-sm');
        statusText.textContent = 'Lencana Perak terbuka! Kumpulkan 10 bintang untuk Lencana Emas!';
    }
    if (tamanState.stars >= 10) {
        b3.classList.remove('opacity-40', 'bg-slate-200');
        b3.classList.add('bg-yellow-200', 'border-yellow-500', 'scale-110', 'shadow-md');
        statusText.textContent = 'Selamat! Semua Lencana Penjelajah Taman Bermain telah terbuka!';
    }
}
