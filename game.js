const SPREADSHEET_ID = "1J4ePsSEV8xE3VCR-10Avf3W8FOQ-R1xSqWO-4IMzyWc", SHEET_NAME = "Login";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;

let USER_DATABASE = [{ name: "Admin", gender: "L", role: "ADMIN", status: "Full" }, { name: "Ali", gender: "L", role: "SISWA", status: "Full" }, { name: "Aisyah", gender: "P", role: "SISWI", status: "User" }];

async function fetchSpreadsheetUsers() {
    try {
        const response = await fetch(CSV_URL); if (!response.ok) return;
        const csvText = await response.text(); const lines = csvText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length <= 1) return;
        const fetchedUsers = [];
        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(cell => cell.replace(/^"|"$/g, '').trim());
            if (cols[0] && cols[0].toLowerCase() !== "nama") {
                fetchedUsers.push({ name: cols[0], gender: (cols[1] || "L").toUpperCase(), role: (cols[2] || "SISWA").toUpperCase(), status: cols[3] || "User" });
            }
        }
        if (fetchedUsers.length > 0) USER_DATABASE = fetchedUsers;
    } catch (err) { console.warn("Fallback DB.", err); }
}

let currentUserAccount = null, selectedGender = 'male', playerCustomName = "", playerRole = "", isAdminUser = false;
window.walkTimer = 0; let walkTimer = 0; let tempModalGender = null, nearbyBuilding = null, isGameStarted = false, currentWorldLocation = 1;
let idleTimer = null; const IDLE_TIMEOUT_MS = 1 * 60 * 1000;

function resetIdleTimer() {
    if (!isGameStarted) return;
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { triggerAutoLogout(); }, IDLE_TIMEOUT_MS);
}
function triggerAutoLogout() {
    if (!isGameStarted) return;
    const errorMsg = document.getElementById('loginErrorMsg');
    if (errorMsg) { errorMsg.innerText = "AFK 1 menit. Logout otomatis."; errorMsg.classList.remove('hidden'); }
    handleLogout();
}
function setupInactivityListeners() {
    ['mousemove', 'mousedown', 'keydown', 'touchstart', 'touchmove', 'click', 'scroll'].forEach(ev => {
        window.addEventListener(ev, () => { resetIdleTimer(); }, { passive: true });
    });
}

function handleLogin(e) {
    e.preventDefault();
    const inputUsername = document.getElementById('loginUsername').value.trim();
    const errorMsg = document.getElementById('loginErrorMsg');
    if (!inputUsername) return;
    const cleanInput = inputUsername.replace(/\s+/g, ' ').toLowerCase();
    const matchedUser = USER_DATABASE.find(user => user.name.trim().replace(/\s+/g, ' ').toLowerCase() === cleanInput);

    if (matchedUser) {
        errorMsg.classList.add('hidden'); currentUserAccount = matchedUser; playerCustomName = matchedUser.name;
        selectedGender = (matchedUser.gender === 'P') ? 'female' : 'male'; playerRole = matchedUser.role || 'SISWA';
        isAdminUser = ((matchedUser.status || "").toLowerCase().trim() === 'full' || (matchedUser.status || "").toLowerCase().trim() === 'admin');

        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('gameContainer').classList.remove('hidden');
        document.getElementById('charNameDisplay').innerText = playerCustomName;
        document.getElementById('charRoleDisplay').innerText = playerRole;
        document.getElementById('avatarBadge').innerText = (selectedGender === 'female') ? '🧕' : '👦';

        switchWorldLocation(1, false);
        if (typeof generateTrees === 'function') generateTrees();
        setupGameEvents();
        addChatMessage(playerCustomName, `Halo semuanya, ${playerCustomName} siap menjelajah!`, true);
        if (!isGameStarted) { isGameStarted = true; requestAnimationFrame(gameLoop); }
    } else {
        errorMsg.innerText = `Nama "${inputUsername}" tidak terdaftar!`; errorMsg.classList.remove('hidden');
    }
}

function switchWorldLocation(targetLocId, showNotification = true) {
    currentWorldLocation = targetLocId;
    if (typeof MAP_CONFIGS !== 'undefined' && MAP_CONFIGS[targetLocId]) {
        currentBuildings = MAP_CONFIGS[targetLocId].buildings;
        const locationIndicatorBadge = document.getElementById('locationIndicatorBadge');
        if (locationIndicatorBadge) locationIndicatorBadge.innerHTML = `<i class="fas fa-map-pin text-${targetLocId === 1 ? 'indigo' : 'cyan'}-400"></i> <span>${MAP_CONFIGS[targetLocId].name}</span>`;
    }
    player.x = (targetLocId === 2) ? 240 : 1000;
    player.y = (targetLocId === 2) ? 240 : 600;
    player.targetX = null; player.targetY = null; player.isMovingToTarget = false;
    if (typeof generateTrees === 'function') generateTrees();
}

function setupGameEvents() {
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') { e.preventDefault(); if (nearbyBuilding) triggerInteraction(); }
        else if (keys.hasOwnProperty(e.key)) { keys[e.key] = true; player.isMovingToTarget = false; }
    });
    window.addEventListener('keyup', (e) => { if (keys.hasOwnProperty(e.key)) keys[e.key] = false; });
    setupTouchAnalogStick(); setupInactivityListeners(); resetIdleTimer();
}

