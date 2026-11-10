// ==========================================
// CONFIGURATION & DATABASE URL
// ==========================================
const SPREADSHEET_ID = "1J4ePsSEV8xE3VCR-10Avf3W8FOQ-R1xSqWO-4IMzyWc", SHEET_NAME = "Login";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;

// Firebase Config Asli dari Console Anda
const firebaseConfig = {
  apiKey: "AIzaSyDDPcwN1blpYQ6fsknQbZMsort-bAOASW8",
  authDomain: "sd-ku-fa156.firebaseapp.com",
  databaseURL: "https://sd-ku-fa156-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sd-ku-fa156",
  storageBucket: "sd-ku-fa156.firebasestorage.app",
  messagingSenderId: "504435998356",
  appId: "1:504435998356:web:ea0bd8ce43a4dba0913e81"
};

// Inisialisasi Firebase & Realtime Database
let db = null;
let myPlayerRef = null;
window.otherPlayers = {};

if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
} else if (typeof firebase !== 'undefined') {
    db = firebase.database();
}

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
            if (cols[0] && cols[0].toLowerCase() !== "nama") {
                fetchedUsers.push({ name: cols[0], gender: (cols[1] || "L").toUpperCase(), role: (cols[2] || "SISWA").toUpperCase(), status: cols[3] || "User" });
            }
        }
        if (fetchedUsers.length > 0) USER_DATABASE = fetchedUsers;
    } catch (err) { 
        console.warn("Fallback DB.", err); 
    }
}

let currentUserAccount = null, selectedGender = 'male', playerCustomName = "", playerRole = "", isAdminUser = false;
window.walkTimer = 0; let walkTimer = 0; let tempModalGender = null, nearbyBuilding = null, isGameStarted = false, currentWorldLocation = 1;
let idleTimer = null; const IDLE_TIMEOUT_MS = 5 * 60 * 1000;

function resetIdleTimer() {
    if (!isGameStarted) return;
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { triggerAutoLogout(); }, IDLE_TIMEOUT_MS);
}

function triggerAutoLogout() {
    if (!isGameStarted) return;
    const errorMsg = document.getElementById('loginErrorMsg');
    if (errorMsg) { 
        errorMsg.innerText = "AFK karena tidak ada aktivitas. Silakan login kembali."; 
        errorMsg.classList.remove('hidden'); 
    }
    handleLogout();
}

function setupInactivityListeners() {
    ['mousemove', 'mousedown', 'keydown', 'touchstart', 'touchmove', 'click', 'scroll'].forEach(ev => {
        window.addEventListener(ev, () => { resetIdleTimer(); }, { passive: true });
    });
}

