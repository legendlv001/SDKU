// ==========================================
// LINK GOOGLE APPS SCRIPT
// ==========================================
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxeb8P7lsmjdHT26Kbb0YQn9HA1I1PPwqDeCeBev2Txe3QAk_fgB7PORZ1Or-V3U5U4/exec";

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

// Daftar seluruh file kostum yang tersedia di folder assets/kostom/
const ALL_AVAILABLE_COSTUMES = [
    "lk_batik.png",
    "lk_damkar.png",
    "lk_pjok.png",
    "lk_pramuka.png",
    "pr_batik.png",
    "pr_perawat.png",
    "pr_pjok.png",
    "pr_pramuka.png"
];

let USER_DATABASE = [
    { name: "Admin", gender: "A", role: "ADMIN", status: "Full", points: 100, tickets: 10, password: "123", hasFullCostumes: true, ownedCostumes: [], equippedCostume: "" }, 
    { name: "Ali", gender: "L", role: "SISWA", status: "Full", points: 50, tickets: 3, password: "123", hasFullCostumes: false, ownedCostumes: [], equippedCostume: "" }, 
    { name: "Aisyah", gender: "P", role: "SISWI", status: "User", points: 50, tickets: 3, password: "123", hasFullCostumes: false, ownedCostumes: [], equippedCostume: "" }
];

let isDatabaseReady = false;
let playerPoints = 0;
let playerTickets = 0;

// Variabel Sistem Kostum (Kolom H & Kolom I Sheet Login)
let hasFullCostumes = false;
let ownedCostumes = [];
let equippedCostume = "";

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
    } catch (e) {}
}

// ==========================================
// SINKRONISASI POIN (KOLOM E) & TIKET (KOLOM G)
// ==========================================
function updatePointsDisplay() {
    const headerPoin = document.getElementById('headerPoinDisplay');
    const modalPoin = document.getElementById('modalPoinDisplay');
    const shopPoin = document.getElementById('shopPoinBalance');
    const modalTiket = document.getElementById('modalTiketDisplay');

    if (headerPoin) headerPoin.innerText = playerPoints;
    if (modalPoin) modalPoin.innerText = playerPoints;
    if (shopPoin) shopPoin.innerText = playerPoints;
    if (modalTiket) modalTiket.innerText = playerTickets;
}

async function initPlayerPointsSync(sheetDefaultPoints, sheetDefaultTickets = 0) {
    playerPoints = parseInt(sheetDefaultPoints, 10) || 0;
    playerTickets = parseInt(sheetDefaultTickets, 10) || 0;
    updatePointsDisplay();

    if (typeof APPS_SCRIPT_URL !== 'undefined' && APPS_SCRIPT_URL && APPS_SCRIPT_URL.startsWith('http') && playerCustomName) {
        try {
            const [resPoin, resTiket] = await Promise.all([
                fetch(`${APPS_SCRIPT_URL}?action=getPlayerPoints&player=${encodeURIComponent(playerCustomName)}`),
                fetch(`${APPS_SCRIPT_URL}?action=getPlayerTickets&player=${encodeURIComponent(playerCustomName)}`)
            ]);
            const dataPoin = await resPoin.json();
            const dataTiket = await resTiket.json();

            if (dataPoin && dataPoin.status === 'success' && typeof dataPoin.points === 'number') {
                playerPoints = dataPoin.points;
            }
            if (dataTiket && dataTiket.status === 'success' && typeof dataTiket.tickets === 'number') {
                playerTickets = dataTiket.tickets;
            }
            updatePointsDisplay();
            if (currentUserAccount) {
                currentUserAccount.points = playerPoints;
                currentUserAccount.tickets = playerTickets;
                sessionStorage.setItem('activeUserSession', JSON.stringify(currentUserAccount));
            }
        } catch (err) {}
    }
}

function savePlayerPointsToFirebase() {
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
        }).catch(() => {});
    }
}

// ==========================================
// HELPER KOSTUM & PREVIEW 1 SPRITE UTUH
// ==========================================
function formatCostumeDisplayName(fileName) {
    return String(fileName || "")
        .replace(/^(pr_|lk_)/i, '')
        .replace(/\.png$/i, '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
}

function resolveCostumeFileName(rawItemName, genderCode) {
    const clean = rawItemName.trim().toLowerCase().replace(/\s+/g, '_');
    if (clean.startsWith('pr_') || clean.startsWith('lk_')) {
        return clean.endsWith('.png') ? clean : `${clean}.png`;
    }
    const prefix = (genderCode === 'P') ? 'pr_' : 'lk_';
    return `${prefix}${clean}.png`;
}

function createSingleSpritePreviewHTML(costumeFile, boxClass = "w-11 h-11") {
    const safeFile = costumeFile.replace(/'/g, "\\'");
    return `
        <div class="${boxClass} bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center border border-slate-700 shrink-0 relative">
            <canvas data-costume-preview="${safeFile}" width="48" height="48" class="w-full h-full object-contain"></canvas>
        </div>
    `;
}

function renderAllCostumePreviewCanvases() {
    const canvases = document.querySelectorAll('canvas[data-costume-preview]');
    canvases.forEach(cvs => {
        const fileName = cvs.getAttribute('data-costume-preview');
        if (!fileName) return;
        const img = new Image();
        img.src = `assets/kostom/${fileName}`;
        img.onload = () => {
            const ctx = cvs.getContext('2d');
            ctx.clearRect(0, 0, cvs.width, cvs.height);
            // Potong HANYA 1 sprite (kolom 0, baris 0 = posisi berdiri menghadap depan)
            const cols = (img.width % 4 === 0 && img.width >= img.height) ? 4 : 3;
            const rows = 4;
            const frameW = Math.floor(img.width / cols);
            const frameH = Math.floor(img.height / rows);
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(img, 0, 0, frameW, frameH, 4, 2, cvs.width - 8, cvs.height - 4);
        };
    });
}

function saveEquippedCostumeToSheet(costumeFileName) {
    if (!playerCustomName) return;

    if (currentUserAccount) {
        currentUserAccount.equippedCostume = costumeFileName;
        sessionStorage.setItem('activeUserSession', JSON.stringify(currentUserAccount));
    }

    if (typeof APPS_SCRIPT_URL !== 'undefined' && APPS_SCRIPT_URL && APPS_SCRIPT_URL.startsWith('http')) {
        fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
                action: 'updateEquippedCostume',
                player: playerCustomName,
                equippedCostume: costumeFileName || ""
            })
        }).catch(() => {});
    }
}

