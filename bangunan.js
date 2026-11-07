
// =============================================================
// BANGUNAN.JS - Pengaturan Bangunan, Peta, Tekstur & Aset
// =============================================================

// ASSETS MANAGEMENT
const ASSETS = {
    tree: new Image(),
    kelapa: new Image(),
    kelas: new Image(),
    perpus: new Image(),
    gor: new Image(),
    warung: new Image(),
    mading: new Image(),
    taman: new Image(),
    bis: new Image(),
    beach_bg: new Image(),
    male_down: new Image(),
    male_up: new Image(),
    male_left: new Image(),
    male_right: new Image(),
    female_down: new Image(),
    female_up: new Image(),
    female_left: new Image(),
    female_right: new Image()
};

let assetsLoaded = {
    tree: false, kelapa: false, kelas: false, perpus: false, gor: false, warung: false, mading: false, taman: false, bis: false, beach_bg: false,
    male_down: false, male_up: false, male_left: false, male_right: false,
    female_down: false, female_up: false, female_left: false, female_right: false
};

ASSETS.tree.src = 'assets/tree.png';
ASSETS.kelapa.src = 'assets/kelapa.png';
ASSETS.kelas.src = 'assets/kelas.png';
ASSETS.perpus.src = 'assets/perpus.png';
ASSETS.gor.src = 'assets/gor.png';
ASSETS.warung.src = 'assets/warung.png';
ASSETS.mading.src = 'assets/mading.png';
ASSETS.taman.src = 'assets/taman.png';
ASSETS.bis.src = 'assets/bis.png';
ASSETS.beach_bg.src = 'assets/beach_bg.png';

ASSETS.male_down.src = 'assets/male_down.png';
ASSETS.male_up.src = 'assets/male_up.png';
ASSETS.male_left.src = 'assets/male_left.png';
ASSETS.male_right.src = 'assets/male_right.png';

ASSETS.female_down.src = 'assets/female_down.png';
ASSETS.female_up.src = 'assets/female_up.png';
ASSETS.female_left.src = 'assets/female_left.png';
ASSETS.female_right.src = 'assets/female_right.png';

Object.keys(ASSETS).forEach(key => {
    ASSETS[key].onload = () => assetsLoaded[key] = true;
});

// KONFIGURASI MAP & BANGUNAN
const MAP_CONFIGS = {
    1: {
        id: 1,
        name: "Lokasi : Sekolah",
        themeColor: "#facc15",
        bgTileEven: "#15803d",
        bgTileOdd: "#166534",
        buildings: [
            { id: 'kelas', name: 'Ruang Kelas', icon: '🏫', x: 200, y: 100, width: 380, height: 220, color: '#fef08a', wallColor: '#eab308', roofColor: '#b91c1c', dialogTitle: 'Ruang Kelas SD', dialogText: 'Selamat datang di Ruang Kelas! Tempat belajar bersama.', actionLabel: 'Masuk Belajar' },
            { id: 'perpus', name: 'Perpustakaan', icon: '📚', x: 680, y: 100, width: 340, height: 220, color: '#bfdbfe', wallColor: '#3b82f6', roofColor: '#1e3a8a', dialogTitle: 'Perpustakaan Sekolah', dialogText: 'Ada ribuan buku cerita dan ensiklopedia.', actionLabel: 'Baca Buku' },
            { id: 'gor', name: 'Gedung Olahraga', icon: '🏀', x: 1100, y: 100, width: 420, height: 250, color: '#fed7aa', wallColor: '#f97316', roofColor: '#9a3412', dialogTitle: 'Gedung Olahraga (GOR)', dialogText: 'Area serbaguna untuk main basket dan bulu tangkis.', actionLabel: 'Olah Raga' },
            { id: 'mading', name: 'Mading Sekolah', icon: '📌', x: 1600, y: 150, width: 260, height: 180, color: '#fef3c7', wallColor: '#d97706', roofColor: '#78350f', dialogTitle: 'Mading Sekolah', dialogText: 'Papan informasi pengumuman lomba dan karya siswa.', actionLabel: 'Baca Pengumuman' },
            { id: 'warung', name: 'Warung Sekolah', icon: '🍜', x: 160, y: 800, width: 340, height: 250, color: '#fbcfe8', wallColor: '#ec4899', roofColor: '#9d174d', dialogTitle: 'Warung & Kantin Sekolah', dialogText: 'Aroma jajanan lezat seperti mi goreng melezatkan.', actionLabel: 'Beli Jajanan' },
            { id: 'taman', name: 'Taman Sekolah', icon: '🌻', x: 1400, y: 750, width: 380, height: 280, color: '#86efac', wallColor: '#22c55e', roofColor: '#15803d', isZone: true, dialogTitle: 'Taman Bunga Sekolah', dialogText: 'Taman asri dengan bunga warna-warni untuk bersantai.', actionLabel: 'Bersantai' },
            { id: 'bis', name: 'Bis Sekolah (Ke Pantai)', icon: '🚌', x: 800, y: 820, width: 220, height: 120, isPortal: true, targetLocation: 2, dialogTitle: 'Bis Sekolah Menuju Pantai', dialogText: 'Bis kuning sekolah siap mengantar Anda bertamasya ke Area Pantai yang indah!', actionLabel: 'Naik Bis ke Pantai' }
        ]
    },
    2: {
        id: 2,
        name: "Lokasi : Pantai",
        themeColor: "#38bdf8",
        buildings: [
            { 
                id: 'bis_kembali', 
                name: 'Bis Sekolah (Kembali ke Sekolah)', 
                icon: '🚌', 
                x: 80, 
                y: 160, 
                width: 140, 
                height: 90, 
                isPortal: true, 
                targetLocation: 1, 
                dialogTitle: 'Bis Sekolah di Parkiran Pantai', 
                dialogText: 'Bis sekolah terparkir pas di dalam petak parkiran sebelah kiri. Siap mengantar Anda kembali ke Sekolah.', 
                actionLabel: 'Naik Bis ke Sekolah' 
            }
        ]
    }
};

