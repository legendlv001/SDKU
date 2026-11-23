// ==========================================
// SISTEM PET (GRID 5x4 & POSISI SAMPING ALA TIBIAME)
// ==========================================
let equippedPet = ""; // Disimpan di Sheet Login Kolom J

const PET_SPRITES = {};
const petSpritesLoaded = {};

function normalizePetFileName(rawName) {
    let clean = String(rawName || "").trim();
    if (!clean) return "";
    if (!clean.toLowerCase().endsWith('.png')) clean += '.png';
    return clean;
}

function normalizePetCompareKey(rawName) {
    return String(rawName || "")
        .trim()
        .replace(/\.png$/i, "")
        .replace(/[\s_-]+/g, "")
        .toLowerCase();
}

function getPetSpriteImage(petFile) {
    const fileName = normalizePetFileName(petFile);
    if (!fileName) return null;

    if (!PET_SPRITES[fileName]) {
        const img = new Image();
        img.src = `assets/pet/${fileName}`;
        img.onload = () => { petSpritesLoaded[fileName] = true; };
        img.onerror = () => { petSpritesLoaded[fileName] = false; };
        PET_SPRITES[fileName] = img;
    }
    return petSpritesLoaded[fileName] ? PET_SPRITES[fileName] : null;
}

const playerPetState = {
    x: 350,
    y: 380,
    prevPlayerX: 350,
    prevPlayerY: 380,
    direction: 'down',
    isMoving: false,
    bobTimer: 0
};

const PET_SIDE_OFFSET_X = 24; // Jarak tepat di samping pemain ala TibiaME
const PET_SIDE_OFFSET_Y = 8;  // Sejajar bagian bawah kaki pemain

window.isPetOwnedByPlayer = function(petFile) {
    if (typeof hasFullCostumes !== 'undefined' && hasFullCostumes) return true;
    const targetKey = normalizePetCompareKey(petFile);
    if (!targetKey) return false;
    const listH = (typeof ownedCostumes !== 'undefined' && Array.isArray(ownedCostumes)) ? ownedCostumes : [];
    return listH.some(item => normalizePetCompareKey(item) === targetKey);
};

function initPlayerPetFromAccount(userAccount) {
    if (!userAccount) return;
    equippedPet = normalizePetFileName(userAccount.equippedPet || "");

    if (equippedPet && !window.isPetOwnedByPlayer(equippedPet)) {
        equippedPet = "";
    }
    syncPetToPlayerPosition();
}

function syncPetToPlayerPosition() {
    if (typeof player === 'undefined') return;
    playerPetState.x = player.x - PET_SIDE_OFFSET_X;
    playerPetState.y = player.y + PET_SIDE_OFFSET_Y;
    playerPetState.prevPlayerX = player.x;
    playerPetState.prevPlayerY = player.y;
    playerPetState.direction = player.direction || 'down';
}

function syncPetAndInventoryToSpreadsheet() {
    const isFull = (typeof hasFullCostumes !== 'undefined' && hasFullCostumes);
    const listH = (typeof ownedCostumes !== 'undefined' && Array.isArray(ownedCostumes)) ? ownedCostumes : [];
    const joinedColH = isFull ? 'full' : listH.join(', ');

    if (typeof currentUserAccount !== 'undefined' && currentUserAccount) {
        currentUserAccount.ownedCostumes = [...listH];
        currentUserAccount.equippedPet = equippedPet;
        sessionStorage.setItem('activeUserSession', JSON.stringify(currentUserAccount));
    }

    if (typeof APPS_SCRIPT_URL !== 'undefined' && APPS_SCRIPT_URL && APPS_SCRIPT_URL.startsWith('http') && typeof playerCustomName !== 'undefined' && playerCustomName) {
        fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
                action: 'updateInventoryAndPet',
                player: playerCustomName,
                colH: joinedColH,
                colJ: equippedPet,
                updatedAt: Date.now()
            })
        }).catch(() => {});
    }
}

window.addOwnedPetToPlayer = function(petFile) {
    const normalized = normalizePetFileName(petFile);
    if (!normalized) return;

    if (typeof ownedCostumes !== 'undefined' && Array.isArray(ownedCostumes)) {
        if (!window.isPetOwnedByPlayer(normalized)) {
            ownedCostumes.push(normalized);
        }
    }

    equippedPet = normalized;
    syncPetToPlayerPosition();
    syncPetAndInventoryToSpreadsheet();

    if (typeof renderProfilePetWardrobe === 'function') {
        renderProfilePetWardrobe();
    }
};