window.forceFullscreenAndLandscape = async function() {
    const docEl = document.documentElement;
    try {
        const requestFS = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
        if (requestFS && !document.fullscreenElement && !document.webkitFullscreenElement) {
            await requestFS.call(docEl);
        }
    } catch (err) {}
    try {
        if (screen.orientation && screen.orientation.lock) {
            await screen.orientation.lock('landscape');
        }
    } catch (err) {}
};

window.navigateToLocalHtml = function(targetHtmlUrl) {
    if (!targetHtmlUrl) return;
    if (currentUserAccount) {
        const updatedSession = {
            ...currentUserAccount,
            name: playerCustomName,
            points: playerPoints,
            tickets: playerTickets,
            hasFullCostumes: hasFullCostumes,
            ownedCostumes: ownedCostumes,
            equippedCostume: equippedCostume
        };
        sessionStorage.setItem('activeUserSession', JSON.stringify(updatedSession));
        sessionStorage.setItem('savedPlayerPosition', JSON.stringify({
            x: player.x,
            y: player.y,
            location: currentWorldLocation,
            activeSpriteGender: selectedGender
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
                    const gCode = (cols[1] || "L").toUpperCase();
                    const parsedPoints = parseInt((cols[4] || "0").replace(/[^0-9-]/g, ''), 10);
                    const parsedTickets = parseInt((cols[6] || "0").replace(/[^0-9-]/g, ''), 10); // Kolom G: Tiket
                    const rawColH = (cols[7] || "").trim(); // Kolom H: Kostum dimiliki / "full"
                    const rawColI = (cols[8] || "").trim(); // Kolom I: Kostum dipakai saat login

                    // Jika Kolom B = 'A' ATAU Kolom H = 'full', semua kostum terbuka
                    const isFullCostume = (gCode === 'A') || (rawColH.toLowerCase() === 'full');

                    fetchedUsers.push({ 
                        name: cols[0], 
                        gender: gCode,
                        role: (cols[2] || "SISWA").toUpperCase(),
                        status: cols[3] || "User", // Kolom D: Hak akses ubah profil ("Full")
                        points: isNaN(parsedPoints) ? 0 : parsedPoints,
                        password: cols[5] || "",
                        tickets: isNaN(parsedTickets) ? 0 : parsedTickets,
                        hasFullCostumes: isFullCostume,
                        ownedCostumes: isFullCostume 
                            ? [] 
                            : rawColH.split(',').map(s => s.trim()).filter(Boolean),
                        equippedCostume: rawColI
                    });
                }
            }
            if (fetchedUsers.length > 0) USER_DATABASE = fetchedUsers;
        }
        isDatabaseReady = true;
        hideLoginLoading();
    } catch (err) { 
        isDatabaseReady = true;
        hideLoginLoading();
    }
}

let currentUserAccount = null, selectedGender = 'male', playerCustomName = "", playerRole = "", isAdminUser = false;
window.walkTimer = 0; let tempModalGender = null, nearbyBuilding = null, isGameStarted = false, currentWorldLocation = 1;
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

    // Hapus sisa kick lama terlebih dahulu sebelum memasang listener kick baru
    const myKickRef = db.ref('kickedPlayers/' + safeKey);
    myKickRef.remove().then(() => {
        myKickRef.on('value', (snapshot) => {
            if (isGameStarted && snapshot.exists() && snapshot.val() === true) {
                myKickRef.remove();
                handleLogout();
                showKickedInfoModal("Anda telah dikeluarkan dari permainan oleh Admin.");
            }
        });
    }).catch(() => {});

    db.ref('players').on('value', (snapshot) => {
        const data = snapshot.val() || {};
        delete data[safeKey]; 
        window.otherPlayers = data;
        updateOnlinePlayersList(data);
    });
}

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

window.handleChatSubmit = function(e) {
    if (e && e.preventDefault) e.preventDefault();
    const input = document.getElementById('chatInput');
    if (!input) return;
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';
    window.sendFirebaseChat(playerCustomName, msg);
};

function sendChatMessage() {
    handleChatSubmit();
}

window.isChatOpen = false;
window.toggleChat = function() {
    const box = document.getElementById('chatBoxPopup');
    const badge = document.getElementById('chatBadge');
    if (!box) return;
    window.isChatOpen = !window.isChatOpen;
    if (window.isChatOpen) {
        box.classList.remove('hidden');
        if (badge) { badge.innerText = '0'; badge.classList.add('hidden'); }
    } else {
        box.classList.add('hidden');
    }
};