let currentBuildings = MAP_CONFIGS[1].buildings;
const trees = [];
const NUM_TREES = 8;

function generateTrees() {
    trees.length = 0;
    if (currentWorldLocation === 1) {
        for (let i = 0; i < NUM_TREES; i++) {
            let tx, ty, dist, insideBuilding;
            do {
                tx = 350 + Math.random() * (MAP_WIDTH - 400);
                ty = 350 + Math.random() * (MAP_HEIGHT - 450);
                dist = Math.hypot(tx - 1000, ty - 600);
                insideBuilding = currentBuildings.some(b => 
                    tx > b.x - 40 && tx < b.x + b.width + 40 &&
                    ty > b.y - 40 && ty < b.y + b.height + 40
                );
            } while (dist < 200 || insideBuilding);
            trees.push({ x: tx, y: ty, size: 35 + Math.random() * 20, trunkHeight: 25 + Math.random() * 10, isKelapa: false });
        }
    } else if (currentWorldLocation === 2) {
        // Posisi pohon kelapa disesuaikan di area pasir terbuka (luar area parkir & jalan)
        const kelapaPositions = [
            { x: 380, y: 140, size: 45 },  // Di sebelah kanan atas luar pagar parkiran
            { x: 420, y: 380, size: 50 },  // Di area pasir terbuka tengah-atas
            { x: 680, y: 360, size: 48 },  // Di area pasir sebelum tikungan jalan
            { x: 860, y: 550, size: 52 },  // Di sekitar pasir mendekati dermaga
            { x: 320, y: 640, size: 46 }   // Di pasir bagian bawah/pantai pasir kiri
        ];
        kelapaPositions.forEach(pos => {
            trees.push({ x: pos.x, y: pos.y, size: pos.size, trunkHeight: 30, isKelapa: true });
        });
    }
    trees.sort((a, b) => a.y - b.y);
}