function initFirebaseSync() {
    if (!db || !playerCustomName) return;

    // Bersihkan karakter spasi/simbol untuk kunci database
    const safeKey = playerCustomName.replace(/[.#$\[\]]/g, "_");
    myPlayerRef = db.ref('players/' + safeKey);

    // Hapus data otomatis saat pemain menutup halaman/disconnect
    myPlayerRef.onDisconnect().remove();

    // Pantau pergerakan semua pemain online
    db.ref('players').on('value', (snapshot) => {
        const data = snapshot.val() || {};
        delete data[safeKey]; // Hapus data diri sendiri dari daftar pemain lain
        window.otherPlayers = data;
    });
}

function updateMyPositionToFirebase() {
    if (!myPlayerRef || !isGameStarted) return;
    myPlayerRef.set({
        name: playerCustomName,
        x: player.x,
        y: player.y,
        gender: selectedGender,
        direction: player.direction,
        location: currentWorldLocation,
        role: playerRole,
        lastUpdated: Date.now()
    });
}

function handleLogin(e) {
    if (e && e.preventDefault) e.preventDefault();
    
    const inputElem = document.getElementById('loginUsername');
    const errorMsg = document.getElementById('loginErrorMsg');
    if (!inputElem) return;
    
    const inputUsername = inputElem.value.trim();
    if (!inputUsername) return;
    
    const cleanInput = inputUsername.replace(/\s+/g, ' ').toLowerCase();
    const matchedUser = USER_DATABASE.find(user => user.name.trim().replace(/\s+/g, ' ').toLowerCase() === cleanInput);

    if (matchedUser) {
        if (errorMsg) errorMsg.classList.add('hidden'); 
        currentUserAccount = matchedUser; 
        playerCustomName = matchedUser.name;
        selectedGender = (matchedUser.gender === 'P') ? 'female' : 'male'; 
        playerRole = matchedUser.role || 'SISWA';
        isAdminUser = ((matchedUser.status || "").toLowerCase().trim() === 'full' || (matchedUser.status || "").toLowerCase().trim() === 'admin');

        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('gameContainer').classList.remove('hidden');
        document.getElementById('charNameDisplay').innerText = playerCustomName;
        document.getElementById('charRoleDisplay').innerText = playerRole;
        document.getElementById('avatarBadge').innerText = (selectedGender === 'female') ? '🧕' : '👦';

        switchWorldLocation(1, false);
        if (typeof generateTrees === 'function') generateTrees();
        
        isGameStarted = true;
        initFirebaseSync();
        requestAnimationFrame(gameLoop);

        setupGameEvents();
        resetIdleTimer();
        
        if (typeof addChatMessage === 'function') {
            addChatMessage(playerCustomName, `Halo semuanya, ${playerCustomName} siap menjelajah!`, true);
        }
    } else {
        if (errorMsg) {
            errorMsg.innerText = `Nama "${inputUsername}" tidak terdaftar!`; 
            errorMsg.classList.remove('hidden');
        }
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
    updateMyPositionToFirebase();
}

let isCanvasListenerAdded = false;

function setupGameEvents() {
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.key === ' ') { e.preventDefault(); if (nearbyBuilding) triggerInteraction(); }
        else if (keys.hasOwnProperty(e.key)) { keys[e.key] = true; player.isMovingToTarget = false; }
    });
    window.addEventListener('keyup', (e) => { if (keys.hasOwnProperty(e.key)) keys[e.key] = false; });
    
    const gameCanvasElem = document.getElementById('gameCanvas');
    if (gameCanvasElem && !isCanvasListenerAdded) {
        isCanvasListenerAdded = true;
        const handleCanvasPointer = (e) => {
            if (!isGameStarted) return;
            if (e.target.closest('#psAnalogStick') || e.target.closest('#btnInteract') || e.target.closest('#miniMapBtn')) return;
            
            const rect = gameCanvasElem.getBoundingClientRect();
            const clientX = e.clientX || (e.touches && e.touches[0].clientX);
            const clientY = e.clientY || (e.touches && e.touches[0].clientY);
            if (clientX === undefined || clientY === undefined) return;

            const currentZoom = getAdaptiveZoom();
            const viewW = gameCanvasElem.width / currentZoom;
            const viewH = gameCanvasElem.height / currentZoom;

            const camX = Math.max(0, Math.min(MAP_WIDTH - viewW, player.x - viewW / 2));
            const camY = Math.max(0, Math.min(MAP_HEIGHT - viewH, player.y - viewH / 2));

            const canvasX = (clientX - rect.left) / currentZoom;
            const canvasY = (clientY - rect.top) / currentZoom;

            player.targetX = camX + canvasX;
            player.targetY = camY + canvasY;
            player.isMovingToTarget = true;
        };
        gameCanvasElem.addEventListener('click', handleCanvasPointer);
    }

    setupTouchAnalogStick(); 
    setupInactivityListeners(); 
}

let isMiniMapOpen = false, miniMapTimer = null, userZoomModifier = 0;
const MAP_WIDTH = 2000, MAP_HEIGHT = 1200;

function changeZoom(delta) { userZoomModifier = Math.max(-0.4, Math.min(0.8, userZoomModifier + delta)); }
function getAdaptiveZoom() {
    const screenW = window.innerWidth, screenH = window.innerHeight;
    let baseZoom = (screenW < 900 || screenH < 500) ? Math.max(0.75, Math.min(0.95, screenW / 900)) : 1.35;
    return Math.max(0.4, Math.min(2.2, baseZoom + userZoomModifier));
}