let isMiniMapOpen = false, miniMapTimer = null, userZoomModifier = 0;
const canvas = document.getElementById('gameCanvas'), ctx = canvas.getContext('2d');
const largeMapCanvas = document.getElementById('largeMapCanvas'), largeMapCtx = largeMapCanvas ? largeMapCanvas.getContext('2d') : null;
const MAP_WIDTH = 2000, MAP_HEIGHT = 1200;

function changeZoom(delta) { userZoomModifier = Math.max(-0.4, Math.min(0.8, userZoomModifier + delta)); }
function getAdaptiveZoom() {
    const screenW = window.innerWidth, screenH = window.innerHeight;
    let baseZoom = (screenW < 900 || screenH < 500) ? Math.max(0.75, Math.min(0.95, screenW / 900)) : 1.35;
    return Math.max(0.4, Math.min(2.2, baseZoom + userZoomModifier));
}

function gameLoop() {
    if (!isGameStarted) return;
    updateGame();
    if (canvas.parentElement) { canvas.width = canvas.parentElement.clientWidth; canvas.height = canvas.parentElement.clientHeight; }
    const currentZoomScale = getAdaptiveZoom(), viewWidth = canvas.width / currentZoomScale, viewHeight = canvas.height / currentZoomScale;
    let cameraX = Math.max(0, Math.min(MAP_WIDTH - viewWidth, player.x - viewWidth / 2));
    let cameraY = Math.max(0, Math.min(MAP_HEIGHT - viewHeight, player.y - viewHeight / 2));

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (typeof drawMap === 'function') drawMap(cameraX, cameraY, currentZoomScale);

    const activeWalkTimer = typeof walkTimer !== 'undefined' ? walkTimer : (window.walkTimer || 0);

    if (window.otherPlayers) {
        Object.keys(window.otherPlayers).forEach(id => {
            const pData = window.otherPlayers[id];
            if (!pData || (pData.location || 1) !== currentWorldLocation) return;
            ctx.save(); ctx.scale(currentZoomScale, currentZoomScale);
            drawCharacterSprite(ctx, pData.x - cameraX - player.width / 2, pData.y - cameraY - player.height / 2, player.width, player.height, pData.gender || 'male', pData.direction || 'down', activeWalkTimer);
            ctx.restore();
        });
    }

    if (typeof trees !== 'undefined' && typeof drawTree === 'function') {
        trees.forEach(tree => { if (tree.y <= player.y) drawTree(tree, cameraX, cameraY, currentZoomScale); });
    }

    ctx.save(); ctx.scale(currentZoomScale, currentZoomScale);
    drawCharacterSprite(ctx, player.x - cameraX - player.width / 2, player.y - cameraY - player.height / 2, player.width, player.height, selectedGender, player.direction, activeWalkTimer);
    ctx.restore();

    if (typeof trees !== 'undefined' && typeof drawTree === 'function') {
        trees.forEach(tree => { if (tree.y > player.y) drawTree(tree, cameraX, cameraY, currentZoomScale); });
    }

    requestAnimationFrame(gameLoop);
}

function setupTouchAnalogStick() {
    const stick = document.getElementById('psAnalogStick'), knob = document.getElementById('analogKnob');
    if (!stick || !knob) return;
    let isDragging = false, centerPos = { x: 0, y: 0 }, maxRadius = 40;
    const handleStart = (e) => { e.preventDefault(); isDragging = true; const rect = stick.getBoundingClientRect(); centerPos = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }; handleMove(e); };
    const handleMove = (e) => {
        if (!isDragging) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX, clientY = e.touches ? e.touches[0].clientY : e.clientY;
        let deltaX = clientX - centerPos.x, deltaY = clientY - centerPos.y, dist = Math.hypot(deltaX, deltaY);
        if (dist > maxRadius) { deltaX = (deltaX / dist) * maxRadius; deltaY = (deltaY / dist) * maxRadius; }
        knob.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        keys.ArrowLeft = deltaX < -8; keys.ArrowRight = deltaX > 8; keys.ArrowUp = deltaY < -8; keys.ArrowDown = deltaY > 8;
    };
    const handleEnd = () => { if (!isDragging) return; isDragging = false; knob.style.transform = `translate(0px, 0px)`; keys.ArrowLeft = false; keys.ArrowRight = false; keys.ArrowUp = false; keys.ArrowDown = false; };
    stick.addEventListener('touchstart', handleStart, { passive: false }); window.addEventListener('touchmove', handleMove, { passive: false }); window.addEventListener('touchend', handleEnd);
}

function openEditCharacterModal() { document.getElementById('editCharModal').classList.remove('hidden'); }
function closeEditCharacterModal() { document.getElementById('editCharModal').classList.add('hidden'); }
function handleLogout() { isGameStarted = false; document.getElementById('gameContainer').classList.add('hidden'); document.getElementById('loginScreen').classList.remove('hidden'); }
function closeModal() { document.getElementById('dialogModal').classList.add('hidden'); }
window.onload = function() { fetchSpreadsheetUsers(); };