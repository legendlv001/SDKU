// ==========================================
// KONFIGURASI, VISUAL & INTERAKSI KHUSUS LOKASI 2 (PANTAI)
// ==========================================

const PANTAI_CONFIG = {
    id: 2,
    name: "Lokasi : Pantai",
    themeColor: "#38bdf8",
    spawnPoint: { x: 240, y: 240 },
    buildings: [
        { 
            id: 'bis_kembali', 
            name: 'Bis Sekolah (Ke Sekolah)', 
            icon: '🚌', 
            x: 80, 
            y: 160, 
            width: 140, 
            height: 90, 
            isPortal: true, 
            targetLocation: 1, 
            dialogTitle: 'Bis Sekolah di Parkiran', 
            dialogText: 'Terparkir rapi di parkiran. Siap kembali ke Sekolah.', 
            actionLabel: 'Naik Bis ke Sekolah' 
        }
        // Contoh jika nanti ingin menambah aktivitas di pantai:
        // { id: 'dermaga_pancing', name: 'Spot Memancing', icon: '🎣', x: 1100, y: 750, width: 220, height: 140, customPantaiAction: 'memancing', dialogTitle: 'Dermaga Memancing', actionLabel: 'Mulai Memancing' }
    ]
};

// Daftarkan Lokasi 2 ke MAP_CONFIGS utama
if (typeof MAP_CONFIGS !== 'undefined') {
    MAP_CONFIGS[2] = PANTAI_CONFIG;
}

// 1. Atur titik muncul (spawn point) karakter saat tiba di Pantai
function initPantaiSpawn(playerObj) {
    if (!playerObj) return;
    playerObj.x = PANTAI_CONFIG.spawnPoint.x;
    playerObj.y = PANTAI_CONFIG.spawnPoint.y;
}

// 2. Hasilkan posisi pohon kelapa khusus di area Pantai
function generatePantaiTrees(treesArray) {
    if (!Array.isArray(treesArray)) return;
    const kelapaPositions = [
        { x: 380, y: 140, size: 45 }, 
        { x: 420, y: 380, size: 50 }, 
        { x: 680, y: 360, size: 48 }, 
        { x: 860, y: 550, size: 52 }, 
        { x: 320, y: 640, size: 46 }
    ];
    kelapaPositions.forEach(pos => { 
        treesArray.push({ x: pos.x, y: pos.y, size: pos.size, trunkHeight: 30, isKelapa: true }); 
    });
}

// 3. Gambar latar belakang area Pantai
function drawPantaiBackground(ctx, canvas, cameraX, cameraY, zoomScale) {
    if (typeof assetsLoaded !== 'undefined' && assetsLoaded.beach_bg && ASSETS.beach_bg) {
        ctx.drawImage(ASSETS.beach_bg, -cameraX, -cameraY, MAP_WIDTH, MAP_HEIGHT);
    } else { 
        ctx.fillStyle = '#38bdf8'; 
        ctx.fillRect(0, 0, canvas.width / zoomScale, canvas.height / zoomScale); 
    }
}

// 4. Tangani interaksi khusus objek di area Pantai
// Mengembalikan true jika ditangani oleh pantai.js, atau false jika pakai default game.js
function handlePantaiInteraction(building) {
    if (!building) return false;

    if (building.sheetName || building.isPortal || building.targetUrl) {
        return false;
    }

    // Contoh interaksi kustom di Pantai
    if (building.customPantaiAction === 'memancing') {
        const modalTitle = document.getElementById('modalTitle');
        const modalContent = document.getElementById('modalContent');
        const modalActions = document.getElementById('modalActions');

        if (modalTitle) modalTitle.innerHTML = `${building.icon} ${building.dialogTitle}`;
        if (modalContent) {
            modalContent.innerHTML = `
                <div class="p-3 bg-sky-950/80 border border-sky-500/40 rounded-xl text-sky-200 text-xs leading-relaxed">
                    Air laut sangat jernih hari ini! Fitur mini-game memancing siap ditambahkan di sini.
                </div>
            `;
        }
        if (modalActions) {
            modalActions.innerHTML = `<button onclick="closeModal()" class="px-5 py-2 bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold rounded-xl text-xs transition">Tutup</button>`;
        }
        document.getElementById('dialogModal').classList.remove('hidden');
        return true;
    }

    return false;
}
