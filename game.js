// ==========================================
// LINK GOOGLE APPS SCRIPT (LETAKKAN PALING ATAS)
// ==========================================
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbweLr2mAfN5TA_3VdRnbnlpVYfzMjT23ndlzeW3LoXnPatrNNZuD9WQfglQ9x_eYBa1/exec";

// ==========================================
// CONFIGURATION, DATABASE & MAIN GAME LOOP
// ==========================================
const SPREADSHEET_ID = "1J4ePsSEV8xE3VCR-10Avf3W8FOQ-R1xSqWO-4IMzyWc", SHEET_NAME = "Login";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;

function getSheetCsvUrl(sheetTitle) {
    return `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetTitle)}`;
}

const firebaseConfig = {
  apiKey: "AIzaSyDDPcwN1blpYQ6fsknQbZMsort-bAOASW8",
  authDomain: "sd-ku-fa156.firebaseapp.com",
  databaseURL: "https://sd-ku-fa156-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sd-ku-fa156",
  storageBucket: "sd-ku-fa156.firebasestorage.app",
  messagingSenderId: "504435998356",
  appId: "1:504435998356:web:ea0bd8ce43a4dba0913e81"
};

let db = null;
let myPlayerRef = null;
let chatRefQuery = null;
window.otherPlayers = {};

if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
} else if (typeof firebase !== 'undefined') {
    db = firebase.database();
}

let USER_DATABASE = [
    { name: "Admin", gender: "L", role: "ADMIN", status: "Full", points: 100, password: "123" }, 
    { name: "Ali", gender: "L", role: "SISWA", status: "Full", points: 50, password: "123" }, 
    { name: "Aisyah", gender: "P", role: "SISWI", status: "User", points: 50, password: "123" }
];

let isDatabaseReady = false;
let playerPoints = 0;

const loadingGif = new Image();
loadingGif.src = 'assets/loading.gif';

const poinIconImg = new Image();
poinIconImg.src = 'assets/poin.png';

function showLoginLoading(text) {
    const popup = document.getElementById('loginLoadingPopup');
    const textElem = document.getElementById('loginLoadingText');
    if (textElem) textElem.innerText = text;
    if (popup) popup.classList.remove('hidden');
}

function hideLoginLoading() {
    const popup = document.getElementById('loginLoadingPopup');
    if (popup) popup.classList.add('hidden');
}

// ==========================================
// FUNGSI INTIP & INGAT PASSWORD (LOCALSTORAGE)
// ==========================================
window.togglePasswordVisibility = function() {
    const passInput = document.getElementById('loginPassword');
    const icon = document.getElementById('togglePassIcon');
    if (!passInput) return;
    if (passInput.type === 'password') {
        passInput.type = 'text';
        if (icon) icon.className = 'fas fa-eye-slash';
    } else {
        passInput.type = 'password';
        if (icon) icon.className = 'fas fa-eye';
    }
};

function loadSavedCredentials() {
    try {
        const savedRaw = localStorage.getItem('openworld_saved_login');
        if (!savedRaw) return;
        const saved = JSON.parse(savedRaw);
        const userEl = document.getElementById('loginUsername');
        const passEl = document.getElementById('loginPassword');
        const remEl = document.getElementById('rememberPassword');
        if (userEl && saved.username) userEl.value = saved.username;
        if (passEl && saved.password) passEl.value = saved.password;
        if (remEl) remEl.checked = true;
    } catch (e) {
        console.warn("Gagal memuat password tersimpan:", e);
    }
}

// ==========================================
// SISTEM POIN & TAMPILAN POIN (KOLOM E SPREADSHEET)
// ==========================================
function updatePointsDisplay() {
    const headerPoin = document.getElementById('headerPoinDisplay');
    const modalPoin = document.getElementById('modalPoinDisplay');
    const shopPoin = document.getElementById('shopPoinBalance');

    if (headerPoin) headerPoin.innerText = playerPoints;
    if (modalPoin) modalPoin.innerText = playerPoints;
    if (shopPoin) shopPoin.innerText = playerPoints;
}

async function initPlayerPointsSync(sheetDefaultPoints) {
    // 1. Tampilkan poin awal dari Kolom E hasil bacaan CSV Login
    playerPoints = parseInt(sheetDefaultPoints, 10) || 0;
    updatePointsDisplay();

    // 2. Sinkronkan ulang langsung ke Kolom E melalui Apps Script (anti-cache CSV)
    if (typeof APPS_SCRIPT_URL !== 'undefined' && APPS_SCRIPT_URL && APPS_SCRIPT_URL.startsWith('http') && playerCustomName) {
        try {
            const res = await fetch(`${APPS_SCRIPT_URL}?action=getPlayerPoints&player=${encodeURIComponent(playerCustomName)}`);
            const data = await res.json();
            if (data && data.status === 'success' && typeof data.points === 'number') {
                playerPoints = data.points;
                updatePointsDisplay();
                if (currentUserAccount) {
                    currentUserAccount.points = playerPoints;
                    sessionStorage.setItem('activeUserSession', JSON.stringify(currentUserAccount));
                }
            }
        } catch (err) {
            console.warn("Menggunakan poin CSV lokal karena gagal ambil dari Apps Script:", err);
        }
    }
}

