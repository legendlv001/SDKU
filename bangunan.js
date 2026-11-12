// ==========================================
// ASSET LOADER & MAP CONFIGURATIONS
// ==========================================
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
    male_sprite: new Image(), 
    female_sprite: new Image(),
    kelas_inside: new Image()
};

let assetsLoaded = { 
    tree: false, 
    kelapa: false, 
    kelas: false, 
    perpus: false, 
    gor: false, 
    warung: false, 
    mading: false, 
    taman: false, 
    bis: false, 
    beach_bg: false, 
    male_sprite: false, 
    female_sprite: false, 
    kelas_inside: false 
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
ASSETS.male_sprite.src = 'assets/male_sprite.png'; 
ASSETS.female_sprite.src = 'assets/female_sprite.png';
ASSETS.kelas_inside.src = 'assets/Sprite-0001.png';

Object.keys(ASSETS).forEach(key => { 
    ASSETS[key].onload = () => assetsLoaded[key] = true; 
});

const MAP_CONFIGS = {
    1: { 
        id: 1, 
        name: "Lokasi : Sekolah", 
        themeColor: "#facc15", 
        buildings: [
            { id: 'kelas', name: 'Ruang Kelas', icon: '🏫', x: 200, y: 100, width: 380, height: 220, isPortal: true, targetLocation: 3, color: '#fef08a', wallColor: '#eab308', roofColor: '#b91c1c', dialogTitle: 'Ruang Kelas SD', dialogText: 'Selamat datang di Ruang Kelas!', actionLabel: 'Masuk Kelas' },
            { id: 'perpus', name: 'Perpustakaan', icon: '📚', x: 680, y: 100, width: 340, height: 220, sheetName: 'Perpus', color: '#bfdbfe', wallColor: '#3b82f6', roofColor: '#1e3a8a', dialogTitle: 'Perpustakaan Digital', actionLabel: 'Buka Perpus' },
            { id: 'gor', name: 'Gedung Olahraga', icon: '🏀', x: 1100, y: 100, width: 420, height: 250, sheetName: 'PJOK', color: '#fed7aa', wallColor: '#f97316', roofColor: '#9a3412', dialogTitle: 'Gedung Olahraga (GOR)', actionLabel: 'Masuk GOR' },
            { id: 'mading', name: 'Mading Sekolah', icon: '📌', x: 1600, y: 150, width: 260, height: 180, sheetName: 'Info', color: '#fef3c7', wallColor: '#d97706', roofColor: '#78350f', dialogTitle: 'Mading Informasi', actionLabel: 'Baca Mading' },
            { id: 'warung', name: 'Warung Sekolah', icon: '🍜', x: 160, y: 800, width: 340, height: 250, sheetName: 'Toko', color: '#fbcfe8', wallColor: '#ec4899', roofColor: '#9d174d', dialogTitle: 'Kantin / Warung', actionLabel: 'Buka Warung' },
            { id: 'taman', name: 'Taman Sekolah', icon: '🌻', x: 1400, y: 750, width: 380, height: 280, sheetName: 'Taman', color: '#86efac', wallColor: '#22c55e', roofColor: '#15803d', isZone: true, dialogTitle: 'Taman Bunga', actionLabel: 'Lihat Taman' },
            { id: 'bis', name: 'Bis Sekolah (Ke Pantai)', icon: '🚌', x: 800, y: 820, width: 220, height: 120, isPortal: true, targetLocation: 2, dialogTitle: 'Bis Sekolah Ke Pantai', dialogText: 'Bis kuning sekolah siap mengantar ke Pantai!', actionLabel: 'Naik Bis ke Pantai' }
        ]
    },
    2: { 
        id: 2, 
        name: "Lokasi : Pantai", 
        themeColor: "#38bdf8", 
        buildings: [
            { id: 'bis_kembali', name: 'Bis Sekolah (Ke Sekolah)', icon: '🚌', x: 80, y: 160, width: 140, height: 90, isPortal: true, targetLocation: 1, dialogTitle: 'Bis Sekolah di Parkiran', dialogText: 'Terparkir rapi di parkiran. Siap kembali ke Sekolah.', actionLabel: 'Naik Bis ke Sekolah' }
        ]
    },
    3: { 
        id: 3, 
        name: "Lokasi : Ruang Kelas (Interior)", 
        themeColor: "#22c55e", 
        buildings: [
            { id: 'pintu_keluar', name: 'Pintu Keluar', icon: '🚪', x: 20, y: 730, width: 100, height: 110, isPortal: true, targetLocation: 1, dialogTitle: 'Keluar Gedung Kelas', dialogText: 'Kembali ke Halaman Sekolah.', actionLabel: 'Keluar Halaman' }
        ]
    }
};

let currentBuildings = MAP_CONFIGS[1].buildings;
const trees = [];
const NUM_TREES = 8;

function generateTrees() {
    trees.length = 0;
    if (typeof currentWorldLocation !== 'undefined' && currentWorldLocation === 1) {
        for (let i = 0; i < NUM_TREES; i++) {
            let tx, ty, dist, insideBuilding;
            do {
                tx = 350 + Math.random() * (MAP_WIDTH - 400);
                ty = 350 + Math.random() * (MAP_HEIGHT - 450);
                dist = Math.hypot(tx - 1000, ty - 600);
                insideBuilding = currentBuildings.some(b => tx > b.x - 40 && tx < b.x + b.width + 40 && ty > b.y - 40 && ty < b.y + b.height + 40);
            } while (dist < 200 || insideBuilding);
            trees.push({ x: tx, y: ty, size: 35 + Math.random() * 20, trunkHeight: 25 + Math.random() * 10, isKelapa: false });
        }
    } else if (typeof currentWorldLocation !== 'undefined' && currentWorldLocation === 2) {
        const kelapaPositions = [
            { x: 380, y: 140, size: 45 }, 
            { x: 420, y: 380, size: 50 }, 
            { x: 680, y: 360, size: 48 }, 
            { x: 860, y: 550, size: 52 }, 
            { x: 320, y: 640, size: 46 }
        ];
        kelapaPositions.forEach(pos => { 
            trees.push({ x: pos.x, y: pos.y, size: pos.size, trunkHeight: 30, isKelapa: true }); 
        });
    }
    trees.sort((a, b) => a.y - b.y);
}

function drawMap(cameraX, cameraY, zoomScale) {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    ctx.save(); 
    ctx.scale(zoomScale, zoomScale);
    
    if (typeof currentWorldLocation !== 'undefined' && currentWorldLocation === 2) {
        if (assetsLoaded.beach_bg) {
            ctx.drawImage(ASSETS.beach_bg, -cameraX, -cameraY, MAP_WIDTH, MAP_HEIGHT);
        } else { 
            ctx.fillStyle = '#38bdf8'; 
            ctx.fillRect(0, 0, canvas.width / zoomScale, canvas.height / zoomScale); 
        }
    } else if (typeof currentWorldLocation !== 'undefined' && currentWorldLocation === 3) {
        if (assetsLoaded.kelas_inside) {
            ctx.drawImage(ASSETS.kelas_inside, -cameraX, -cameraY, MAP_WIDTH, MAP_HEIGHT);
        } else {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, canvas.width / zoomScale, canvas.height / zoomScale);
        }
    } else {
        const tileSize = 100;
        const startCol = Math.max(0, Math.floor(cameraX / tileSize));
        const endCol = startCol + Math.ceil((canvas.width / zoomScale) / tileSize) + 1;
        const startRow = Math.max(0, Math.floor(cameraY / tileSize));
        const endRow = startRow + Math.ceil((canvas.height / zoomScale) / tileSize) + 1;
        
        for (let c = startCol; c <= endCol; c++) {
            for (let r = startRow; r <= endRow; r++) {
                ctx.fillStyle = (c + r) % 2 === 0 ? '#15803d' : '#166534';
                ctx.fillRect(c * tileSize - cameraX, r * tileSize - cameraY, tileSize, tileSize);
            }
        }
    }

    currentBuildings.forEach(b => {
        const bx = b.x - cameraX, by = b.y - cameraY;
        
        if (assetsLoaded[b.id]) {
            ctx.drawImage(ASSETS[b.id], bx, by, b.width, b.height);
        } else if (b.isPortal) {
            if (currentWorldLocation === 3) {
                ctx.fillStyle = 'rgba(239, 68, 68, 0.45)';
                ctx.fillRect(bx, by, b.width, b.height);
            } else if (assetsLoaded.bis && b.id.includes('bis')) {
                ctx.drawImage(ASSETS.bis, bx, by, b.width, b.height);
            } else { 
                ctx.fillStyle = b.roofColor || '#fde047'; 
                ctx.fillRect(bx, by, b.width, b.height); 
            }
        } else {
            ctx.fillStyle = 'rgba(0,0,0,0.3)'; 
            ctx.beginPath(); 
            ctx.ellipse(bx + b.width / 2, by + b.height + 5, b.width * 0.52, 15, 0, 0, Math.PI * 2); 
            ctx.fill();

            if (b.isZone && assetsLoaded.taman) ctx.drawImage(ASSETS.taman, bx, by, b.width, b.height);
            else { ctx.fillStyle = b.roofColor || '#d97706'; ctx.fillRect(bx, by, b.width, b.height); }
        }

        ctx.save(); 
        ctx.font = 'bold 14px Fredoka, sans-serif';
        const labelText = `${b.icon} ${b.name}`;
        const textWidth = ctx.measureText(labelText).width;
        const signX = bx + b.width / 2;
        const signY = by - 22;

        ctx.fillStyle = '#0f172a'; 
        ctx.fillRect(signX - (textWidth + 20) / 2, signY - 12, textWidth + 20, 24);
        ctx.strokeStyle = '#38bdf8'; 
        ctx.lineWidth = 2; 
        ctx.strokeRect(signX - (textWidth + 20) / 2, signY - 12, textWidth + 20, 24);
        
        ctx.fillStyle = '#ffffff'; 
        ctx.textAlign = 'center'; 
        ctx.textBaseline = 'middle'; 
        ctx.fillText(labelText, signX, signY); 
        ctx.restore();
    });
    ctx.restore();
}

