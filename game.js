// CONFIGURATION & DATABASE SPREADSHEET
const SPREADSHEET_ID = "1J4ePsSEV8xE3VCR-10Avf3W8FOQ-R1xSqWO-4IMzyWc";
const SHEET_NAME = "Login";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;

let USER_DATABASE = [
    { name: "Admin", gender: "L", role: "ADMIN", status: "Full" },
    { name: "Ali", gender: "L", role: "SISWA", status: "Full" },
    { name: "Aisyah", gender: "P", role: "SISWI", status: "User" }
];

async function fetchSpreadsheetUsers() {
    try {
        const response = await fetch(CSV_URL);
        if (!response.ok) return;

        const csvText = await response.text();
        const lines = csvText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length <= 1) return;

        const fetchedUsers = [];
        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(cell => cell.replace(/^"|"$/g, '').trim());
            const nameVal = cols[0] || "";
            const genderVal = cols[1] || "L";
            const roleVal = cols[2] || "SISWA";
            const statusVal = cols[3] || "User";

            if (nameVal && nameVal.toLowerCase() !== "nama") {
                fetchedUsers.push({
                    name: nameVal,
                    gender: genderVal.toUpperCase(),
                    role: roleVal.toUpperCase(),
                    status: statusVal
                });
            }
        }

        if (fetchedUsers.length > 0) {
            USER_DATABASE = fetchedUsers;
        }
    } catch (err) {
        console.warn("Gagal mengambil live data dari Spreadsheet, menggunakan fallback database.", err);
    }
}

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

// GLOBAL STATE
let currentUserAccount = null;
let selectedGender = 'male';
let playerCustomName = "";
let playerRole = "";
let isAdminUser = false;
let walkTimer = 0;
let tempModalGender = null;
let nearbyBuilding = null;
let isGameStarted = false;

let currentWorldLocation = 1;

// MAP CONFIGURATIONS
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

let idleTimer = null;
const IDLE_TIMEOUT_MS = 1 * 60 * 1000;

function resetIdleTimer() {
    if (!isGameStarted) return;
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { triggerAutoLogout(); }, IDLE_TIMEOUT_MS);
}

function triggerAutoLogout() {
    if (!isGameStarted) return;
    const errorMsg = document.getElementById('loginErrorMsg');
    if (errorMsg) {
        errorMsg.innerText = "Anda telah dikeluarkan otomatis dari permainan karena tidak ada aktivitas (inaktif/AFK) selama 1 menit.";
        errorMsg.classList.remove('hidden');
    }
    handleLogout();
}

function setupInactivityListeners() {
    ['mousemove', 'mousedown', 'keydown', 'touchstart', 'touchmove', 'click', 'scroll'].forEach(ev => {
        window.addEventListener(ev, () => { resetIdleTimer(); }, { passive: true });
    });
}

let onlinePlayersList = [];

function updateOnlineCount() {
    if (window.renderFirebaseOnlineModal) {
        window.renderFirebaseOnlineModal();
        return;
    }
    if (!playerCustomName) {
        onlinePlayersList = [];
    } else {
        onlinePlayersList = [{ name: playerCustomName, gender: selectedGender, role: playerRole || "SISWA", isMe: true }];
    }
    const countText = document.getElementById('onlineCountText');
    if (countText) countText.innerText = `${onlinePlayersList.length} Online`;
}

function openOnlinePlayersModal() {
    if (window.renderFirebaseOnlineModal) {
        window.renderFirebaseOnlineModal();
    } else {
        updateOnlineCount();
        const listContainer = document.getElementById('onlinePlayersList');
        if (listContainer) {
            listContainer.innerHTML = onlinePlayersList.map(p => `
                <div class="flex items-center justify-between bg-slate-800/80 border border-slate-700/60 p-2.5 rounded-2xl">
                    <div class="flex items-center gap-2.5">
                        <div class="w-8 h-8 rounded-full bg-slate-700 border border-slate-500 flex items-center justify-center text-sm shadow">
                            ${p.gender === 'female' ? '🧕' : '👦'}
                        </div>
                        <div>
                            <div class="font-bold text-xs text-yellow-400 leading-tight">${p.name} <span class="text-[9px] text-emerald-400 font-semibold">(Anda)</span></div>
                            <div class="text-[10px] text-slate-300 font-medium">${p.role}</div>
                        </div>
                    </div>
                    <div class="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/60">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Online
                    </div>
                </div>
            `).join('');
        }
    }
    document.getElementById('onlinePlayersModal').classList.remove('hidden');
}