function drawMap(cameraX, cameraY, zoomScale) {
    ctx.save();
    ctx.scale(zoomScale, zoomScale);

    if (currentWorldLocation === 2) {
        if (assetsLoaded.beach_bg) {
            ctx.drawImage(ASSETS.beach_bg, -cameraX, -cameraY, MAP_WIDTH, MAP_HEIGHT);
        } else {
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(0, 0, canvas.width / zoomScale, canvas.height / zoomScale);
        }
    } else {
        const tileSize = 100;
        const startCol = Math.floor(cameraX / tileSize);
        const endCol = startCol + Math.ceil((canvas.width / zoomScale) / tileSize) + 1;
        const startRow = Math.floor(cameraY / tileSize);
        const endRow = startRow + Math.ceil((canvas.height / zoomScale) / tileSize) + 1;

        for (let c = startCol; c <= endCol; c++) {
            for (let r = startRow; r <= endRow; r++) {
                const tileX = c * tileSize - cameraX;
                const tileY = r * tileSize - cameraY;
                ctx.fillStyle = (c + r) % 2 === 0 ? '#15803d' : '#166534';
                ctx.fillRect(tileX, tileY, tileSize, tileSize);
            }
        }
    }

    currentBuildings.forEach(b => {
        const bx = b.x - cameraX;
        const by = b.y - cameraY;

        if (b.isPortal) {
            const imgAsset = ASSETS.bis;
            if (assetsLoaded.bis) {
                ctx.drawImage(imgAsset, bx, by, b.width, b.height);
            } else {
                ctx.fillStyle = '#fde047';
                ctx.fillRect(bx, by, b.width, b.height);
            }
        } else {
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.ellipse(bx + b.width / 2, by + b.height + 5, b.width * 0.52, 15, 0, 0, Math.PI * 2);
            ctx.fill();

            if (b.isZone) {
                if (assetsLoaded.taman) {
                    ctx.drawImage(ASSETS.taman, bx, by, b.width, b.height);
                } else {
                    ctx.fillStyle = '#86efac';
                    ctx.fillRect(bx, by, b.width, b.height);
                }
            } else {
                const imgAsset = ASSETS[b.id];
                if (assetsLoaded[b.id]) {
                    ctx.drawImage(imgAsset, bx, by, b.width, b.height);
                } else {
                    ctx.fillStyle = b.roofColor;
                    ctx.fillRect(bx, by, b.width, b.height);
                }
            }
        }

        ctx.save();
        ctx.font = 'bold 14px Fredoka';
        const labelText = `${b.icon} ${b.name}`;
        const textWidth = ctx.measureText(labelText).width;
        const signX = bx + b.width / 2;
        const signY = by - 22;

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.roundRect(signX - (textWidth + 20) / 2, signY - 12, textWidth + 20, 24, 12);
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, signX, signY);
        ctx.restore();
    });

    ctx.restore();
}

function drawTree(tree, cameraX, cameraY, zoomScale) {
    ctx.save();
    ctx.scale(zoomScale, zoomScale);

    const tx = tree.x - cameraX;
    const ty = tree.y - cameraY;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath();
    ctx.ellipse(tx, ty + 2, tree.size * 0.85, tree.size * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    if (tree.isKelapa && assetsLoaded.kelapa) {
        const imgW = tree.size * 2.2;
        const imgH = tree.size * 2.8;
        ctx.drawImage(ASSETS.kelapa, tx - imgW / 2, ty - imgH + 10, imgW, imgH);
        ctx.restore();
        return;
    }

    if (assetsLoaded.tree) {
        const imgW = tree.size * 2.2;
        const imgH = tree.size * 2.5;
        ctx.drawImage(ASSETS.tree, tx - imgW / 2, ty - imgH + 10, imgW, imgH);
        ctx.restore();
        return;
    }

    ctx.fillStyle = '#78350f';
    ctx.fillRect(tx - tree.size * 0.2, ty - tree.trunkHeight, tree.size * 0.4, tree.trunkHeight);
    ctx.fillStyle = '#14532d';
    ctx.beginPath();
    ctx.arc(tx, ty - tree.trunkHeight - tree.size * 0.4, tree.size, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function checkBuildingProximity() {
    nearbyBuilding = null;
    const actionBtn = document.getElementById('btnInteract');

    for (let b of currentBuildings) {
        const centerX = b.x + b.width / 2;
        const centerY = b.y + b.height / 2;
        const rangeX = b.width / 2 + 50;
        const rangeY = b.height / 2 + 50;

        if (Math.abs(player.x - centerX) < rangeX && Math.abs(player.y - centerY) < rangeY) {
            nearbyBuilding = b;
            break;
        }
    }

    if (nearbyBuilding) {
        if (actionBtn) actionBtn.classList.add('btn-action-highlight');
    } else {
        if (actionBtn) actionBtn.classList.remove('btn-action-highlight');
    }
}