function gameLoop() {
    if (!isGameStarted) return;
    const canvas = document.getElementById('gameCanvas');
    if (!canvas || !canvas.parentElement) return;
    const ctx = canvas.getContext('2d');

    canvas.width = canvas.parentElement.clientWidth || window.innerWidth; 
    canvas.height = canvas.parentElement.clientHeight || window.innerHeight; 

    updateGame();
    updateMyPositionToFirebase();
    
    const currentZoomScale = getAdaptiveZoom();
    const viewWidth = canvas.width / currentZoomScale;
    const viewHeight = canvas.height / currentZoomScale;

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
            drawCharacterSprite(ctx, pData.x - cameraX - player.width / 2, pData.y - cameraY - player.height, player.width, player.height, pData.gender || 'male', pData.direction || 'down', activeWalkTimer);
            ctx.restore();
        });
    }

    if (typeof trees !== 'undefined' && typeof drawTree === 'function') {
        trees.forEach(tree => { if (tree.y <= player.y) drawTree(tree, cameraX, cameraY, currentZoomScale); });
    }

    ctx.save(); ctx.scale(currentZoomScale, currentZoomScale);
    drawCharacterSprite(ctx, player.x - cameraX - player.width / 2, player.y - cameraY - player.height, player.width, player.height, selectedGender, player.direction, activeWalkTimer);
    ctx.restore();

    if (typeof trees !== 'undefined' && typeof drawTree === 'function') {
        trees.forEach(tree => { if (tree.y > player.y) drawTree(tree, cameraX, cameraY, currentZoomScale); });
    }

    if (isMiniMapOpen) renderMiniMap();

    requestAnimationFrame(gameLoop);
}

function setupTouchAnalogStick() {
    const stick = document.getElementById('psAnalogStick'), knob = document.getElementById('analogKnob');
    if (!stick || !knob) return;
    let isDragging = false, centerPos = { x: 0, y: 0 }, maxRadius = 40;

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
        let deltaX = clientX - centerPos.x, deltaY = clientY - centerPos.y, dist = Math.hypot(deltaX, deltaY);
        if (dist > maxRadius) { deltaX = (deltaX / dist) * maxRadius; deltaY = (deltaY / dist) * maxRadius; }
        knob.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

        keys.ArrowLeft = deltaX < -8; keys.ArrowRight = deltaX > 8; 
        keys.ArrowUp = deltaY < -8; keys.ArrowDown = deltaY > 8;
        player.isMovingToTarget = false;
    };
    const handleEnd = () => { 
        if (!isDragging) return; 
        isDragging = false; 
        knob.style.transform = `translate(0px, 0px)`; 
        keys.ArrowLeft = false; keys.ArrowRight = false; keys.ArrowUp = false; keys.ArrowDown = false; 
    };

    stick.addEventListener('touchstart', handleStart, { passive: false }); 
    stick.addEventListener('mousedown', handleStart); 
    window.addEventListener('touchmove', handleMove, { passive: false }); 
    window.addEventListener('mousemove', handleMove); 
    window.addEventListener('touchend', handleEnd); 
    window.addEventListener('mouseup', handleEnd);
}

function triggerInteraction() {
    if (!nearbyBuilding) return;
    if (nearbyBuilding.isPortal) {
        switchWorldLocation(nearbyBuilding.targetLocation);
    } else {
        document.getElementById('modalTitle').innerHTML = `${nearbyBuilding.icon} ${nearbyBuilding.dialogTitle}`;
        document.getElementById('modalContent').innerText = nearbyBuilding.dialogText;
        document.getElementById('modalActions').innerHTML = `<button onclick="closeModal()" class="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold rounded-xl transition">${nearbyBuilding.actionLabel || 'Tutup'}</button>`;
        document.getElementById('dialogModal').classList.remove('hidden');
    }
}