function closeOnlinePlayersModal() {
    document.getElementById('onlinePlayersModal').classList.add('hidden');
}

function handleLogin(e) {
    e.preventDefault();
    const inputUsername = document.getElementById('loginUsername').value.trim();
    const errorMsg = document.getElementById('loginErrorMsg');
    
    if (!inputUsername) return;

    if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(() => {});
    }

    const cleanInput = inputUsername.replace(/\s+/g, ' ').toLowerCase();
    const matchedUser = USER_DATABASE.find(user => 
        user.name.trim().replace(/\s+/g, ' ').toLowerCase() === cleanInput
    );

    if (matchedUser) {
        errorMsg.classList.add('hidden');
        currentUserAccount = matchedUser;
        playerCustomName = matchedUser.name;
        selectedGender = (matchedUser.gender === 'P') ? 'female' : 'male';
        playerRole = matchedUser.role || 'SISWA';
        
        const statusD = (matchedUser.status || "").toLowerCase().trim();
        isAdminUser = (statusD === 'full' || statusD === 'admin');

        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('gameContainer').classList.remove('hidden');

        document.getElementById('charNameDisplay').innerText = playerCustomName;
        document.getElementById('charRoleDisplay').innerText = playerRole;
        document.getElementById('avatarBadge').innerText = (selectedGender === 'female') ? '🧕' : '👦';

        const editIndicator = document.getElementById('editIconIndicator');
        if (isAdminUser) editIndicator.classList.remove('hidden');
        else editIndicator.classList.add('hidden');

        switchWorldLocation(1, false);
        updateOnlineCount();
        generateTrees();
        setupGameEvents();
        addChatMessage(playerCustomName, `Halo semuanya, ${playerCustomName} (${playerRole}) siap menjelajah! 😊`, true);
        
        if (!isGameStarted) {
            isGameStarted = true;
            requestAnimationFrame(gameLoop);
        }
    } else {
        errorMsg.innerText = `Nama "${inputUsername}" tidak terdaftar di database!`;
        errorMsg.classList.remove('hidden');
    }
}

function switchWorldLocation(targetLocId, showNotification = true) {
    currentWorldLocation = targetLocId;
    const config = MAP_CONFIGS[targetLocId];
    currentBuildings = config.buildings;

    const locationIndicatorBadge = document.getElementById('locationIndicatorBadge');
    if (locationIndicatorBadge) {
        locationIndicatorBadge.innerHTML = `<i class="fas fa-map-pin text-${targetLocId === 1 ? 'indigo' : 'cyan'}-400"></i> <span>${config.name}</span>`;
    }

    if (targetLocId === 2) {
        player.x = 240;
        player.y = 240;
    } else {
        player.x = 1000;
        player.y = 600;
    }

    player.targetX = null;
    player.targetY = null;
    player.isMovingToTarget = false;

    generateTrees();

    if (showNotification) {
        const notifText = targetLocId === 2 ? "🚌 Anda telah tiba di Area Pantai yang indah! 🌴🌊" : "🚌 Anda telah kembali ke lingkungan Sekolah! 🏫";
        if (window.sendFirebaseChat) {
            window.sendFirebaseChat(playerCustomName, notifText);
        } else {
            addChatMessage("Sistem", notifText, false);
        }
    }
}