window.equipPet = function(petFile) {
    const normalized = normalizePetFileName(petFile);
    if (!normalized || !window.isPetOwnedByPlayer(normalized)) return;

    equippedPet = normalized;
    syncPetToPlayerPosition();
    syncPetAndInventoryToSpreadsheet();

    if (typeof renderProfilePetWardrobe === 'function') {
        renderProfilePetWardrobe();
    }
};

window.unequipPet = function() {
    equippedPet = "";
    syncPetAndInventoryToSpreadsheet();

    if (typeof renderProfilePetWardrobe === 'function') {
        renderProfilePetWardrobe();
    }
};

// Preview 1 frame pertama (Baris 1 = menghadap ke bawah)
window.renderAllPetPreviewCanvases = function() {
    const canvases = document.querySelectorAll('canvas[data-pet-preview]');
    canvases.forEach(cvs => {
        const fileName = cvs.getAttribute('data-pet-preview');
        if (!fileName) return;
        const img = new Image();
        img.src = `assets/pet/${fileName}`;
        img.onload = () => {
            const ctx = cvs.getContext('2d');
            ctx.clearRect(0, 0, cvs.width, cvs.height);
            const cols = 5;
            const rows = 4;
            const frameW = Math.floor(img.width / cols);
            const frameH = Math.floor(img.height / rows);
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(img, 0, 0, frameW, frameH, 4, 2, cvs.width - 8, cvs.height - 4);
        };
    });
};