function initFirebaseChatSync() {
    if (!db) return;
    const chatMessagesContainer = document.getElementById('chatMessages');
    if (chatMessagesContainer) chatMessagesContainer.innerHTML = '';

    const otherList = Object.values(window.otherPlayers || {});
    if (otherList.length === 0) {
        db.ref('lastActiveTime').once('value', (snapshot) => {
            const lastActive = snapshot.val();
            if (lastActive && (Date.now() - lastActive > 10 * 60 * 1000)) {
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
        addChatMessage(msgData.sender, msgData.text, msgData.sender === playerCustomName);
        if (!window.isChatOpen && msgData.sender !== playerCustomName) {
            const badge = document.getElementById('chatBadge');
            if (badge) {
                const count = (parseInt(badge.innerText, 10) || 0) + 1;
                badge.innerText = count;
                badge.classList.remove('hidden');
            }
        }
    });
}

window.sendFirebaseChat = function(senderName, messageText) {
    if (!db || !messageText) return;
    db.ref('chats').push({
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
    if (onlineCountText) onlineCountText.innerText = `${otherList.length + 1} Online`;

    listElem.innerHTML = '';
    const selfBadge = selectedGender === 'admin' ? '👑' : (selectedGender === 'female' ? '🧕' : '👦');
    const selfItem = document.createElement('div');
    selfItem.className = 'flex items-center justify-between p-2 rounded-xl bg-slate-800 border border-yellow-400/50';
    selfItem.innerHTML = `
        <div class="flex items-center gap-2">
            <span class="text-base">${selfBadge}</span>
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
        const pBadge = p.gender === 'admin' ? '👑' : (p.gender === 'female' ? '🧕' : '👦');
        const kickButtonHTML = isAdminUser 
            ? `<button type="button" onclick="kickPlayerByAdmin('${p.name.replace(/'/g, "\\'")}')" class="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded-lg transition flex items-center gap-1 shadow"><i class="fas fa-user-xmark"></i> Kick</button>`
            : `<span class="text-[10px] text-slate-400">${locName}</span>`;

        item.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="text-base">${pBadge}</span>
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

let pendingKickTargetName = null;
window.kickPlayerByAdmin = function(targetPlayerName) {
    if (!isAdminUser || !db || !targetPlayerName) return;
    pendingKickTargetName = targetPlayerName;
    const textElem = document.getElementById('kickConfirmText');
    if (textElem) textElem.innerHTML = `Apakah Anda yakin ingin mengeluarkan <strong class="text-yellow-400">${targetPlayerName}</strong> dari game?`;
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
        costume: equippedCostume || "",
        direction: player.direction,
        location: currentWorldLocation,
        role: playerRole,
        lastUpdated: Date.now()
    });
}

function startGameSession(matchedUser, savedPosition = null, isResume = false) {
    currentUserAccount = matchedUser; 
    playerCustomName = matchedUser.name;

    // Gender asli dari Kolom B Sheet Login ('A', 'L', atau 'P')
    const accountGenderCode = (matchedUser.gender || 'L').toUpperCase().trim();
    const isAccountTypeA = (accountGenderCode === 'A');

    // Jika Kolom B = 'A', sprite default awal selalu 'admin' (assets/admin.png) kecuali saat resume sesi
    if (savedPosition && savedPosition.activeSpriteGender) {
        selectedGender = savedPosition.activeSpriteGender;
    } else if (isAccountTypeA) {
        selectedGender = 'admin';
    } else if (accountGenderCode === 'P') {
        selectedGender = 'female';
    } else {
        selectedGender = 'male';
    }

    playerRole = matchedUser.role || 'SISWA';
    isAdminUser = (isAccountTypeA || matchedUser.role === 'ADMIN' || (matchedUser.status || "").toLowerCase().trim() === 'full' || (matchedUser.status || "").toLowerCase().trim() === 'admin');

    // Jika Kolom B = 'A' atau Kolom H = 'full', semua kostum lk_ dan pr_ terbuka
    hasFullCostumes = isAccountTypeA || Boolean(matchedUser.hasFullCostumes);
    ownedCostumes = Array.isArray(matchedUser.ownedCostumes) ? [...matchedUser.ownedCostumes] : [];
    equippedCostume = (matchedUser.equippedCostume || "").trim();

    if (equippedCostume && !equippedCostume.toLowerCase().endsWith('.png')) {
        equippedCostume += '.png';
    }

    sessionStorage.setItem('activeUserSession', JSON.stringify(matchedUser));
    initPlayerPointsSync(matchedUser.points, matchedUser.tickets || 0);

    document.body.classList.add('game-active');
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('gameContainer').classList.remove('hidden');
    document.getElementById('charNameDisplay').innerText = playerCustomName;
    document.getElementById('charRoleDisplay').innerText = playerRole;
    document.getElementById('avatarBadge').innerText = (selectedGender === 'admin') ? '👑' : ((selectedGender === 'female') ? '🧕' : '👦');

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

window.handleLogin = function(e) {
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

    if (String(matchedUser.password).trim() !== inputPassword) {
        if (errorMsg) {
            errorMsg.innerHTML = `<span class="text-xs text-red-400 font-medium">Password salah! Silakan periksa kembali.</span>`; 
            errorMsg.classList.remove('hidden');
        }
        return;
    }

    if (rememberElem && rememberElem.checked) {
        localStorage.setItem('openworld_saved_login', JSON.stringify({ username: inputUsername, password: inputPassword }));
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
};

function switchWorldLocation(targetLocId) {
    currentWorldLocation = targetLocId;
    if (typeof MAP_CONFIGS !== 'undefined' && MAP_CONFIGS[targetLocId]) {
        currentBuildings = MAP_CONFIGS[targetLocId].buildings;
        const locationIndicatorBadge = document.getElementById('locationIndicatorBadge');
        if (locationIndicatorBadge) {
            const pinColor = targetLocId === 1 ? 'indigo' : (targetLocId === 2 ? 'cyan' : 'emerald');
            locationIndicatorBadge.innerHTML = `<i class="fas fa-map-pin text-${pinColor}-400"></i> <span id="currentLocationNameText">${MAP_CONFIGS[targetLocId].name}</span>`;
        }
    }

    if (targetLocId === 3 && typeof initKelasSpawn === 'function') initKelasSpawn(player);
    else if (targetLocId === 2 && typeof initPantaiSpawn === 'function') initPantaiSpawn(player);
    else if (targetLocId === 2) { player.x = 240; player.y = 240; }
    else { player.x = 390; player.y = 380; }

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
        gameCanvasElem.addEventListener('click', (e) => {
            if (!isGameStarted) return;
            if (e.target.closest('#psAnalogStick') || e.target.closest('#btnInteract') || e.target.closest('#miniMapBtn')) return;
            const rect = gameCanvasElem.getBoundingClientRect();
            const currentZoom = getAdaptiveZoom();
            const viewW = gameCanvasElem.width / currentZoom;
            const viewH = gameCanvasElem.height / currentZoom;
            const camX = Math.max(0, Math.min(MAP_WIDTH - viewW, player.x - viewW / 2));
            const camY = Math.max(0, Math.min(MAP_HEIGHT - viewH, player.y - viewH / 2));

            player.targetX = camX + ((e.clientX - rect.left) / currentZoom);
            player.targetY = camY + ((e.clientY - rect.top) / currentZoom);
            player.isMovingToTarget = true;
            if (typeof resetUIAutoCloseTimer === 'function') resetUIAutoCloseTimer();
        });
    }
    setupTouchAnalogStick(); 
    setupInactivityListeners(); 
}

let isMiniMapOpen = false, userZoomModifier = 0;
const MAP_WIDTH = 2000, MAP_HEIGHT = 1200;

window.changeZoom = function(delta) { userZoomModifier = Math.max(-0.4, Math.min(0.8, userZoomModifier + delta)); };
function getAdaptiveZoom() {
    const screenW = window.innerWidth, screenH = window.innerHeight;
    let baseZoom = (screenW < 900 || screenH < 500) ? Math.max(0.6, Math.min(0.8, screenW / 1150)) : 1.25;
    return Math.max(0.4, Math.min(2.2, baseZoom + userZoomModifier));
}

function gameLoop() {
    if (!isGameStarted) return;
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    canvas.width = (canvas.parentElement && canvas.parentElement.clientWidth) ? canvas.parentElement.clientWidth : window.innerWidth; 
    canvas.height = (canvas.parentElement && canvas.parentElement.clientHeight) ? canvas.parentElement.clientHeight : window.innerHeight; 

    const prevX = player.x;
    const prevY = player.y;

    updateGame();

    if (typeof isCollidingWithMap === 'function') {
        const nextX = player.x, nextY = player.y;
        if (isCollidingWithMap(nextX, prevY)) { player.x = prevX; player.isMovingToTarget = false; }
        if (isCollidingWithMap(player.x, nextY)) { player.y = prevY; player.isMovingToTarget = false; }
    }

    updateMyPositionToFirebase();
    
    const currentZoomScale = getAdaptiveZoom();
    const viewWidth = canvas.width / currentZoomScale;
    const viewHeight = canvas.height / currentZoomScale;

    let cameraX = Math.round(Math.max(0, Math.min(MAP_WIDTH - viewWidth, player.x - viewWidth / 2)));
    let cameraY = Math.round(Math.max(0, Math.min(MAP_HEIGHT - viewHeight, player.y - viewHeight / 2)));

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (typeof drawMap === 'function') {
        drawMap(cameraX, cameraY, currentZoomScale);
    } else {
        ctx.fillStyle = '#15803d';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (typeof drawCollisionDebug === 'function') drawCollisionDebug(ctx, cameraX, cameraY, currentZoomScale);

    const activeWalkTimer = window.walkTimer || 0;

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
                pData.role,
                pData.costume || ""
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
        playerRole,
        equippedCostume
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
        e.preventDefault(); isDragging = true; 
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
        if (!isDragging) return; isDragging = false; 
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
// TOKO / WARUNG: KHUSUS TEMPAT BELI KOSTUM
// ==========================================
let currentShopItems = [];
let pendingRedeemItem = null;

function renderShopItemsList() {
    const modalContent = document.getElementById('modalContent');
    if (!modalContent) return;

    const genderCode = (currentUserAccount && currentUserAccount.gender) ? currentUserAccount.gender.toUpperCase() : 'L';
    const isAdminGender = (genderCode === 'A');

    let html = `
        <div class="flex items-center justify-between bg-amber-950/80 border border-amber-500/40 px-3.5 py-2 rounded-xl mb-3">
            <span class="text-xs font-bold text-amber-200">Poin Anda Saat Ini:</span>
            <div class="flex items-center gap-1.5">
                <img src="assets/poin.png" alt="Poin" class="w-4 h-4 object-contain coin-spin" />
                <span id="shopPoinBalance" class="text-sm font-extrabold text-amber-400">${playerPoints}</span>
            </div>
        </div>
        <div class="mb-2.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-[11px] text-slate-300 text-center">
            💡 Kostum yang sudah dibeli dapat dipakai melalui menu <strong>Profil (ikon pensil)</strong>.
        </div>
        <div id="shopFeedbackBanner" class="hidden mb-2.5 px-3 py-2 rounded-xl text-xs font-bold text-center"></div>
    `;

    let expandedShopItems = [];
    currentShopItems.forEach((item, idx) => {
        const lowerName = item.rawName.toLowerCase();
        const hasExplicitPrefix = lowerName.startsWith('pr_') || lowerName.startsWith('lk_');

        if (isAdminGender) {
            if (hasExplicitPrefix) {
                const file = lowerName.endsWith('.png') ? lowerName : `${lowerName}.png`;
                const tag = lowerName.startsWith('pr_') ? ' (PR)' : ' (LK)';
                expandedShopItems.push({ ...item, actualIndex: idx, costumeFile: file, labelName: item.displayName + tag });
            } else {
                const baseClean = lowerName.replace(/\.png$/i, '').replace(/\s+/g, '_');
                expandedShopItems.push({ ...item, actualIndex: idx, costumeFile: `lk_${baseClean}.png`, labelName: `${item.displayName} (LK)` });
                expandedShopItems.push({ ...item, actualIndex: idx, costumeFile: `pr_${baseClean}.png`, labelName: `${item.displayName} (PR)` });
            }
        } else {
            if (lowerName.startsWith('pr_') && genderCode !== 'P') return;
            if (lowerName.startsWith('lk_') && genderCode !== 'L') return;
            const file = resolveCostumeFileName(item.rawName, genderCode);
            expandedShopItems.push({ ...item, actualIndex: idx, costumeFile: file, labelName: item.displayName });
        }
    });

    if (expandedShopItems.length === 0) {
        html += `<div class="text-center text-xs text-slate-400 p-4 bg-slate-800/60 rounded-xl">Belum ada kostum yang tersedia untuk karakter Anda saat ini.</div>`;
    } else {
        html += `<div class="flex flex-col gap-2 max-h-60 overflow-y-auto w-full text-left pr-1">`;
        expandedShopItems.forEach((entry) => {
            const isOwned = hasFullCostumes || ownedCostumes.some(c => c.toLowerCase() === entry.costumeFile.toLowerCase());
            const canAfford = playerPoints >= entry.cost;

            let actionButtonHTML = '';
            if (isOwned) {
                actionButtonHTML = `<span class="px-3 py-1.5 rounded-xl font-extrabold text-[11px] bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 shrink-0">Sudah Dimiliki</span>`;
            } else {
                const btnClass = canAfford
                    ? "bg-amber-400 hover:bg-amber-500 text-slate-950 cursor-pointer active:scale-95"
                    : "bg-slate-700 text-slate-400 cursor-not-allowed opacity-60";
                actionButtonHTML = `<button type="button" onclick="promptRedeemShopItem(${entry.actualIndex}, '${entry.costumeFile}', '${entry.labelName.replace(/'/g, "\\'")}')" ${canAfford ? '' : 'disabled'} class="px-3.5 py-1.5 rounded-xl font-extrabold text-xs transition shrink-0 shadow ${btnClass}">${canAfford ? 'Beli' : 'Poin Kurang'}</button>`;
            }

            html += `
                <div class="flex items-center justify-between p-3 bg-slate-800 border border-slate-700 rounded-xl">
                    <div class="flex items-center gap-2.5 pr-2">
                        ${createSingleSpritePreviewHTML(entry.costumeFile, "w-11 h-11")}
                        <div>
                            <div class="text-xs md:text-sm font-bold text-white">${entry.labelName}</div>
                            <div class="flex items-center gap-1 mt-1">
                                <img src="assets/poin.png" alt="Poin" class="w-3.5 h-3.5 object-contain coin-spin" />
                                <span class="text-xs font-extrabold text-amber-400">${entry.cost} Poin</span>
                            </div>
                        </div>
                    </div>
                    ${actionButtonHTML}
                </div>
            `;
        });
        html += `</div>`;
    }
    modalContent.innerHTML = html;
    renderAllCostumePreviewCanvases();
}

window.promptRedeemShopItem = function(itemIndex, specificCostumeFile, specificLabelName) {
    const item = currentShopItems[itemIndex];
    if (!item || playerPoints < item.cost) return;

    const genderCode = (currentUserAccount && currentUserAccount.gender) ? currentUserAccount.gender.toUpperCase() : 'L';
    const targetFile = specificCostumeFile || resolveCostumeFileName(item.rawName, genderCode);
    const targetLabel = specificLabelName || item.displayName;

    pendingRedeemItem = { ...item, targetFile, targetLabel };
    const textElem = document.getElementById('buyConfirmText');
    if (textElem) textElem.innerHTML = `Beli kostum <strong class="text-white">${targetLabel}</strong> seharga <strong class="text-amber-400">${item.cost} Poin</strong>?`;
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

    const costumeFile = item.targetFile;

    playerPoints -= item.cost;
    if (!hasFullCostumes && !ownedCostumes.some(c => c.toLowerCase() === costumeFile.toLowerCase())) {
        ownedCostumes.push(costumeFile);
    }

    if (currentUserAccount) {
        currentUserAccount.points = playerPoints;
        currentUserAccount.ownedCostumes = ownedCostumes;
        sessionStorage.setItem('activeUserSession', JSON.stringify(currentUserAccount));
    }

    savePlayerPointsToFirebase();
    renderShopItemsList();

    const banner = document.getElementById('shopFeedbackBanner');
    if (banner) {
        banner.className = "mb-2.5 px-3 py-2 rounded-xl text-xs font-bold text-center bg-emerald-950/90 border border-emerald-500 text-emerald-300";
        banner.innerHTML = `✅ Berhasil membeli <strong>${item.targetLabel}</strong>! Silakan pakai di menu <strong>Profil</strong>.`;
        banner.classList.remove('hidden');
    }

    if (typeof APPS_SCRIPT_URL !== 'undefined' && APPS_SCRIPT_URL && APPS_SCRIPT_URL.startsWith('http')) {
        fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
                action: 'addRedeem',
                player: playerCustomName,
                item: item.targetLabel,
                costumeFile: costumeFile,
                equipNow: false,
                cost: item.cost,
                remainingPoints: playerPoints,
                timestamp: Date.now()
            })
        }).catch(() => {});
    }

    if (typeof window.sendFirebaseChat === 'function') {
        window.sendFirebaseChat("Warung", `🛍️ ${playerCustomName} baru saja membeli kostum "${item.targetLabel}"!`);
    }
};

// ==========================================
// PROFIL: LEMARI GANTI KOSTUM (PAKAI / LEPAS)
// ==========================================
function renderProfileCostumeWardrobe() {
    const wardrobeEl = document.getElementById('profileCostumeWardrobe');
    if (!wardrobeEl) return;

    const genderCode = (currentUserAccount && currentUserAccount.gender) ? currentUserAccount.gender.toUpperCase() : 'L';
    const isAdminOrFull = (genderCode === 'A') || hasFullCostumes;

    // Jika Kolom B = 'A' atau Kolom H = 'full', tampilkan semua kostum lk_ dan pr_
    const availableList = isAdminOrFull
        ? [...ALL_AVAILABLE_COSTUMES]
        : ownedCostumes;

    if (!availableList || availableList.length === 0) {
        wardrobeEl.innerHTML = `<div class="col-span-2 text-center text-[11px] text-slate-400 py-3">Belum ada kostum dimiliki. Beli kostum di 🏪 Warung Sekolah!</div>`;
        return;
    }

    let html = '';
    availableList.forEach(rawFile => {
        const file = rawFile.toLowerCase().endsWith('.png') ? rawFile : `${rawFile}.png`;
        const isEquipped = equippedCostume.toLowerCase() === file.toLowerCase();
        const tagGender = file.startsWith('pr_') ? ' (PR)' : (file.startsWith('lk_') ? ' (LK)' : '');
        const label = formatCostumeDisplayName(file) + (isAdminOrFull ? tagGender : '');

        html += `
            <div class="flex items-center justify-between p-2 rounded-xl bg-slate-800 border ${isEquipped ? 'border-emerald-400 bg-emerald-950/30' : 'border-slate-700'}">
                <div class="flex items-center gap-1.5 min-w-0">
                    ${createSingleSpritePreviewHTML(file, "w-8 h-8")}
                    <span class="text-[10px] font-bold text-white truncate">${label}</span>
                </div>
                ${isEquipped
                    ? `<button type="button" onclick="unequipCostume()" class="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-extrabold shrink-0 ml-1">Lepas</button>`
                    : `<button type="button" onclick="equipCostume('${file}')" class="px-2 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-[9px] font-extrabold shrink-0 ml-1">Pakai</button>`
                }
            </div>
        `;
    });

    wardrobeEl.innerHTML = html;
    renderAllCostumePreviewCanvases();
}

window.equipCostume = function(costumeFile) {
    equippedCostume = costumeFile;
    saveEquippedCostumeToSheet(equippedCostume);
    updateMyPositionToFirebase();
    renderProfileCostumeWardrobe();
};

window.unequipCostume = function() {
    equippedCostume = "";
    saveEquippedCostumeToSheet("");
    updateMyPositionToFirebase();
    renderProfileCostumeWardrobe();
};

window.triggerInteraction = async function() {
    if (!nearbyBuilding) return;
    if (currentWorldLocation === 3 && typeof handleKelasInteraction === 'function' && handleKelasInteraction(nearbyBuilding)) return;
    if (currentWorldLocation === 2 && typeof handlePantaiInteraction === 'function' && handlePantaiInteraction(nearbyBuilding)) return;
    if (nearbyBuilding.targetUrl) { navigateToLocalHtml(nearbyBuilding.targetUrl); return; }
    if (nearbyBuilding.isPortal) { switchWorldLocation(nearbyBuilding.targetLocation); return; }

    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    const modalActions = document.getElementById('modalActions');

    modalTitle.innerHTML = `${nearbyBuilding.icon} ${nearbyBuilding.dialogTitle}`;
    modalContent.innerHTML = `<div class="flex flex-col items-center justify-center p-4"><img src="assets/loading.gif" alt="Loading..." class="w-8 h-8 mb-2" /><span class="text-xs text-slate-300">Memuat data ${nearbyBuilding.name}...</span></div>`;
    modalActions.innerHTML = `<button type="button" onclick="closeModal()" class="px-5 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl text-xs transition">Tutup</button>`;
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
                    const cleanDisplay = formatCostumeDisplayName(cols[0]);
                    currentShopItems.push({ rawName: cols[0], name: cleanDisplay, displayName: cleanDisplay, cost: isNaN(itemCost) ? 0 : itemCost });
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
                    let htmlFile = cols[1];
                    if (!htmlFile.toLowerCase().endsWith('.html') && !htmlFile.startsWith('http')) htmlFile += '.html';
                    htmlList += `<button type="button" onclick="navigateToLocalHtml('${htmlFile.replace(/'/g, "\\'")}')" class="flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-700 border border-orange-500/40 hover:border-yellow-400 rounded-xl text-yellow-400 font-bold text-xs transition cursor-pointer w-full text-left active:scale-95"><span>🏀 ${cols[0]}</span><span class="px-2.5 py-1 bg-orange-500/20 text-orange-300 rounded-lg text-[10px] flex items-center gap-1">Buka <i class="fas fa-play text-[9px]"></i></span></button>`;
                }
            }
            htmlList += `</div>`;
            modalContent.innerHTML = hasItems ? htmlList : `<div class="text-center text-xs text-slate-400 p-3">Belum ada kegiatan / permainan PJOK tersedia saat ini.</div>`;
        } else if (nearbyBuilding.sheetName === 'Perpus') {
            let htmlHTML = `<div class="flex flex-col gap-2 max-h-60 overflow-y-auto w-full text-left">`;
            let hasItems = false;
            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
                if (cols[0]) {
                    hasItems = true;
                    htmlHTML += `<a href="${cols[1] || "#"}" target="_blank" class="flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-yellow-400 font-semibold text-xs transition"><span>📖 ${cols[0]}</span><i class="fas fa-external-link-alt text-[10px] text-slate-400"></i></a>`;
                }
            }
            htmlHTML += `</div>`;
            modalContent.innerHTML = hasItems ? htmlHTML : `<div class="text-center text-xs text-slate-400 p-2">Belum ada koleksi buku / link kelas di Perpustakaan.</div>`;
        } else {
            let hasItems = false;
            let htmlHTML = `<div class="flex flex-col gap-2 max-h-60 overflow-y-auto w-full text-left">`;
            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
                if (cols[0]) {
                    hasItems = true;
                    htmlHTML += `<div class="p-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-xs leading-relaxed">📌 ${cols[0]}</div>`;
                }
            }
            htmlHTML += `</div>`;
            modalContent.innerHTML = hasItems ? htmlHTML : `<div class="text-center text-xs text-slate-400 p-2">Belum ada informasi baru.</div>`;
        }
    } catch (err) {
        modalContent.innerHTML = `<div class="text-center text-xs text-slate-400 p-3">Belum ada informasi / konten tersedia saat ini.</div>`;
    }
};