function setupGameEvents() {
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            if (nearbyBuilding) triggerInteraction();
        } else if (keys.hasOwnProperty(e.key)) {
            keys[e.key] = true;
            player.isMovingToTarget = false;
        }
    });

    window.addEventListener('keyup', (e) => {
        if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
    });

    canvas.addEventListener('pointerdown', (e) => {
        if (e.target !== canvas) return;
        const rect = canvas.getBoundingClientRect();
        const clickClientX = e.clientX - rect.left;
        const clickClientY = e.clientY - rect.top;

        const currentZoom = getAdaptiveZoom();
        const viewWidth = canvas.width / currentZoom;
        const viewHeight = canvas.height / currentZoom;

        let cameraX = player.x - viewWidth / 2;
        let cameraY = player.y - viewHeight / 2;

        cameraX = Math.max(0, Math.min(MAP_WIDTH - viewWidth, cameraX));
        cameraY = Math.max(0, Math.min(MAP_HEIGHT - viewHeight, cameraY));

        const worldX = (clickClientX / currentZoom) + cameraX;
        const worldY = (clickClientY / currentZoom) + cameraY;

        player.targetX = Math.max(30, Math.min(MAP_WIDTH - 30, worldX));
        player.targetY = Math.max(40, Math.min(MAP_HEIGHT - 40, worldY));
        player.isMovingToTarget = true;
    });

    setupTouchAnalogStick();
    setupInactivityListeners();
    resetIdleTimer();
}

let isChatOpen = false;
let unreadCount = 0;
let chatTimer = null;
let isTypingOrHovered = false;
const autoHideDelay = 5000;

let isMiniMapOpen = false;
let miniMapTimer = null;

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
        const kelapaPositions = [
            { x: 320, y: 300, size: 45 },
            { x: 550, y: 220, size: 50 },
            { x: 750, y: 450, size: 48 },
            { x: 420, y: 620, size: 52 },
            { x: 920, y: 520, size: 46 }
        ];
        kelapaPositions.forEach(pos => {
            trees.push({ x: pos.x, y: pos.y, size: pos.size, trunkHeight: 30, isKelapa: true });
        });
    }
    trees.sort((a, b) => a.y - b.y);
}

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const largeMapCanvas = document.getElementById('largeMapCanvas');
const largeMapCtx = largeMapCanvas ? largeMapCanvas.getContext('2d') : null;

const MAP_WIDTH = 2000;
const MAP_HEIGHT = 1200;

let userZoomModifier = 0;

function changeZoom(delta) {
    userZoomModifier += delta;
    userZoomModifier = Math.max(-0.4, Math.min(0.8, userZoomModifier));
}

function getAdaptiveZoom() {
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    let baseZoom = 1.35;
    if (screenW < 900 || screenH < 500) {
        baseZoom = Math.max(0.75, Math.min(0.95, screenW / 900));
    }
    return Math.max(0.4, Math.min(2.2, baseZoom + userZoomModifier));
}

const player = {
    x: 1000, y: 600, speed: 2.8, width: 38, height: 52,
    direction: 'down', targetX: null, targetY: null, isMovingToTarget: false
};

const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, w: false, s: false, a: false, d: false };