function drawTree(tree, cameraX, cameraY, zoomScale) {
    if (typeof currentWorldLocation !== 'undefined' && currentWorldLocation === 3) return;

    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    ctx.save(); ctx.scale(zoomScale, zoomScale);
    const tx = tree.x - cameraX, ty = tree.y - cameraY;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)'; 
    ctx.beginPath(); 
    ctx.ellipse(tx, ty + 2, tree.size * 0.85, tree.size * 0.35, 0, 0, Math.PI * 2); 
    ctx.fill();

    if (tree.isKelapa && assetsLoaded.kelapa) {
        ctx.drawImage(ASSETS.kelapa, tx - (tree.size * 2.2) / 2, ty - (tree.size * 2.8) + 10, tree.size * 2.2, tree.size * 2.8);
        ctx.restore(); return;
    }
    if (assetsLoaded.tree) {
        ctx.drawImage(ASSETS.tree, tx - (tree.size * 2.2) / 2, ty - (tree.size * 2.5) + 10, tree.size * 2.2, tree.size * 2.5);
        ctx.restore(); return;
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
        if (Math.abs(player.x - (b.x + b.width / 2)) < (b.width / 2 + 50) && Math.abs(player.y - (b.y + b.height / 2)) < (b.height / 2 + 50)) {
            nearbyBuilding = b; break;
        }
    }
    if (nearbyBuilding && actionBtn) actionBtn.classList.add('btn-action-highlight');
    else if (actionBtn) actionBtn.classList.remove('btn-action-highlight');
}