function savePlayerPointsToFirebase() {
    // Tetap mempertahankan nama fungsi agar kompatibel dengan kelas.js & game mini lainnya,
    // namun penyimpanan sepenuhnya dikirim ke Kolom E Sheet Login via Apps Script (bukan Firebase).
    updatePointsDisplay();
    if (!playerCustomName) return;

    if (currentUserAccount) {
        currentUserAccount.points = playerPoints;
        sessionStorage.setItem('activeUserSession', JSON.stringify(currentUserAccount));
    }

    if (typeof APPS_SCRIPT_URL !== 'undefined' && APPS_SCRIPT_URL && APPS_SCRIPT_URL.startsWith('http')) {
        fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
                action: 'updatePoints',
                player: playerCustomName,
                points: playerPoints,
                updatedAt: Date.now()
            })
        }).catch(err => console.warn("Gagal simpan poin ke Kolom E Spreadsheet:", err));
    }
}

// ==========================================
// KONTROL FULLSCREEN & KUNCI LANDSCAPE
// ==========================================
window.forceFullscreenAndLandscape = async function() {
    const docEl = document.documentElement;

    try {
        const requestFS = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
        if (requestFS && !document.fullscreenElement && !document.webkitFullscreenElement) {
            await requestFS.call(docEl);
        }
    } catch (err) {
        console.warn("Fullscreen dibatasi browser:", err);
    }

    try {
        if (screen.orientation && screen.orientation.lock) {
            await screen.orientation.lock('landscape');
        }
    } catch (err) {
        console.warn("Orientation lock tidak didukung perangkat ini:", err);
    }
};

// ==========================================
// FUNGSI SIMPAN SESI & BUKA HALAMAN HTML LOKAL
// ==========================================
window.navigateToLocalHtml = function(targetHtmlUrl) {
    if (!targetHtmlUrl) return;
    if (currentUserAccount) {
        const updatedSession = {
            ...currentUserAccount,
            name: playerCustomName,
            gender: (selectedGender === 'female') ? 'P' : 'L',
            points: playerPoints
        };
        sessionStorage.setItem('activeUserSession', JSON.stringify(updatedSession));
        sessionStorage.setItem('savedPlayerPosition', JSON.stringify({
            x: player.x,
            y: player.y,
            location: currentWorldLocation
        }));
    }
    window.location.href = targetHtmlUrl;
};

