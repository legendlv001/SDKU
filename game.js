
// =============================================================
// GAME.JS - Logika Utama, Game Loop, Kamera, & Mini Map
// =============================================================

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

let isMiniMapOpen = false;
let miniMapTimer = null;

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