window.toggleMiniMap = function() { if (isMiniMapOpen) closeMiniMap(); else openMiniMap(); };
function openMiniMap() { isMiniMapOpen = true; const p = document.getElementById('miniMapPopup'); if (p) p.classList.remove('hidden'); if (typeof resetUIAutoCloseTimer === 'function') resetUIAutoCloseTimer(); }
window.closeMiniMap = function() { isMiniMapOpen = false; const p = document.getElementById('miniMapPopup'); if (p) p.classList.add('hidden'); };
function renderMiniMap() {
    const largeMapCanvas = document.getElementById('largeMapCanvas');
    if (!largeMapCanvas) return;
    const mCtx = largeMapCanvas.getContext('2d');
    largeMapCanvas.width = 400; largeMapCanvas.height = 240;
    mCtx.fillStyle = (currentWorldLocation === 3) ? '#166534' : ((currentWorldLocation === 2) ? '#0284c7' : '#15803d');
    mCtx.fillRect(0, 0, largeMapCanvas.width, largeMapCanvas.height);

    const scaleX = largeMapCanvas.width / MAP_WIDTH, scaleY = largeMapCanvas.height / MAP_HEIGHT;
    if (typeof currentBuildings !== 'undefined') {
        currentBuildings.forEach(b => {
            if (b.isSilentZone) return;
            const bx = b.x * scaleX, by = b.y * scaleY, bw = b.width * scaleX, bh = b.height * scaleY;
            mCtx.fillStyle = b.roofColor || '#fde047'; mCtx.fillRect(bx, by, bw, bh);
            mCtx.strokeStyle = '#ffffff'; mCtx.lineWidth = 1; mCtx.strokeRect(bx, by, bw, bh);
        });
    }
    const px = player.x * scaleX, py = player.y * scaleY;
    mCtx.fillStyle = '#ef4444'; mCtx.beginPath(); mCtx.arc(px, py, 6, 0, Math.PI * 2); mCtx.fill();
    mCtx.strokeStyle = '#ffffff'; mCtx.lineWidth = 2; mCtx.stroke();
}