async function fetchSpreadsheetUsers() {
    const errorMsg = document.getElementById('loginErrorMsg');
    if (errorMsg) errorMsg.classList.add('hidden');
    
    showLoginLoading("Mengunduh data akun...");

    try {
        const response = await fetch(CSV_URL); 
        if (!response.ok) throw new Error("Gagal mengunduh CSV");
        
        const csvText = await response.text(); 
        const lines = csvText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        
        if (lines.length > 1) {
            const fetchedUsers = [];
            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(cell => cell.replace(/^"|"$/g, '').trim());
                if (cols[0] && cols[0].toLowerCase() !== "nama") {
                    const parsedPoints = parseInt((cols[4] || "0").replace(/[^0-9-]/g, ''), 10);
                    fetchedUsers.push({ 
                        name: cols[0], 
                        gender: (cols[1] || "L").toUpperCase(), 
                        role: (cols[2] || "SISWA").toUpperCase(), 
                        status: cols[3] || "User",
                        points: isNaN(parsedPoints) ? 0 : parsedPoints, // Kolom E Sheet Login
                        password: cols[5] || "" // Kolom F Sheet Login
                    });
                }
            }
            if (fetchedUsers.length > 0) {
                USER_DATABASE = fetchedUsers;
            }
        }
        
        isDatabaseReady = true;
        hideLoginLoading();
    } catch (err) { 
        console.warn("Gagal memuat Spreadsheet, menggunakan Local DB fallback.", err); 
        isDatabaseReady = true;
        hideLoginLoading();
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

    const safeKey = playerCustomName.replace(/[.#$\[\]]/g, "_");
    myPlayerRef = db.ref('players/' + safeKey);

    myPlayerRef.onDisconnect().remove();
    db.ref('lastActiveTime').onDisconnect().set(Date.now());

    const myKickRef = db.ref('kickedPlayers/' + safeKey);
    myKickRef.on('value', (snapshot) => {
        if (snapshot.exists() && snapshot.val() === true) {
            myKickRef.remove();
            handleLogout();
            showKickedInfoModal("Anda telah dikeluarkan dari permainan oleh Admin.");
        }
    });

    db.ref('players').on('value', (snapshot) => {
        const data = snapshot.val() || {};
        delete data[safeKey]; 
        window.otherPlayers = data;
        updateOnlinePlayersList(data);
    });
}

// ==========================================
// SISTEM CHAT REALTIME (FIREBASE)
// ==========================================
function addChatMessage(sender, text, isSelf) {
    const container = document.getElementById('chatMessages');
    if (!container) return;

    const line = document.createElement('div');
    line.className = 'leading-snug break-words';
    const nameColor = isSelf ? 'text-yellow-400' : (sender === 'Sistem' || sender === 'Ruang Kelas' || sender === 'Warung' ? 'text-emerald-400' : 'text-sky-300');
    line.innerHTML = `<strong class="${nameColor}">${sender}:</strong> <span class="text-slate-100">${text}</span>`;
    container.appendChild(line);
    container.scrollTop = container.scrollHeight;
}

function handleChatSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    const input = document.getElementById('chatInput');
    if (!input) return;
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';
    window.sendFirebaseChat(playerCustomName, msg);
}

function initFirebaseChatSync() {
    if (!db) return;

    const chatMessagesContainer = document.getElementById('chatMessages');
    if (chatMessagesContainer) chatMessagesContainer.innerHTML = '';

    const otherList = Object.values(window.otherPlayers || {});
    
    if (otherList.length === 0) {
        db.ref('lastActiveTime').once('value', (snapshot) => {
            const lastActive = snapshot.val();
            const TEN_MINUTES_MS = 10 * 60 * 1000;

            if (lastActive && (Date.now() - lastActive > TEN_MINUTES_MS)) {
                db.ref('chats').remove();
            }
            startListeningChat();
        });
    } else {
        startListeningChat();
    }
}

function startListeningChat() {
    if (chatRefQuery) chatRefQuery.off();

    const loginTimestamp = Date.now() - 1000;
    chatRefQuery = db.ref('chats').orderByChild('timestamp').startAt(loginTimestamp);
    
    chatRefQuery.on('child_added', (snapshot) => {
        const msgData = snapshot.val();
        if (!msgData || !msgData.sender || !msgData.text) return;

        const isSelf = (msgData.sender === playerCustomName);
        addChatMessage(msgData.sender, msgData.text, isSelf);
    });
}

window.sendFirebaseChat = function(senderName, messageText) {
    if (!db || !messageText) return;
    
    const chatRef = db.ref('chats');
    chatRef.push({
        sender: senderName || playerCustomName || "Anonim",
        text: messageText,
        timestamp: Date.now()
    });
};

function updateOnlinePlayersList(otherPlayersData) {
    const listElem = document.getElementById('onlinePlayersList');
    const onlineCountText = document.getElementById('onlineCountText');
    if (!listElem) return;

    const otherList = Object.values(otherPlayersData || {});
    const totalOnline = otherList.length + 1;

    if (onlineCountText) {
        onlineCountText.innerText = `${totalOnline} Online`;
    }

    listElem.innerHTML = '';
    
    const selfItem = document.createElement('div');
    selfItem.className = 'flex items-center justify-between p-2 rounded-xl bg-slate-800 border border-yellow-400/50';
    selfItem.innerHTML = `
        <div class="flex items-center gap-2">
            <span class="text-base">${selectedGender === 'female' ? '🧕' : '👦'}</span>
            <div>
                <div class="text-xs font-bold text-yellow-400">${playerCustomName} <span class="text-[9px] text-slate-400">(Anda ${isAdminUser ? '- ADMIN' : ''})</span></div>
                <div class="text-[10px] text-slate-300">${playerRole}</div>
            </div>
        </div>
        <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/40">Aktif</span>
    `;
    listElem.appendChild(selfItem);

    otherList.forEach(p => {
        const item = document.createElement('div');
        item.className = 'flex items-center justify-between p-2 rounded-xl bg-slate-800/80 border border-slate-700';
        
        const locName = (typeof MAP_CONFIGS !== 'undefined' && MAP_CONFIGS[p.location]) 
            ? MAP_CONFIGS[p.location].name.replace('Lokasi : ', '') 
            : 'Sekolah';

        const kickButtonHTML = isAdminUser 
            ? `<button onclick="kickPlayerByAdmin('${p.name.replace(/'/g, "\\'")}')" class="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded-lg transition flex items-center gap-1 shadow"><i class="fas fa-user-xmark"></i> Kick</button>`
            : `<span class="text-[10px] text-slate-400">${locName}</span>`;

        item.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="text-base">${p.gender === 'female' ? '🧕' : '👦'}</span>
                <div>
                    <div class="text-xs font-bold text-white">${p.name}</div>
                    <div class="text-[10px] text-slate-400">${p.role || 'SISWA'}</div>
                </div>
            </div>
            ${kickButtonHTML}
        `;
        listElem.appendChild(item);
    });
}

// ==========================================
// POP-UP KONFIRMASI & INFO KICK
// ==========================================
let pendingKickTargetName = null;

window.kickPlayerByAdmin = function(targetPlayerName) {
    if (!isAdminUser || !db || !targetPlayerName) return;

    pendingKickTargetName = targetPlayerName;
    const textElem = document.getElementById('kickConfirmText');
    if (textElem) {
        textElem.innerHTML = `Apakah Anda yakin ingin mengeluarkan <strong class="text-yellow-400">${targetPlayerName}</strong> dari game?`;
    }
    const modal = document.getElementById('kickConfirmModal');
    if (modal) modal.classList.remove('hidden');
};

window.closeKickConfirmModal = function() {
    pendingKickTargetName = null;
    const modal = document.getElementById('kickConfirmModal');
    if (modal) modal.classList.add('hidden');
};

window.executeKickPlayer = function() {
    if (!isAdminUser || !db || !pendingKickTargetName) return;

    const targetPlayerName = pendingKickTargetName;
    closeKickConfirmModal();

    const safeKey = targetPlayerName.replace(/[.#$\[\]]/g, "_");
    db.ref('kickedPlayers/' + safeKey).set(true);
    db.ref('players/' + safeKey).remove();

    if (typeof window.sendFirebaseChat === 'function') {
        window.sendFirebaseChat("Sistem", `📢 ${targetPlayerName} telah dikeluarkan dari game oleh Admin ${playerCustomName}.`);
    }
};

function showKickedInfoModal(message) {
    const textElem = document.getElementById('kickedInfoText');
    if (textElem && message) textElem.innerText = message;
    const modal = document.getElementById('kickedInfoModal');
    if (modal) modal.classList.remove('hidden');
}

window.closeKickedInfoModal = function() {
    const modal = document.getElementById('kickedInfoModal');
    if (modal) modal.classList.add('hidden');
};

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

function startGameSession(matchedUser, savedPosition = null, isResume = false) {
    currentUserAccount = matchedUser; 
    playerCustomName = matchedUser.name;
    selectedGender = (matchedUser.gender === 'P') ? 'female' : 'male'; 
    playerRole = matchedUser.role || 'SISWA';
    isAdminUser = (matchedUser.role === 'ADMIN' || (matchedUser.status || "").toLowerCase().trim() === 'full' || (matchedUser.status || "").toLowerCase().trim() === 'admin');

    sessionStorage.setItem('activeUserSession', JSON.stringify(matchedUser));

    // Baca dan sinkronkan saldo poin dari Kolom E Sheet Login
    initPlayerPointsSync(matchedUser.points);

    document.body.classList.add('game-active');

    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('gameContainer').classList.remove('hidden');
    document.getElementById('charNameDisplay').innerText = playerCustomName;
    document.getElementById('charRoleDisplay').innerText = playerRole;
    document.getElementById('avatarBadge').innerText = (selectedGender === 'female') ? '🧕' : '👦';

    const targetLoc = (savedPosition && savedPosition.location) ? savedPosition.location : 1;
    switchWorldLocation(targetLoc, false);

    if (savedPosition && typeof savedPosition.x === 'number' && typeof savedPosition.y === 'number') {
        player.x = savedPosition.x;
        player.y = savedPosition.y;
    }

    if (typeof generateTrees === 'function') generateTrees();
    
    isGameStarted = true;
    initFirebaseSync();
    initFirebaseChatSync();
    requestAnimationFrame(gameLoop);

    setupGameEvents();
    resetIdleTimer();

    if (!isResume && typeof window.sendFirebaseChat === 'function') {
        window.sendFirebaseChat(playerCustomName, `Halo semuanya, ${playerCustomName} baru saja online!`);
    }
}

function handleLogin(e) {
    if (e && e.preventDefault) e.preventDefault();
    
    const inputElem = document.getElementById('loginUsername');
    const passElem = document.getElementById('loginPassword');
    const rememberElem = document.getElementById('rememberPassword');
    const errorMsg = document.getElementById('loginErrorMsg');
    if (!inputElem || !passElem) return;

    if (!isDatabaseReady) {
        showLoginLoading("Sedang menyiapkan data akun, tunggu sebentar...");
        return;
    }
    
    const inputUsername = inputElem.value.trim();
    const inputPassword = passElem.value.trim();
    if (!inputUsername || !inputPassword) return;
    
    const cleanInput = inputUsername.replace(/\s+/g, ' ').toLowerCase();
    const matchedUser = USER_DATABASE.find(user => user.name.trim().replace(/\s+/g, ' ').toLowerCase() === cleanInput);

    if (!matchedUser) {
        if (errorMsg) {
            errorMsg.innerHTML = `<span class="text-xs text-red-400 font-medium">Nama "${inputUsername}" tidak terdaftar!</span>`; 
            errorMsg.classList.remove('hidden');
        }
        return;
    }

    // Validasi Password dari Kolom F Sheet Login
    if (String(matchedUser.password).trim() !== inputPassword) {
        if (errorMsg) {
            errorMsg.innerHTML = `<span class="text-xs text-red-400 font-medium">Password salah! Silakan periksa kembali.</span>`; 
            errorMsg.classList.remove('hidden');
        }
        return;
    }

    // Simpan / hapus kredensial jika opsi Ingat Password dicentang
    if (rememberElem && rememberElem.checked) {
        localStorage.setItem('openworld_saved_login', JSON.stringify({
            username: inputUsername,
            password: inputPassword
        }));
    } else {
        localStorage.removeItem('openworld_saved_login');
    }

    if (errorMsg) errorMsg.classList.add('hidden');
    showLoginLoading("Memasuki dunia game...");

    forceFullscreenAndLandscape();

    setTimeout(() => {
        hideLoginLoading();
        startGameSession(matchedUser, null, false);
    }, 600);
}

function switchWorldLocation(targetLocId, showNotification = true) {
    currentWorldLocation = targetLocId;
    if (typeof MAP_CONFIGS !== 'undefined' && MAP_CONFIGS[targetLocId]) {
        currentBuildings = MAP_CONFIGS[targetLocId].buildings;
        const locationIndicatorBadge = document.getElementById('locationIndicatorBadge');
        if (locationIndicatorBadge) {
            const pinColor = targetLocId === 1 ? 'indigo' : (targetLocId === 2 ? 'cyan' : 'emerald');
            locationIndicatorBadge.innerHTML = `<i class="fas fa-map-pin text-${pinColor}-400"></i> <span id="currentLocationNameText">${MAP_CONFIGS[targetLocId].name}</span>`;
        }
    }

    if (targetLocId === 3 && typeof initKelasSpawn === 'function') {
        initKelasSpawn(player);
    } else if (targetLocId === 2 && typeof initPantaiSpawn === 'function') {
        initPantaiSpawn(player);
    } else if (targetLocId === 2) {
        player.x = 240;
        player.y = 240;
    } else {
        player.x = 390;
        player.y = 380;
    }

    player.targetX = null; player.targetY = null; player.isMovingToTarget = false;
    if (typeof generateTrees === 'function') generateTrees();
    updateMyPositionToFirebase();
}

let isCanvasListenerAdded = false;

function setupGameEvents() {
    window.addEventListener('keydown', (e) => {
        if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) return;
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

            if (typeof resetUIAutoCloseTimer === 'function') resetUIAutoCloseTimer();
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
    let baseZoom = (screenW < 900 || screenH < 500) ? Math.max(0.6, Math.min(0.8, screenW / 1150)) : 1.25;
    return Math.max(0.4, Math.min(2.2, baseZoom + userZoomModifier));
}

// ==========================================
// GAME LOOP
// ==========================================
function gameLoop() {
    if (!isGameStarted) return;
    const canvas = document.getElementById('gameCanvas');
    if (!canvas || !canvas.parentElement) return;
    const ctx = canvas.getContext('2d');

    canvas.width = canvas.parentElement.clientWidth || window.innerWidth; 
    canvas.height = canvas.parentElement.clientHeight || window.innerHeight; 

    const prevX = player.x;
    const prevY = player.y;

    updateGame();

    if (typeof isCollidingWithMap === 'function') {
        const nextX = player.x;
        const nextY = player.y;

        if (isCollidingWithMap(nextX, prevY)) {
            player.x = prevX;
            player.isMovingToTarget = false;
        }
        if (isCollidingWithMap(player.x, nextY)) {
            player.y = prevY;
            player.isMovingToTarget = false;
        }
    }

    updateMyPositionToFirebase();
    
    const currentZoomScale = getAdaptiveZoom();
    const viewWidth = canvas.width / currentZoomScale;
    const viewHeight = canvas.height / currentZoomScale;

    let cameraX = Math.round(Math.max(0, Math.min(MAP_WIDTH - viewWidth, player.x - viewWidth / 2)));
    let cameraY = Math.round(Math.max(0, Math.min(MAP_HEIGHT - viewHeight, player.y - viewHeight / 2)));

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (typeof drawMap === 'function') drawMap(cameraX, cameraY, currentZoomScale);
    if (typeof drawCollisionDebug === 'function') drawCollisionDebug(ctx, cameraX, cameraY, currentZoomScale);

    const activeWalkTimer = typeof walkTimer !== 'undefined' ? walkTimer : (window.walkTimer || 0);

    if (window.otherPlayers) {
        Object.keys(window.otherPlayers).forEach(id => {
            const pData = window.otherPlayers[id];
            if (!pData || (pData.location || 1) !== currentWorldLocation) return;
            ctx.save(); ctx.scale(currentZoomScale, currentZoomScale);
            drawCharacterSprite(
                ctx, 
                pData.x - cameraX - player.width / 2, 
                pData.y - cameraY - player.height / 2, 
                player.width, 
                player.height, 
                pData.gender || 'male', 
                pData.direction || 'down', 
                activeWalkTimer, 
                pData.name, 
                pData.role
            );
            ctx.restore();
        });
    }

    if (typeof trees !== 'undefined' && typeof drawTree === 'function') {
        trees.forEach(tree => { if (tree.y <= player.y) drawTree(tree, cameraX, cameraY, currentZoomScale); });
    }

    ctx.save(); ctx.scale(currentZoomScale, currentZoomScale);
    drawCharacterSprite(
        ctx, 
        player.x - cameraX - player.width / 2, 
        player.y - cameraY - player.height / 2, 
        player.width, 
        player.height, 
        selectedGender, 
        player.direction, 
        activeWalkTimer, 
        playerCustomName, 
        playerRole
    );
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
    let isDragging = false, centerPos = { x: 0, y: 0 }, maxRadius = 35;

    const handleStart = (e) => { 
        e.preventDefault(); 
        isDragging = true; 
        const rect = stick.getBoundingClientRect(); 
        centerPos = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }; 
        maxRadius = rect.width * 0.36;
        handleMove(e); 
    };
    const handleMove = (e) => {
        if (!isDragging) return;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        let deltaX = clientX - centerPos.x, deltaY = clientY - centerPos.y, dist = Math.hypot(deltaX, deltaY);
        if (dist > maxRadius) { deltaX = (deltaX / dist) * maxRadius; deltaY = (deltaY / dist) * maxRadius; }
        knob.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

        keys.ArrowLeft = deltaX < -6; keys.ArrowRight = deltaX > 6; 
        keys.ArrowUp = deltaY < -6; keys.ArrowDown = deltaY > 6;
        player.isMovingToTarget = false;

        if (typeof resetUIAutoCloseTimer === 'function') resetUIAutoCloseTimer();
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

// ==========================================
// INTERAKSI DENGAN SPREADSHEET BANGUNAN & TOKO
// ==========================================
let currentShopItems = [];
let pendingRedeemItem = null;

function renderShopItemsList() {
    const modalContent = document.getElementById('modalContent');
    if (!modalContent) return;

    let html = `
        <div class="flex items-center justify-between bg-amber-950/80 border border-amber-500/40 px-3.5 py-2 rounded-xl mb-3">
            <span class="text-xs font-bold text-amber-200">Poin Anda Saat Ini:</span>
            <div class="flex items-center gap-1.5">
                <img src="assets/poin.png" alt="Poin" class="w-4 h-4 object-contain coin-spin" />
                <span id="shopPoinBalance" class="text-sm font-extrabold text-amber-400">${playerPoints}</span>
            </div>
        </div>
        <div id="shopFeedbackBanner" class="hidden mb-2.5 px-3 py-2 rounded-xl text-xs font-bold text-center"></div>
    `;

    if (currentShopItems.length === 0) {
        html += `<div class="text-center text-xs text-slate-400 p-4 bg-slate-800/60 rounded-xl">Belum ada barang yang dijual di Toko saat ini.</div>`;
    } else {
        html += `<div class="flex flex-col gap-2 max-h-60 overflow-y-auto w-full text-left pr-1">`;
        currentShopItems.forEach((item, idx) => {
            const canAfford = playerPoints >= item.cost;
            const btnClass = canAfford
                ? "bg-amber-400 hover:bg-amber-500 text-slate-950 cursor-pointer active:scale-95"
                : "bg-slate-700 text-slate-400 cursor-not-allowed opacity-60";

            html += `
                <div class="flex items-center justify-between p-3 bg-slate-800 border border-slate-700 rounded-xl">
                    <div class="pr-2">
                        <div class="text-xs md:text-sm font-bold text-white">${item.name}</div>
                        <div class="flex items-center gap-1 mt-1">
                            <img src="assets/poin.png" alt="Poin" class="w-3.5 h-3.5 object-contain coin-spin" />
                            <span class="text-xs font-extrabold text-amber-400">${item.cost} Poin</span>
                        </div>
                    </div>
                    <button onclick="promptRedeemShopItem(${idx})" ${canAfford ? '' : 'disabled'} class="px-3.5 py-1.5 rounded-xl font-extrabold text-xs transition shrink-0 shadow ${btnClass}">
                        ${canAfford ? 'Tukar' : 'Poin Kurang'}
                    </button>
                </div>
            `;
        });
        html += `</div>`;
    }

    modalContent.innerHTML = html;
}

window.promptRedeemShopItem = function(itemIndex) {
    const item = currentShopItems[itemIndex];
    if (!item || playerPoints < item.cost) return;

    pendingRedeemItem = item;
    const textElem = document.getElementById('buyConfirmText');
    if (textElem) {
        textElem.innerHTML = `Tukarkan <strong class="text-amber-400">${item.cost} Poin</strong> untuk mendapatkan <strong class="text-white">${item.name}</strong>?`;
    }
    const modal = document.getElementById('buyConfirmModal');
    if (modal) modal.classList.remove('hidden');
};

window.closeBuyConfirmModal = function() {
    pendingRedeemItem = null;
    const modal = document.getElementById('buyConfirmModal');
    if (modal) modal.classList.add('hidden');
};

window.executeRedeemItem = function() {
    if (!pendingRedeemItem) return;
    const item = pendingRedeemItem;
    closeBuyConfirmModal();

    if (playerPoints < item.cost) return;

    playerPoints -= item.cost;
    // Update kolom E Sheet Login via Apps Script
    savePlayerPointsToFirebase();

    renderShopItemsList();

    const banner = document.getElementById('shopFeedbackBanner');
    if (banner) {
        banner.className = "mb-2.5 px-3 py-2 rounded-xl text-xs font-bold text-center bg-emerald-950/90 border border-emerald-500 text-emerald-300";
        banner.innerHTML = `✅ Berhasil menukarkan ${item.cost} Poin dengan <strong>${item.name}</strong>!`;
        banner.classList.remove('hidden');
    }

    // Simpan riwayat penukaran (redeemHistory) ke Google Apps Script
    if (typeof APPS_SCRIPT_URL !== 'undefined' && APPS_SCRIPT_URL && APPS_SCRIPT_URL.startsWith('http')) {
        fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
                action: 'addRedeem',
                player: playerCustomName,
                item: item.name,
                cost: item.cost,
                remainingPoints: playerPoints,
                timestamp: Date.now()
            })
        }).catch(err => console.warn("Gagal simpan redeemHistory ke Apps Script:", err));
    }

    if (typeof window.sendFirebaseChat === 'function') {
        window.sendFirebaseChat("Warung", `🛍️ ${playerCustomName} baru saja menukarkan ${item.cost} Poin dengan "${item.name}"!`);
    }
};

async function triggerInteraction() {
    if (!nearbyBuilding) return;

    if (currentWorldLocation === 3 && typeof handleKelasInteraction === 'function') {
        if (handleKelasInteraction(nearbyBuilding)) return;
    }
    if (currentWorldLocation === 2 && typeof handlePantaiInteraction === 'function') {
        if (handlePantaiInteraction(nearbyBuilding)) return;
    }

    if (nearbyBuilding.targetUrl) {
        navigateToLocalHtml(nearbyBuilding.targetUrl);
        return;
    }
    
    if (nearbyBuilding.isPortal) {
        switchWorldLocation(nearbyBuilding.targetLocation);
        return;
    }

    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    const modalActions = document.getElementById('modalActions');

    modalTitle.innerHTML = `${nearbyBuilding.icon} ${nearbyBuilding.dialogTitle}`;
    modalContent.innerHTML = `
        <div class="flex flex-col items-center justify-center p-4">
            <img src="assets/loading.gif" alt="Loading..." class="w-8 h-8 mb-2" />
            <span class="text-xs text-slate-300">Memuat data ${nearbyBuilding.name}...</span>
        </div>
    `;
    modalActions.innerHTML = `<button onclick="closeModal()" class="px-5 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl text-xs transition">Tutup</button>`;
    document.getElementById('dialogModal').classList.remove('hidden');

    if (!nearbyBuilding.sheetName) {
        modalContent.innerText = nearbyBuilding.dialogText || "Tidak ada informasi.";
        return;
    }

    try {
        const response = await fetch(getSheetCsvUrl(nearbyBuilding.sheetName));
        if (!response.ok) throw new Error("Gagal mengambil sheet");
        
        const csvText = await response.text();
        const lines = csvText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        if (nearbyBuilding.sheetName === 'Toko') {
            currentShopItems = [];
            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
                if (cols[0]) {
                    const itemCost = parseInt((cols[1] || "0").replace(/[^0-9]/g, ''), 10);
                    currentShopItems.push({
                        name: cols[0],
                        cost: isNaN(itemCost) ? 0 : itemCost
                    });
                }
            }
            renderShopItemsList();

        } else if (nearbyBuilding.sheetName === 'PJOK') {
            let htmlList = `<div class="flex flex-col gap-2 max-h-60 overflow-y-auto w-full text-left">`;
            let hasItems = false;

            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
                if (cols[0] && cols[1]) {
                    hasItems = true;
                    const activityTitle = cols[0];
                    let htmlFile = cols[1];
                    if (!htmlFile.toLowerCase().endsWith('.html') && !htmlFile.startsWith('http')) {
                        htmlFile += '.html';
                    }
                    const safeUrl = htmlFile.replace(/'/g, "\\'");

                    htmlList += `
                        <button onclick="navigateToLocalHtml('${safeUrl}')" class="flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-700 border border-orange-500/40 hover:border-yellow-400 rounded-xl text-yellow-400 font-bold text-xs transition cursor-pointer w-full text-left active:scale-95">
                            <span>🏀 ${activityTitle}</span>
                            <span class="px-2.5 py-1 bg-orange-500/20 text-orange-300 rounded-lg text-[10px] flex items-center gap-1">
                                Buka <i class="fas fa-play text-[9px]"></i>
                            </span>
                        </button>
                    `;
                }
            }
            htmlList += `</div>`;

            if (!hasItems) {
                modalContent.innerHTML = `<div class="text-center text-xs text-slate-400 p-3">Belum ada kegiatan / permainan PJOK tersedia saat ini.</div>`;
            } else {
                modalContent.innerHTML = htmlList;
            }

        } else if (nearbyBuilding.sheetName === 'Perpus') {
            let htmlHTML = `<div class="flex flex-col gap-2 max-h-60 overflow-y-auto w-full text-left">`;
            let hasItems = false;

            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
                if (cols[0]) {
                    hasItems = true;
                    const classTitle = cols[0];
                    const classLink = cols[1] || "#";
                    htmlHTML += `
                        <a href="${classLink}" target="_blank" class="flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-yellow-400 font-semibold text-xs transition">
                            <span>📖 ${classTitle}</span>
                            <i class="fas fa-external-link-alt text-[10px] text-slate-400"></i>
                        </a>
                    `;
                }
            }
            htmlHTML += `</div>`;
            
            if (!hasItems) {
                modalContent.innerHTML = `<div class="text-center text-xs text-slate-400 p-2">Belum ada koleksi buku / link kelas di Perpustakaan.</div>`;
            } else {
                modalContent.innerHTML = htmlHTML;
            }

        } else if (nearbyBuilding.sheetName === 'Info') {
            let htmlHTML = `<div class="flex flex-col gap-2 max-h-60 overflow-y-auto w-full text-left">`;
            let hasItems = false;

            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
                if (cols[0]) {
                    hasItems = true;
                    htmlHTML += `
                        <div class="p-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-xs leading-relaxed">
                            📌 ${cols[0]}
                        </div>
                    `;
                }
            }
            htmlHTML += `</div>`;

            if (!hasItems) {
                modalContent.innerHTML = `<div class="text-center text-xs text-slate-400 p-2">Belum ada pengumuman baru di Mading.</div>`;
            } else {
                modalContent.innerHTML = htmlHTML;
            }

        } else {
            let hasItems = false;
            let htmlHTML = `<div class="flex flex-col gap-2 max-h-60 overflow-y-auto w-full text-left">`;

            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
                if (cols[0]) {
                    hasItems = true;
                    htmlHTML += `<div class="p-2.5 bg-slate-800 rounded-xl text-xs text-slate-200">• ${cols[0]}</div>`;
                }
            }
            htmlHTML += `</div>`;

            if (!hasItems) {
                modalContent.innerHTML = `<div class="text-center text-xs text-slate-400 p-3">Belum ada konten / informasi tersedia saat ini.</div>`;
            } else {
                modalContent.innerHTML = htmlHTML;
            }
        }

    } catch (err) {
        console.warn("Gagal membaca sheet gedung:", err);
        modalContent.innerHTML = `<div class="text-center text-xs text-slate-400 p-3">Belum ada informasi / konten tersedia saat ini.</div>`;
    }
}

function toggleMiniMap() { if (isMiniMapOpen) closeMiniMap(); else openMiniMap(); }
function openMiniMap() {
    isMiniMapOpen = true;
    const popup = document.getElementById('miniMapPopup');
    if (popup) popup.classList.remove('hidden');
    if (typeof resetUIAutoCloseTimer === 'function') resetUIAutoCloseTimer();
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

    mCtx.fillStyle = (currentWorldLocation === 3) ? '#166534' : ((currentWorldLocation === 2) ? '#0284c7' : '#15803d');
    mCtx.fillRect(0, 0, largeMapCanvas.width, largeMapCanvas.height);

    const scaleX = largeMapCanvas.width / MAP_WIDTH;
    const scaleY = largeMapCanvas.height / MAP_HEIGHT;

    if (typeof currentBuildings !== 'undefined') {
        currentBuildings.forEach(b => {
            if (b.isSilentZone) return;
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
    updatePointsDisplay();
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

    if (currentUserAccount) {
        currentUserAccount.name = playerCustomName;
        currentUserAccount.gender = (selectedGender === 'female') ? 'P' : 'L';
        sessionStorage.setItem('activeUserSession', JSON.stringify(currentUserAccount));
    }

    document.getElementById('charNameDisplay').innerText = playerCustomName;
    document.getElementById('avatarBadge').innerText = (selectedGender === 'female') ? '🧕' : '👦';
    closeEditCharacterModal();
    updateMyPositionToFirebase();
}

function openOnlinePlayersModal() { document.getElementById('onlinePlayersModal').classList.remove('hidden'); }
function closeOnlinePlayersModal() { document.getElementById('onlinePlayersModal').classList.add('hidden'); }

function handleLogout() { 
    isGameStarted = false; 

    sessionStorage.removeItem('activeUserSession');
    sessionStorage.removeItem('savedPlayerPosition');

    document.body.classList.remove('game-active');
    try {
        if (screen.orientation && screen.orientation.unlock) {
            screen.orientation.unlock();
        }
    } catch (e) {}

    if (typeof closeEditCharacterModal === 'function') closeEditCharacterModal();
    if (typeof closeOnlinePlayersModal === 'function') closeOnlinePlayersModal();
    if (typeof closeModal === 'function') closeModal();
    if (typeof closeKickConfirmModal === 'function') closeKickConfirmModal();
    if (typeof closeBuyConfirmModal === 'function') closeBuyConfirmModal();

    if (myPlayerRef) {
        myPlayerRef.remove();
        myPlayerRef = null;
    }

    if (db) {
        db.ref('lastActiveTime').set(Date.now());
    }

    if (chatRefQuery) {
        chatRefQuery.off();
        chatRefQuery = null;
    }
    if (idleTimer) clearTimeout(idleTimer);

    loadSavedCredentials();
    document.getElementById('gameContainer').classList.add('hidden'); 
    document.getElementById('loginScreen').classList.remove('hidden'); 
}

function closeModal() { document.getElementById('dialogModal').classList.add('hidden'); }

window.onload = async function() { 
    loadSavedCredentials();
    await fetchSpreadsheetUsers(); 

    const savedSessionRaw = sessionStorage.getItem('activeUserSession');
    if (savedSessionRaw) {
        try {
            const savedUser = JSON.parse(savedSessionRaw);
            const savedPosRaw = sessionStorage.getItem('savedPlayerPosition');
            const savedPos = savedPosRaw ? JSON.parse(savedPosRaw) : null;
            sessionStorage.removeItem('savedPlayerPosition');

            if (savedUser && savedUser.name) {
                startGameSession(savedUser, savedPos, true);
            }
        } catch (err) {
            console.warn("Gagal memulihkan sesi:", err);
        }
    }
};