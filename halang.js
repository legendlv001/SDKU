// ==========================================
// SISTEM & DATA TILE COLLISION UNTUK SEMUA LOKASI (halang.js)
// ==========================================

const SHOW_COLLISION_DEBUG = false;

const HALANG_DATA = {
    1: [
        { x: 200, y: 100, width: 380, height: 185 },   // Gedung Ruang Kelas
        { x: 680, y: 100, width: 340, height: 185 },   // Perpustakaan
        { x: 1100, y: 100, width: 420, height: 215 },  // Gedung Olahraga (GOR)
        { x: 1600, y: 150, width: 260, height: 145 },  // Mading Sekolah
        { x: 160, y: 800, width: 340, height: 215 },   // Warung Sekolah
        { x: 800, y: 820, width: 220, height: 85 }     // Bis Sekolah
    ],
    2: [
        { x: 80, y: 160, width: 140, height: 75 }      // Bis Sekolah di Parkiran Pantai
    ],
    3: [
        { x: 0, y: 0, width: 2000, height: 65 },       // Dinding atas
        { x: 0, y: 1120, width: 2000, height: 80 },    // Dinding bawah
        { x: 0, y: 0, width: 35, height: 1200 },       // Dinding kiri
        { x: 1965, y: 0, width: 35, height: 1200 },    // Dinding kanan
        { x: 1650, y: 80, width: 230, height: 150 },   // Meja Guru (Kuning pojok kanan atas)
        { x: 35, y: 930, width: 310, height: 190 },    // Rak buku pojok kiri bawah
        { x: 365, y: 1030, width: 220, height: 90 }    // Kotak kontainer warna-warni bawah
    ]
};

function isCollidingWithMap(nextX, nextY) {
    const hitW = 24;
    const hitH = 18;
    const left = nextX - hitW / 2;
    const right = nextX + hitW / 2;
    const top = nextY + 6;
    const bottom = nextY + 6 + hitH;

    const maxW = (typeof MAP_WIDTH !== 'undefined') ? MAP_WIDTH : 2000;
    const maxH = (typeof MAP_HEIGHT !== 'undefined') ? MAP_HEIGHT : 1200;
    if (left < 15 || right > maxW - 15 || top < 15 || bottom > maxH - 15) {
        return true;
    }

    const locId = (typeof currentWorldLocation !== 'undefined') ? currentWorldLocation : 1;
    const obstacles = HALANG_DATA[locId];

    if (Array.isArray(obstacles)) {
        for (let box of obstacles) {
            if (right > box.x && left < box.x + box.width && bottom > box.y && top < box.y + box.height) {
                return true;
            }
        }
    }

    return false;
}

function drawCollisionDebug(ctx, cameraX, cameraY, zoomScale) {
    if (!SHOW_COLLISION_DEBUG) return;
    const locId = (typeof currentWorldLocation !== 'undefined') ? currentWorldLocation : 1;
    const obstacles = HALANG_DATA[locId];
    if (!Array.isArray(obstacles)) return;

    ctx.save();
    ctx.scale(zoomScale, zoomScale);
    ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.9)';
    ctx.lineWidth = 2;

    obstacles.forEach(box => {
        ctx.fillRect(box.x - cameraX, box.y - cameraY, box.width, box.height);
        ctx.strokeRect(box.x - cameraX, box.y - cameraY, box.width, box.height);
    });
    ctx.restore();
}
