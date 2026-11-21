// ==========================================
// KONFIGURASI PETA, BANGUNAN & LINGKUNGAN (LOKASI 1: SEKOLAH)
// ==========================================

// Memuat tekstur rumput untuk Lokasi 1 (Sekolah)
const rumputBgImg = new Image();
rumputBgImg.src = 'assets/rumput_bg.png';

// Memuat gambar bangunan (opsional jika file gambar tersedia di folder assets)
const buildingSprites = {};
function getBuildingSprite(src) {
    if (!src) return null;
    if (!buildingSprites[src]) {
        const img = new Image();
        img.src = src;
        buildingSprites[src] = img;
    }
    return buildingSprites[src];
}

// Konfigurasi seluruh lokasi (Lokasi 1: Sekolah, Lokasi 2: Pantai, Lokasi 3: Ruang Kelas)
const MAP_CONFIGS = {
    1: {
        name: "Lokasi : Sekolah",
        buildings: [
            {
                id: "ruang_kelas",
                name: "Ruang Kelas",
                icon: "🏫",
                x: 240,
                y: 120,
                width: 240,
                height: 150,
                wallColor: "#fef3c7",
                roofColor: "#dc2626",
                doorColor: "#78350f",
                isPortal: true,
                targetLocation: 3,
                dialogTitle: "Ruang Kelas Belajar",
                dialogText: "Masuk ke dalam Ruang Kelas untuk belajar materi dan mengerjakan kuis berhadiah poin!"
            },
            {
                id: "perpustakaan",
                name: "Perpustakaan",
                icon: "📚",
                x: 620,
                y: 120,
                width: 220,
                height: 150,
                wallColor: "#e0f2fe",
                roofColor: "#0284c7",
                doorColor: "#1e3a8a",
                sheetName: "Perpus",
                dialogTitle: "Perpustakaan Sekolah",
                dialogText: "Koleksi buku digital dan tautan sumber belajar."
            },
            {
                id: "kantin_toko",
                name: "Warung / Kantin",
                icon: "🏪",
                x: 1020,
                y: 130,
                width: 220,
                height: 145,
                wallColor: "#fef9c3",
                roofColor: "#ea580c",
                doorColor: "#7c2d12",
                sheetName: "Toko",
                dialogTitle: "Kantin / Warung Sekolah",
                dialogText: "Tukarkan Poin dan Tiket dengan kostum keren!"
            },
            {
                id: "lapangan_pjok",
                name: "Gelanggang PJOK",
                icon: "🏀",
                x: 1420,
                y: 130,
                width: 240,
                height: 150,
                wallColor: "#ffedd5",
                roofColor: "#d97706",
                doorColor: "#451a03",
                sheetName: "PJOK",
                dialogTitle: "Kegiatan & Permainan PJOK",
                dialogText: "Pilih permainan edukasi olahraga yang tersedia."
            },
            {
                id: "papan_info",
                name: "Papan Pengumuman",
                icon: "📌",
                x: 490,
                y: 440,
                width: 90,
                height: 65,
                wallColor: "#fde68a",
                roofColor: "#92400e",
                doorColor: "#78350f",
                sheetName: "Info",
                dialogTitle: "Papan Pengumuman Sekolah",
                dialogText: "Informasi terbaru seputar kegiatan sekolah."
            },
            {
                id: "gerbang_pantai",
                name: "Gerbang Ke Pantai",
                icon: "🏖️",
                x: 1780,
                y: 520,
                width: 140,
                height: 170,
                wallColor: "#bae6fd",
                roofColor: "#0ea5e9",
                doorColor: "#0369a1",
                isPortal: true,
                targetLocation: 2,
                dialogTitle: "Menuju Area Pantai",
                dialogText: "Berangkat menuju kawasan wisata & edukasi Pantai."
            }
        ]
    },
    2: {
        name: "Lokasi : Pantai",
        buildings: (typeof PANTAI_BUILDINGS !== 'undefined') ? PANTAI_BUILDINGS : [
            {
                id: "kembali_sekolah_pantai",
                name: "Kembali Ke Sekolah",
                icon: "🏫",
                x: 80,
                y: 180,
                width: 120,
                height: 140,
                wallColor: "#fef3c7",
                roofColor: "#dc2626",
                doorColor: "#78350f",
                isPortal: true,
                targetLocation: 1,
                dialogTitle: "Gerbang Sekolah",
                dialogText: "Kembali ke area halaman sekolah."
            }
        ]
    },
    3: {
        name: "Lokasi : Ruang Kelas",
        buildings: [
            {
                id: "papan_tulis_materi",
                name: "Papan Tulis Materi",
                icon: "🧑‍🏫",
                x: 340,
                y: 120,
                width: 280,
                height: 95,
                wallColor: "#064e3b",
                roofColor: "#78350f",
                doorColor: "#065f46",
                sheetName: "Materi",
                dialogTitle: "Papan Tulis Materi Kelas",
                dialogText: "Baca ringkasan materi pelajaran hari ini."
            },
            {
                id: "meja_kuis",
                name: "Meja Kuis Berhadiah",
                icon: "📝",
                x: 760,
                y: 130,
                width: 220,
                height: 100,
                wallColor: "#fef3c7",
                roofColor: "#4f46e5",
                doorColor: "#312e81",
                sheetName: "Kuis",
                dialogTitle: "Latihan Soal & Kuis Kelas",
                dialogText: "Jawab pertanyaan dengan benar untuk mendapatkan tambahan Poin!"
            },
            {
                id: "pintu_keluar_kelas",
                name: "Pintu Keluar Kelas",
                icon: "🚪",
                x: 310,
                y: 660,
                width: 120,
                height: 80,
                wallColor: "#fde68a",
                roofColor: "#92400e",
                doorColor: "#78350f",
                isPortal: true,
                targetLocation: 1,
                dialogTitle: "Keluar Ruang Kelas",
                dialogText: "Kembali ke halaman sekolah."
            }
        ]
    }
};