window.openEditCharacterModal = function() {
    tempModalGender = selectedGender;
    const nameInput = document.getElementById('editNameInput');
    if (nameInput) nameInput.value = playerCustomName;

    const adminContainer = document.getElementById('adminSettingsContainer');
    const colDStatus = (currentUserAccount && currentUserAccount.status) ? currentUserAccount.status.trim().toLowerCase() : '';
    const isAccountTypeA = (currentUserAccount && (currentUserAccount.gender || '').toUpperCase().trim() === 'A');

    // Akun dengan Kolom B = 'A' ATAU Kolom D = 'Full' boleh ubah profil
    const canEditFullProfile = isAccountTypeA || (colDStatus === 'full');

    if (adminContainer) {
        if (canEditFullProfile) {
            adminContainer.classList.remove('hidden');
        } else {
            adminContainer.classList.add('hidden');
        }
    }

    updatePointsDisplay();
    selectModalGender(selectedGender);
    renderProfileCostumeWardrobe();
    document.getElementById('editCharModal').classList.remove('hidden');
};

window.closeEditCharacterModal = function() { document.getElementById('editCharModal').classList.add('hidden'); };

window.selectModalGender = function(g) {
    tempModalGender = g;
    const optF = document.getElementById('selectOptionFemale');
    const optM = document.getElementById('selectOptionMale');
    const optA = document.getElementById('selectOptionAdmin');
    const grid = document.getElementById('genderChoiceGrid');

    const isAccountTypeA = (currentUserAccount && (currentUserAccount.gender || '').toUpperCase().trim() === 'A');

    // Jika Kolom B = 'A', tampilkan 3 opsi (Aisyah, Ali, Admin); jika bukan 'A', tampilkan 2 opsi saja
    if (optA && grid) {
        if (isAccountTypeA) {
            optA.classList.remove('hidden');
            grid.classList.remove('grid-cols-2');
            grid.classList.add('grid-cols-3');
        } else {
            optA.classList.add('hidden');
            grid.classList.remove('grid-cols-3');
            grid.classList.add('grid-cols-2');
        }
    }

    [optF, optM, optA].forEach(el => {
        if (!el) return;
        el.classList.remove('border-yellow-400', 'bg-slate-700');
        el.classList.add('border-transparent');
    });

    const activeEl = (g === 'female') ? optF : ((g === 'admin') ? optA : optM);
    if (activeEl) {
        activeEl.classList.add('border-yellow-400', 'bg-slate-700');
        activeEl.classList.remove('border-transparent');
    }
};