function drawCharacterSprite(c, x, y, width, height, gender, dir, walkStep) {
    c.save();
    let currentDir = (dir === 'idle') ? 'down' : dir;
    const assetKey = `${gender}_${currentDir}`;
    const imgAsset = ASSETS[assetKey];
    const isLoaded = assetsLoaded[assetKey];

    const bobbing = (dir !== 'idle') ? Math.sin(walkStep * 0.4) * 3 : 0;
    const sway = (dir !== 'idle') ? Math.sin(walkStep * 0.2) * 0.05 : 0;
    const charY = y + bobbing;

    if (isLoaded) {
        c.fillStyle = 'rgba(0,0,0,0.25)';
        c.beginPath();
        c.ellipse(x + width / 2, y + height - 2, width * 0.32, 6, 0, 0, Math.PI * 2);
        c.fill();

        c.translate(x + width / 2, charY + height / 2);
        c.rotate(sway);
        c.drawImage(imgAsset, -width / 2, -height / 2, width, height);
        c.restore();
        return;
    }

    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.beginPath();
    c.ellipse(x + width / 2, y + height - 3, width * 0.35, 6, 0, 0, Math.PI * 2);
    c.fill();

    c.translate(x + width / 2, charY + height / 2);
    c.rotate(sway);

    const isFemale = (gender === 'female');
    const drawX = -width / 2;
    const drawY = -height / 2;

    if (isFemale) {
        c.fillStyle = '#b91c1c';
        c.fillRect(drawX + width * 0.25, drawY + height * 0.45, width * 0.5, height * 0.43);
        c.fillStyle = '#ffffff';
        c.beginPath();
        c.roundRect(drawX + width * 0.12, drawY, width * 0.76, height * 0.42, 18);
        c.fill();
    } else {
        c.fillStyle = '#ffffff';
        c.fillRect(drawX + width * 0.25, drawY + height * 0.3, width * 0.5, height * 0.25);
        c.fillStyle = '#1e293b';
        c.beginPath();
        c.roundRect(drawX + width * 0.25, drawY, width * 0.5, 14, 4);
        c.fill();
    }
    c.restore();
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

function renderMapOnCanvas(cCtx, cCanvas) {
    if (!cCtx || !cCanvas) return;

    cCanvas.width = cCanvas.clientWidth * window.devicePixelRatio;
    cCanvas.height = cCanvas.clientHeight * window.devicePixelRatio;

    cCtx.clearRect(0, 0, cCanvas.width, cCanvas.height);
    cCtx.save();
    cCtx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const scaleX = cCanvas.clientWidth / MAP_WIDTH;
    const scaleY = cCanvas.clientHeight / MAP_HEIGHT;

    cCtx.fillStyle = currentWorldLocation === 1 ? '#15803d' : '#38bdf8';
    cCtx.fillRect(0, 0, cCanvas.clientWidth, cCanvas.clientHeight);

    currentBuildings.forEach(b => {
        cCtx.fillStyle = '#facc15';
        cCtx.fillRect(b.x * scaleX, b.y * scaleY, b.width * scaleX, b.height * scaleY);
    });

    const playerMiniX = player.x * scaleX;
    const playerMiniY = player.y * scaleY;

    cCtx.fillStyle = '#facc15';
    cCtx.beginPath();
    cCtx.arc(playerMiniX, playerMiniY, 4, 0, Math.PI * 2);
    cCtx.fill();
    cCtx.strokeStyle = '#ffffff';
    cCtx.lineWidth = 1.5;
    cCtx.stroke();

    cCtx.restore();
}

function renderMiniMap() {
    if (isMiniMapOpen) {
        renderMapOnCanvas(largeMapCtx, largeMapCanvas);
    }
}

function toggleMiniMap() {
    if (isMiniMapOpen) closeMiniMap();
    else openMiniMap();
}

function openMiniMap() {
    isMiniMapOpen = true;
    document.getElementById('mapPopupTitle').innerText = MAP_CONFIGS[currentWorldLocation].name;
    document.getElementById('miniMapPopup').classList.remove('hidden');
    resetMiniMapTimer();
}

function closeMiniMap() {
    isMiniMapOpen = false;
    document.getElementById('miniMapPopup').classList.add('hidden');
    if (miniMapTimer) clearTimeout(miniMapTimer);
}

function pauseMiniMapTimer() {
    if (miniMapTimer) { clearTimeout(miniMapTimer); miniMapTimer = null; }
}

function resetMiniMapTimer() {
    if (miniMapTimer) clearTimeout(miniMapTimer);
    if (isMiniMapOpen) {
        miniMapTimer = setTimeout(() => { closeMiniMap(); }, 10000);
    }
}

// -------------------------------------------------------------
// FUNGSI UTAMA UNTUK MENGATUR GERAKAN PEMAIN & KOORDINAT
// -------------------------------------------------------------
function updateGame() {
    let dx = 0;
    let dy = 0;

    let nextX = player.x;
    let nextY = player.y;

    // 1. GERAKAN SAAT DI-KLIK ATAU SENTUH KANVAS (POINT AND CLICK)
    if (player.isMovingToTarget && player.targetX !== null && player.targetY !== null) {
        const diffX = player.targetX - player.x;
        const diffY = player.targetY - player.y;
        const dist = Math.hypot(diffX, diffY);

        if (dist < player.speed) {
            nextX = player.targetX;
            nextY = player.targetY;
            player.isMovingToTarget = false;
            player.targetX = null;
            player.targetY = null;
            player.direction = 'idle';
            walkTimer = 0;
        } else {
            dx = diffX / dist;
            dy = diffY / dist;
            nextX = player.x + dx * player.speed;
            nextY = player.y + dy * player.speed;

            if (Math.abs(diffX) > Math.abs(diffY)) {
                player.direction = (diffX > 0) ? 'right' : 'left';
            } else {
                player.direction = (diffY > 0) ? 'down' : 'up';
            }
            walkTimer++;
        }
    } else {
        // 2. GERAKAN DARI KEYBOARD (W/A/S/D / Tombol Panah) & ANALOG HP
        if (keys.ArrowUp || keys.w) dy -= 1;
        if (keys.ArrowDown || keys.s) dy += 1;
        if (keys.ArrowLeft || keys.a) dx -= 1;
        if (keys.ArrowRight || keys.d) dx += 1;

        if (dx !== 0 || dy !== 0) {
            const len = Math.hypot(dx, dy);
            nextX = player.x + (dx / len) * player.speed;
            nextY = player.y + (dy / len) * player.speed;

            if (Math.abs(dx) > Math.abs(dy)) {
                player.direction = (dx > 0) ? 'right' : 'left';
            } else {
                player.direction = (dy > 0) ? 'down' : 'up';
            }
            walkTimer++;
        } else {
            player.direction = 'idle';
            walkTimer = 0;
        }
    }

    // 3. PENGHALANG / PENGATURAN AREA PANTAI (COLLISION LAUT)
    if (currentWorldLocation === 2) {
        if (nextX <= 1040) {
            const t = nextX / 1040;
            const beachLineY = 1120 - (330 * Math.pow(t, 0.75));
            if (nextY > beachLineY) {
                nextY = player.y;
                player.isMovingToTarget = false;
            }
        } else {
            const pierBottomDeckY = 820;

            if (nextY > pierBottomDeckY) {
                nextY = player.y;
                player.isMovingToTarget = false;
            }

            if (nextX > 1960) {
                nextX = player.x;
                player.isMovingToTarget = false;
            }
        }
    }

    // UPDATE LOKASI PEMAIN AKHIR
    player.x = Math.max(30, Math.min(MAP_WIDTH - 30, nextX));
    player.y = Math.max(40, Math.min(MAP_HEIGHT - 40, nextY));

    checkBuildingProximity();
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

function triggerInteraction() {
    if (!nearbyBuilding) return;

    document.getElementById('modalTitle').innerHTML = `${nearbyBuilding.icon} ${nearbyBuilding.dialogTitle}`;
    document.getElementById('modalContent').innerHTML = `
        <p class="mb-3">${nearbyBuilding.dialogText}</p>
        <div class="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs font-semibold text-amber-800 flex items-center gap-2">
            <i class="fas fa-sparkles text-amber-500"></i>
            <span>Aksi: ${nearbyBuilding.actionLabel}</span>
        </div>
    `;
    
    const modalActions = document.getElementById('modalActions');
    if (nearbyBuilding.isPortal) {
        modalActions.innerHTML = `
            <button onclick="executePortalTravel(${nearbyBuilding.targetLocation})" class="px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg">
                <i class="fas fa-bus"></i> ${nearbyBuilding.actionLabel}
            </button>
            <button onclick="closeModal()" class="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition">Batal</button>
        `;
    } else {
        modalActions.innerHTML = `
            <button onclick="performBuildingAction('${nearbyBuilding.id}')" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-lg">
                <i class="fas fa-play"></i> ${nearbyBuilding.actionLabel}
            </button>
            <button onclick="closeModal()" class="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition">Tutup</button>
        `;
    }

    document.getElementById('dialogModal').classList.remove('hidden');
}

function executePortalTravel(targetLocId) {
    closeModal();
    switchWorldLocation(targetLocId, true);
}

function performBuildingAction(buildingId) {
    const b = currentBuildings.find(item => item.id === buildingId);
    if (!b) return;

    closeModal();
    let actionText = `Menikmati aktivitas di ${b.name}! ✨`;
    if (window.sendFirebaseChat) {
        window.sendFirebaseChat(playerCustomName, actionText);
    } else {
        addChatMessage(playerCustomName, actionText, true);
    }
}

function pauseChatTimer() {
    isTypingOrHovered = true;
    if (chatTimer) { clearTimeout(chatTimer); chatTimer = null; }
}

function resetChatTimer() {
    isTypingOrHovered = false;
    if (chatTimer) clearTimeout(chatTimer);
    if (isChatOpen) {
        chatTimer = setTimeout(() => {
            const chatInput = document.getElementById('chatInput');
            if (document.activeElement !== chatInput && !isTypingOrHovered) closeChat();
        }, autoHideDelay);
    }
}

function toggleChat() {
    if (isChatOpen) closeChat();
    else openChat();
}

function openChat() {
    isChatOpen = true;
    document.getElementById('chatBoxPopup').classList.remove('hidden');
    unreadCount = 0;
    updateChatBadge();
    resetChatTimer();

    setTimeout(() => {
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 50);
}

function closeChat() {
    isChatOpen = false;
    document.getElementById('chatBoxPopup').classList.add('hidden');
    if (chatTimer) clearTimeout(chatTimer);
}

function updateChatBadge() {
    const badge = document.getElementById('chatBadge');
    if (!badge) return;
    if (unreadCount > 0) {
        badge.innerText = unreadCount > 99 ? '99+' : unreadCount;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

function addChatMessage(sender, text, isPlayer = false) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;

    const msgDiv = document.createElement('div');
    msgDiv.className = `flex flex-col ${isPlayer ? 'items-end' : 'items-start'}`;

    const senderSpan = document.createElement('span');
    senderSpan.className = 'text-[10px] font-bold text-slate-400 mb-0.5 px-1';
    senderSpan.innerText = sender;

    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = `px-3 py-1.5 rounded-2xl max-w-[85%] text-xs ${
        isPlayer ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-200 text-slate-800 rounded-bl-none font-medium'
    }`;
    bubbleDiv.innerText = text;

    msgDiv.appendChild(senderSpan);
    msgDiv.appendChild(bubbleDiv);
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    if (!isChatOpen) {
        unreadCount++;
        updateChatBadge();
    } else {
        resetChatTimer();
    }
}

function sendChatMessage() {
    const input = document.getElementById('chatInput');
    if (!input) return;
    const text = input.value.trim();
    if (text.length === 0) return;

    if (window.sendFirebaseChat) {
        window.sendFirebaseChat(playerCustomName || "Saya", text);
    } else {
        addChatMessage(playerCustomName || "Saya", text, true);
    }
    input.value = "";
    resetChatTimer();
}

function gameLoop() {
    if (!isGameStarted) return;
    updateGame();

    if (canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
    }

    const currentZoomScale = getAdaptiveZoom();
    const viewWidth = canvas.width / currentZoomScale;
    const viewHeight = canvas.height / currentZoomScale;

    let cameraX = player.x - viewWidth / 2;
    let cameraY = player.y - viewHeight / 2;

    const maxCamX = Math.max(0, MAP_WIDTH - viewWidth);
    const maxCamY = Math.max(0, MAP_HEIGHT - viewHeight);

    cameraX = Math.max(0, Math.min(maxCamX, cameraX));
    cameraY = Math.max(0, Math.min(maxCamY, cameraY));

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawMap(cameraX, cameraY, currentZoomScale);

    if (window.otherPlayers) {
        Object.keys(window.otherPlayers).forEach(id => {
            const pData = window.otherPlayers[id];
            if (!pData || pData.x === undefined || pData.y === undefined) return;
            if ((pData.location || 1) !== currentWorldLocation) return;

            ctx.save();
            ctx.scale(currentZoomScale, currentZoomScale);
            const oScreenX = pData.x - cameraX - player.width / 2;
            const oScreenY = pData.y - cameraY - player.height / 2;
            
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            ctx.beginPath();
            ctx.ellipse(oScreenX + player.width / 2, oScreenY + player.height - 2, player.width * 0.32, 6, 0, 0, Math.PI * 2);
            ctx.fill();

            drawCharacterSprite(ctx, oScreenX, oScreenY, player.width, player.height, pData.gender || 'male', pData.direction || 'down', walkTimer);

            ctx.restore();
        });
    }

    trees.forEach(tree => {
        if (tree.y <= player.y) drawTree(tree, cameraX, cameraY, currentZoomScale);
    });

    ctx.save();
    ctx.scale(currentZoomScale, currentZoomScale);
    const screenX = player.x - cameraX - player.width / 2;
    const screenY = player.y - cameraY - player.height / 2;
    drawCharacterSprite(ctx, screenX, screenY, player.width, player.height, selectedGender, player.direction, walkTimer);
    ctx.restore();

    trees.forEach(tree => {
        if (tree.y > player.y) drawTree(tree, cameraX, cameraY, currentZoomScale);
    });

    renderMiniMap();
    requestAnimationFrame(gameLoop);
}

function setupTouchAnalogStick() {
    const stick = document.getElementById('psAnalogStick');
    const knob = document.getElementById('analogKnob');
    if (!stick || !knob) return;

    let isDragging = false;
    let centerPos = { x: 0, y: 0 };
    const maxRadius = 40;

    const handleStart = (e) => {
        e.preventDefault();
        isDragging = true;
        const rect = stick.getBoundingClientRect();
        centerPos = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        handleMove(e);
    };

    const handleMove = (e) => {
        if (!isDragging) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        let deltaX = clientX - centerPos.x;
        let deltaY = clientY - centerPos.y;
        const dist = Math.hypot(deltaX, deltaY);

        if (dist > maxRadius) {
            deltaX = (deltaX / dist) * maxRadius;
            deltaY = (deltaY / dist) * maxRadius;
        }

        knob.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

        keys.ArrowLeft = deltaX < -8;
        keys.ArrowRight = deltaX > 8;
        keys.ArrowUp = deltaY < -8;
        keys.ArrowDown = deltaY > 8;
        player.isMovingToTarget = false;
    };

    const handleEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        knob.style.transform = `translate(0px, 0px)`;
        keys.ArrowLeft = false;
        keys.ArrowRight = false;
        keys.ArrowUp = false;
        keys.ArrowDown = false;
    };

    stick.addEventListener('touchstart', handleStart, { passive: false });
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
    stick.addEventListener('mousedown', handleStart);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
}

function openEditCharacterModal() {
    tempModalGender = selectedGender;
    document.getElementById('editNameInput').value = playerCustomName;
    const adminContainer = document.getElementById('adminSettingsContainer');

    if (!isAdminUser) adminContainer.classList.add('hidden');
    else {
        adminContainer.classList.remove('hidden');
        selectModalGender(selectedGender);
    }
    document.getElementById('editCharModal').classList.remove('hidden');
}

function closeEditCharacterModal() {
    document.getElementById('editCharModal').classList.add('hidden');
}

function selectModalGender(gender) {
    tempModalGender = gender;
    const optionF = document.getElementById('selectOptionFemale');
    const optionM = document.getElementById('selectOptionMale');

    if (gender === 'female') {
        optionF.className = `cursor-pointer border-2 border-yellow-400 rounded-2xl p-3 flex flex-col items-center bg-yellow-400/20 transition scale-105`;
        optionM.className = `cursor-pointer border-2 border-slate-700 rounded-2xl p-3 flex flex-col items-center bg-slate-800 transition opacity-60`;
    } else {
        optionM.className = `cursor-pointer border-2 border-yellow-400 rounded-2xl p-3 flex flex-col items-center bg-slate-800 transition opacity-60`;
        optionF.className = `cursor-pointer border-2 border-slate-700 rounded-2xl p-3 flex flex-col items-center bg-slate-800 transition opacity-60`;
    }
}

function saveCharacterEdits() {
    if (!isAdminUser) return;
    const newName = document.getElementById('editNameInput').value.trim();
    if (newName) {
        playerCustomName = newName;
        document.getElementById('charNameDisplay').innerText = playerCustomName;
    }
    if (tempModalGender) {
        selectedGender = tempModalGender;
        document.getElementById('avatarBadge').innerText = (selectedGender === 'female') ? '🧕' : '👦';
    }
    closeEditCharacterModal();
}

function handleLogout() {
    const logoutName = playerCustomName || "Seseorang";
    closeEditCharacterModal();
    currentUserAccount = null;
    isAdminUser = false;
    isGameStarted = false;
    
    if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }

    document.getElementById('gameContainer').classList.add('hidden');
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('loginUsername').value = "";
    addChatMessage("Sistem", `${logoutName} telah keluar (logout) dari permainan. 👋`, false);
}

function closeModal() {
    document.getElementById('dialogModal').classList.add('hidden');
}

window.onload = function() {
    fetchSpreadsheetUsers();
};