let currentBuildings = MAP_CONFIGS[1].buildings;
let trees = [];

// Membuat pohon dekorasi secara rapi di tepi & area kosong
function generateTrees() {
    trees = [];
    if (currentWorldLocation !== 1) return;

    const treeCoords = [
        { x: 90, y: 120 }, { x: 90, y: 340 }, { x: 90, y: 600 }, { x: 90, y: 880 }, { x: 90, y: 1100 },
        { x: 320, y: 980 }, { x: 650, y: 980 }, { x: 980, y: 980 }, { x: 1320, y: 980 }, { x: 1650, y: 980 },
        { x: 920, y: 450 }, { x: 1320, y: 460 }, { x: 1890, y: 160 }, { x: 1890, y: 920 }
    ];

    treeCoords.forEach(pt => {
        trees.push({
            x: pt.x,
            y: pt.y,
            radius: 26
        });
    });
}

// Menggambar latar peta, jalan setapak, dan seluruh bangunan
function drawMap(cameraX, cameraY, zoomScale) {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // 1. LATAR BELAKANG DASAR SESUAI LOKASI
    if (currentWorldLocation === 1) {
        // Warna cadangan saat rumput_bg.png masih loading
        ctx.fillStyle = '#15803d';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Gambar tekstur rumput_bg.png di Lokasi 1
        if (rumputBgImg.complete && rumputBgImg.naturalWidth > 0) {
            ctx.save();
            ctx.scale(zoomScale, zoomScale);
            ctx.translate(-cameraX, -cameraY);

            const pattern = ctx.createPattern(rumputBgImg, 'repeat');
            if (pattern) {
                ctx.fillStyle = pattern;
                ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
            } else {
                ctx.drawImage(rumputBgImg, 0, 0, MAP_WIDTH, MAP_HEIGHT);
            }
            ctx.restore();
        }
    } else if (currentWorldLocation === 2) {
        if (typeof drawPantaiBackground === 'function') {
            drawPantaiBackground(ctx, cameraX, cameraY, zoomScale);
        } else {
            ctx.fillStyle = '#fde68a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    } else if (currentWorldLocation === 3) {
        // Lantai keramik ruang kelas
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.save();
    ctx.scale(zoomScale, zoomScale);
    ctx.translate(-cameraX, -cameraY);

    // 2. JALAN SETAPAK & LAPANGAN UPACARA (KHUSUS LOKASI 1)
    if (currentWorldLocation === 1) {
        // Jalan utama horizontal
        ctx.fillStyle = 'rgba(203, 213, 225, 0.88)';
        ctx.fillRect(160, 320, 1620, 75);

        // Jalan vertikal penghubung ke lapangan & gerbang pantai
        ctx.fillRect(340, 320, 70, 480);
        ctx.fillRect(1690, 320, 75, 310);

        // Garis tepi jalan
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.7)';
        ctx.lineWidth = 3;
        ctx.strokeRect(160, 320, 1620, 75);

        // Lapangan Upacara Sekolah
        ctx.fillStyle = 'rgba(148, 163, 184, 0.85)';
        ctx.fillRect(620, 560, 640, 320);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.strokeRect(620, 560, 640, 320);

        // Tiang Bendera di Lapangan
        ctx.fillStyle = '#475569';
        ctx.fillRect(936, 485, 8, 75);
        // Bendera Merah Putih
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(944, 487, 36, 12);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(944, 499, 36, 12);
    }

    // 3. MENGGAMBAR SEMUA BANGUNAN / OBJEK INTERAKTIF
    if (Array.isArray(currentBuildings)) {
        currentBuildings.forEach(b => {
            if (b.isSilentZone) return;

            // Bayangan bangunan
            ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
            ctx.fillRect(b.x + 8, b.y + 10, b.width, b.height);

            // Jika bangunan punya gambar sprite custom
            if (b.spriteSrc) {
                const bImg = getBuildingSprite(b.spriteSrc);
                if (bImg && bImg.complete && bImg.naturalWidth > 0) {
                    ctx.drawImage(bImg, b.x, b.y, b.width, b.height);
                }
            } else {
                // Dinding bangunan
                ctx.fillStyle = b.wallColor || '#f8fafc';
                ctx.fillRect(b.x, b.y + b.height * 0.35, b.width, b.height * 0.65);
                ctx.strokeStyle = '#1e293b';
                ctx.lineWidth = 3;
                ctx.strokeRect(b.x, b.y + b.height * 0.35, b.width, b.height * 0.65);

                // Atap bangunan
                ctx.fillStyle = b.roofColor || '#dc2626';
                ctx.beginPath();
                ctx.moveTo(b.x - 10, b.y + b.height * 0.38);
                ctx.lineTo(b.x + b.width / 2, b.y);
                ctx.lineTo(b.x + b.width + 10, b.y + b.height * 0.38);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // Pintu bangunan
                const doorW = Math.min(38, b.width * 0.24);
                const doorH = Math.min(48, b.height * 0.36);
                ctx.fillStyle = b.doorColor || '#78350f';
                ctx.fillRect(b.x + b.width / 2 - doorW / 2, b.y + b.height - doorH, doorW, doorH);
            }

            // Label papan nama bangunan di atas atap
            const labelText = `${b.icon || ''} ${b.name}`;
            ctx.font = 'bold 12px Fredoka, sans-serif';
            const textWidth = ctx.measureText(labelText).width;
            const badgeW = textWidth + 18;
            const badgeH = 24;
            const badgeX = b.x + b.width / 2 - badgeW / 2;
            const badgeY = b.y - 30;

            ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 8);
            } else {
                ctx.rect(badgeX, badgeY, badgeW, badgeH);
            }
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#fde047';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(labelText, b.x + b.width / 2, badgeY + badgeH / 2);

            // Sorotan zona interaksi jika pemain berada di dekat pintu bangunan
            if (typeof nearbyBuilding !== 'undefined' && nearbyBuilding && nearbyBuilding.id === b.id) {
                ctx.strokeStyle = '#facc15';
                ctx.lineWidth = 3;
                ctx.setLineDash([6, 4]);
                ctx.strokeRect(b.x - 8, b.y - 8, b.width + 16, b.height + 24);
                ctx.setLineDash([]);
            }
        });
    }

    ctx.restore();
}