window.renderProfilePetWardrobe = async function() {
    const container = document.getElementById('profilePetWardrobe');
    if (!container) return;

    container.innerHTML = `<div class="col-span-2 text-center text-[11px] text-slate-400 py-3">Memuat daftar pet...</div>`;

    if (typeof ensureShopCatalogLoaded === 'function') {
        await ensureShopCatalogLoaded(false);
    }

    const genderCode = (typeof currentUserAccount !== 'undefined' && currentUserAccount && currentUserAccount.gender)
        ? currentUserAccount.gender.toUpperCase() : 'L';
    const isFull = (genderCode === 'A') || (typeof hasFullCostumes !== 'undefined' && hasFullCostumes);
    const listH = (typeof ownedCostumes !== 'undefined' && Array.isArray(ownedCostumes)) ? ownedCostumes : [];

    const shopPetMap = new Map();
    if (typeof currentShopItems !== 'undefined' && Array.isArray(currentShopItems)) {
        currentShopItems.forEach(item => {
            if (item.itemType === 'h' && item.rawName) {
                const norm = normalizePetFileName(item.rawName);
                const key = normalizePetCompareKey(norm);
                if (key) {
                    shopPetMap.set(key, {
                        fileName: norm,
                        displayName: item.displayName || norm.replace(/\.png$/i, '')
                    });
                }
            }
        });
    }

    let availablePets = [];
    if (isFull) {
        shopPetMap.forEach(val => availablePets.push(val));
    } else {
        listH.forEach(rawItem => {
            const norm = normalizePetFileName(rawItem);
            const key = normalizePetCompareKey(norm);
            if (shopPetMap.has(key)) {
                const petInfo = shopPetMap.get(key);
                if (!availablePets.some(p => normalizePetCompareKey(p.fileName) === key)) {
                    availablePets.push(petInfo);
                }
            }
        });
    }

    if (availablePets.length === 0) {
        container.innerHTML = `<div class="col-span-2 text-center text-[11px] text-slate-400 py-3">Belum punya pet. Beli di 🏪 Warung Sekolah!</div>`;
        return;
    }

    const activeKey = normalizePetCompareKey(equippedPet);
    container.innerHTML = availablePets.map(petObj => {
        const isEquipped = activeKey && (normalizePetCompareKey(petObj.fileName) === activeKey);
        const safeFile = petObj.fileName.replace(/'/g, "\\'");
        return `
            <div class="flex items-center justify-between p-2 rounded-xl bg-slate-800 border ${isEquipped ? 'border-amber-400 bg-amber-950/30' : 'border-slate-700'}">
                <div class="flex items-center gap-1.5 min-w-0">
                    <div class="w-8 h-8 bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center border border-slate-700 shrink-0">
                        <canvas data-pet-preview="${safeFile}" width="48" height="48" class="w-full h-full object-contain"></canvas>
                    </div>
                    <span class="text-[10px] font-bold text-white truncate">${petObj.displayName}</span>
                </div>
                ${isEquipped
                    ? `<button type="button" onclick="unequipPet()" class="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[9px] font-extrabold shrink-0 ml-1">Lepas</button>`
                    : `<button type="button" onclick="equipPet('${safeFile}')" class="px-2 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-[9px] font-extrabold shrink-0 ml-1">Pakai</button>`
                }
            </div>
        `;
    }).join('');

    renderAllPetPreviewCanvases();
};

// ==========================================
// UPDATE & GAMBAR PET DI SAMPING PEMAIN (ALA TIBIAME)
// ==========================================
function updatePlayerPet() {
    if (!equippedPet || typeof player === 'undefined') return;

    const distToPlayer = Math.hypot(player.x - playerPetState.x, player.y - playerPetState.y);
    if (distToPlayer > 160) {
        syncPetToPlayerPosition();
        return;
    }

    // Deteksi apakah pemain sedang bergerak
    const playerMovedDist = Math.hypot(player.x - playerPetState.prevPlayerX, player.y - playerPetState.prevPlayerY);
    playerPetState.prevPlayerX = player.x;
    playerPetState.prevPlayerY = player.y;

    // Posisi target selalu di samping pemain (sebelah kiri bahu pemain)
    // Jika pemain menghadap kiri, pet bergeser ke sisi kanan agar tidak menutupi pandangan depan
    const sideSign = (player.direction === 'left') ? 1 : -1;
    const targetX = player.x + (sideSign * PET_SIDE_OFFSET_X);
    const targetY = player.y + PET_SIDE_OFFSET_Y;

    const dx = targetX - playerPetState.x;
    const dy = targetY - playerPetState.y;
    const distance = Math.hypot(dx, dy);

    // Gerakan mulus mengikuti tepat di samping pemain
    if (distance > 0.8) {
        playerPetState.x += dx * 0.28;
        playerPetState.y += dy * 0.28;
    } else {
        playerPetState.x = targetX;
        playerPetState.y = targetY;
    }

    // Arah hadap pet selalu mengikuti arah hadap pemain
    playerPetState.direction = player.direction || 'down';

    if (playerMovedDist > 0.3 || distance > 2) {
        playerPetState.isMoving = true;
        playerPetState.bobTimer += 0.22;
    } else {
        playerPetState.isMoving = false;
        playerPetState.bobTimer += 0.04;
    }
}

function drawMyPlayerPet(ctx, cameraX, cameraY, zoomScale) {
    if (!equippedPet) return;
    updatePlayerPet();

    const petX = playerPetState.x - cameraX;
    const petY = playerPetState.y - cameraY;

    ctx.save();
    ctx.scale(zoomScale, zoomScale);

    // Bayangan di bawah pet
    ctx.fillStyle = 'rgba(0, 0, 0, 0.26)';
    ctx.beginPath();
    ctx.ellipse(petX, petY + 11, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    const spriteImg = getPetSpriteImage(equippedPet);
    if (spriteImg) {
        ctx.save();
        ctx.translate(petX, petY);
        ctx.imageSmoothingEnabled = false;

        // Grid 5 kolom x 4 baris
        const cols = 5;
        const rows = 4;
        const frameW = Math.floor(spriteImg.width / cols);
        const frameH = Math.floor(spriteImg.height / rows);

        // Baris 1 (0): Bawah | Baris 2 (1): Atas | Baris 3 (2): Kiri | Baris 4 (3): Kanan
        const dirRowMap = {
            down: 0,
            up: 1,
            left: 2,
            right: 3
        };
        const rowIdx = (dirRowMap[playerPetState.direction] !== undefined)
            ? dirRowMap[playerPetState.direction]
            : 0;

        const colIdx = playerPetState.isMoving
            ? Math.floor(playerPetState.bobTimer) % cols
            : 0;

        ctx.drawImage(
            spriteImg,
            colIdx * frameW, rowIdx * frameH, frameW, frameH,
            -16, -18, 32, 32
        );
        ctx.restore();
    } else {
        ctx.save();
        ctx.translate(petX, petY);
        if (playerPetState.direction === 'right') ctx.scale(-1, 1);
        ctx.font = '22px Fredoka, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🐾', 0, 0);
        ctx.restore();
    }

    ctx.restore();
}