window.saveCharacterEdits = function() {
    const colDStatus = (currentUserAccount && currentUserAccount.status) ? currentUserAccount.status.trim().toLowerCase() : '';
    const isAccountTypeA = (currentUserAccount && (currentUserAccount.gender || '').toUpperCase().trim() === 'A');

    if (!isAccountTypeA && colDStatus !== 'full') {
        closeEditCharacterModal();
        return;
    }

    const newName = document.getElementById('editNameInput').value.trim();
    if (newName) playerCustomName = newName;
    if (tempModalGender) selectedGender = tempModalGender;

    if (currentUserAccount) {
        currentUserAccount.name = playerCustomName;
        // Jika bukan akun 'A', perbarui kode gender sesi; jika akun 'A', pertahankan 'A' agar semua kostum tetap terbuka
        if (!isAccountTypeA) {
            currentUserAccount.gender = (selectedGender === 'female') ? 'P' : 'L';
        }
        sessionStorage.setItem('activeUserSession', JSON.stringify(currentUserAccount));
    }

    document.getElementById('charNameDisplay').innerText = playerCustomName;
    document.getElementById('avatarBadge').innerText = (selectedGender === 'admin') ? '👑' : ((selectedGender === 'female') ? '🧕' : '👦');
    closeEditCharacterModal();
    updateMyPositionToFirebase();
};