// Menggambar pohon
function drawTree(tree, cameraX, cameraY, zoomScale) {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    ctx.save();
    ctx.scale(zoomScale, zoomScale);
    ctx.translate(-cameraX, -cameraY);

    // Bayangan pohon
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.beginPath();
    ctx.ellipse(tree.x, tree.y + 8, 24, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Batang pohon
    ctx.fillStyle = '#78350f';
    ctx.fillRect(tree.x - 6, tree.y - 26, 12, 32);

    // Daun rimbun bertingkat
    ctx.fillStyle = '#166534';
    ctx.beginPath();
    ctx.arc(tree.x, tree.y - 38, 28, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(tree.x - 6, tree.y - 44, 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// Deteksi tabrakan pemain dengan dinding bangunan, pohon, atau batas peta
function isCollidingWithMap(nextX, nextY) {
    const margin = 22;
    if (nextX < margin || nextX > MAP_WIDTH - margin || nextY < margin || nextY > MAP_HEIGHT - margin) {
        return true;
    }

    if (Array.isArray(currentBuildings)) {
        for (let i = 0; i < currentBuildings.length; i++) {
            const b = currentBuildings[i];
            if (b.isSilentZone || b.noCollision) continue;

            // Area padat bangunan (bagian badan bangunan)
            const solidTop = b.y + b.height * 0.25;
            const solidBottom = b.y + b.height - 6;
            const solidLeft = b.x + 6;
            const solidRight = b.x + b.width - 6;

            if (nextX + 12 > solidLeft && nextX - 12 < solidRight &&
                nextY + 12 > solidTop && nextY - 8 < solidBottom) {
                return true;
            }
        }
    }

    if (Array.isArray(trees)) {
        for (let i = 0; i < trees.length; i++) {
            const t = trees[i];
            if (Math.hypot(nextX - t.x, nextY - t.y) < 18) {
                return true;
            }
        }
    }

    return false;
}

// Mengecek bangunan terdekat untuk mengaktifkan tombol AKSI
function checkNearbyBuilding(px, py) {
    nearbyBuilding = null;
    if (!Array.isArray(currentBuildings)) return null;

    for (let i = 0; i < currentBuildings.length; i++) {
        const b = currentBuildings[i];
        const interactPad = 38;
        if (px >= b.x - interactPad && px <= b.x + b.width + interactPad &&
            py >= b.y - interactPad && py <= b.y + b.height + interactPad) {
            nearbyBuilding = b;
            break;
        }
    }

    const btnInteract = document.getElementById('btnInteract');
    if (btnInteract) {
        if (nearbyBuilding) {
            btnInteract.classList.add('btn-action-highlight');
        } else {
            btnInteract.classList.remove('btn-action-highlight');
        }
    }

    return nearbyBuilding;
}