function toggleMiniMap() { if (isMiniMapOpen) closeMiniMap(); else openMiniMap(); }
function openMiniMap() {
    isMiniMapOpen = true;
    const popup = document.getElementById('miniMapPopup');
    if (popup) popup.classList.remove('hidden');
}
function closeMiniMap() {
    isMiniMapOpen = false;
    const popup = document.getElementById('miniMapPopup');
    if (popup) popup.classList.add('hidden');
}
function renderMiniMap() {
    const largeMapCanvas = document.getElementById('largeMapCanvas');
    if (!largeMapCanvas) return;
    const mCtx = largeMapCanvas.getContext('2d');
    largeMapCanvas.width = 400; 
    largeMapCanvas.height = 240;

    mCtx.fillStyle = (currentWorldLocation === 2) ? '#0284c7' : '#15803d';
    mCtx.fillRect(0, 0, largeMapCanvas.width, largeMapCanvas.height);

    const scaleX = largeMapCanvas.width / MAP_WIDTH;
    const scaleY = largeMapCanvas.height / MAP_HEIGHT;

    if (typeof currentBuildings !== 'undefined') {
        currentBuildings.forEach(b => {
            const bx = b.x * scaleX, by = b.y * scaleY, bw = b.width * scaleX, bh = b.height * scaleY;
            mCtx.fillStyle = b.roofColor || '#fde047';
            mCtx.fillRect(bx, by, bw, bh);
            mCtx.strokeStyle = '#ffffff';
            mCtx.lineWidth = 1;
            mCtx.strokeRect(bx, by, bw, bh);

            mCtx.save();
            mCtx.font = 'bold 9px Fredoka, sans-serif';
            const labelText = `${b.icon || ''} ${b.name}`;
            const textWidth = mCtx.measureText(labelText).width;
            mCtx.fillStyle = 'rgba(15, 23, 42, 0.75)';
            mCtx.fillRect(bx + bw / 2 - textWidth / 2 - 3, by - 12, textWidth + 6, 11);
            mCtx.fillStyle = '#fde047';
            mCtx.textAlign = 'center';
            mCtx.textBaseline = 'bottom';
            mCtx.fillText(labelText, bx + bw / 2, by - 2);
            mCtx.restore();
        });
    }

    const px = player.x * scaleX, py = player.y * scaleY;
    mCtx.fillStyle = '#ef4444';
    mCtx.beginPath();
    mCtx.arc(px, py, 6, 0, Math.PI * 2);
    mCtx.fill();
    mCtx.strokeStyle = '#ffffff';
    mCtx.lineWidth = 2;
    mCtx.stroke();
}

function openEditCharacterModal() {
    tempModalGender = selectedGender;
    document.getElementById('editNameInput').value = playerCustomName;
    selectModalGender(selectedGender);
    document.getElementById('editCharModal').classList.remove('hidden');
}
function closeEditCharacterModal() { document.getElementById('editCharModal').classList.add('hidden'); }

function selectModalGender(g) {
    tempModalGender = g;
    const optF = document.getElementById('selectOptionFemale');
    const optM = document.getElementById('selectOptionMale');
    if (g === 'female') {
        optF.classList.add('border-yellow-400', 'bg-slate-700'); optF.classList.remove('border-transparent');
        optM.classList.remove('border-yellow-400', 'bg-slate-700'); optM.classList.add('border-transparent');
    } else {
        optM.classList.add('border-yellow-400', 'bg-slate-700'); optM.classList.remove('border-transparent');
        optF.classList.remove('border-yellow-400', 'bg-slate-700'); optF.classList.add('border-transparent');
    }
}

function saveCharacterEdits() {
    const newName = document.getElementById('editNameInput').value.trim();
    if (newName) playerCustomName = newName;
    if (tempModalGender) selectedGender = tempModalGender;

    document.getElementById('charNameDisplay').innerText = playerCustomName;
    document.getElementById('avatarBadge').innerText = (selectedGender === 'female') ? '🧕' : '👦';
    closeEditCharacterModal();
    updateMyPositionToFirebase();
}

function openOnlinePlayersModal() { document.getElementById('onlinePlayersModal').classList.remove('hidden'); }
function closeOnlinePlayersModal() { document.getElementById('onlinePlayersModal').classList.add('hidden'); }
function handleLogout() { 
    isGameStarted = false; 
    if (myPlayerRef) {
        myPlayerRef.remove();
        myPlayerRef = null;
    }
    if (idleTimer) clearTimeout(idleTimer);
    document.getElementById('gameContainer').classList.add('hidden'); 
    document.getElementById('loginScreen').classList.remove('hidden'); 
}
function closeModal() { document.getElementById('dialogModal').classList.add('hidden'); }
window.onload = function() { fetchSpreadsheetUsers(); };