window.openOnlinePlayersModal = function() { document.getElementById('onlinePlayersModal').classList.remove('hidden'); };
window.closeOnlinePlayersModal = function() { document.getElementById('onlinePlayersModal').classList.add('hidden'); };

window.handleLogout = function() { 
    isGameStarted = false; 
    sessionStorage.removeItem('activeUserSession');
    sessionStorage.removeItem('savedPlayerPosition');
    document.body.classList.remove('game-active');
    try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) {}
    if (typeof closeEditCharacterModal === 'function') closeEditCharacterModal();
    if (typeof closeOnlinePlayersModal === 'function') closeOnlinePlayersModal();
    if (typeof closeModal === 'function') closeModal();
    if (typeof closeKickConfirmModal === 'function') closeKickConfirmModal();
    if (typeof closeBuyConfirmModal === 'function') closeBuyConfirmModal();
    if (myPlayerRef) { myPlayerRef.remove(); myPlayerRef = null; }
    if (db) db.ref('lastActiveTime').set(Date.now());
    if (chatRefQuery) { chatRefQuery.off(); chatRefQuery = null; }
    if (idleTimer) clearTimeout(idleTimer);
    loadSavedCredentials();
    document.getElementById('gameContainer').classList.add('hidden'); 
    document.getElementById('loginScreen').classList.remove('hidden'); 
};

window.closeModal = function() { document.getElementById('dialogModal').classList.add('hidden'); };

window.addEventListener('load', async function() { 
    loadSavedCredentials();
    await fetchSpreadsheetUsers(); 
    const savedSessionRaw = sessionStorage.getItem('activeUserSession');
    if (savedSessionRaw) {
        try {
            const savedUser = JSON.parse(savedSessionRaw);
            const savedPosRaw = sessionStorage.getItem('savedPlayerPosition');
            const savedPos = savedPosRaw ? JSON.parse(savedPosRaw) : null;
            sessionStorage.removeItem('savedPlayerPosition');
            if (savedUser && savedUser.name) startGameSession(savedUser, savedPos, true);
        } catch (err) {}
    }
});