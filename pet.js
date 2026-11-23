// ==========================================
// SISTEM PET (GABUNG KOLOM H = DIMILIKI, KOLOM J = PET DIPAKAI)
// ==========================================
const PET_APPS_SCRIPT_URL = (typeof APPS_SCRIPT_URL !== 'undefined' && APPS_SCRIPT_URL && APPS_SCRIPT_URL.startsWith('http'))
    ? APPS_SCRIPT_URL
    : "https://script.google.com/macros/s/AKfycbyoeis09l7mLW4qjoxZduX4cml_EDXiyTou73aUWECUZiFtdLiPYnz5t8d9n1cbs0Bv/exec";

let equippedPet = ""; // Disimpan di Sheet Login Kolom J

const PET_SPRITES = {};
const petSpritesLoaded = {};

function normalizePetFileName(rawName) {
    let clean = (rawName || "").trim();
    if (!clean) return "";
    if (!clean.toLowerCase().endsWith('.png')) clean += '.png';
    return clean;
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
    direction: 'down',
    isMoving: false,
    bobTimer: 0
};

const playerPetTrail = [];
const PET_MAX_TRAIL = 30;
const PET_FOLLOW_DIST = 44;

// Cek apakah pemain memiliki pet ini di gabungan Kolom H (ownedCostumes)
window.isPetOwnedByPlayer = function(petFile) {
    if (typeof hasFullCostumes !== 'undefined' && hasFullCostumes) return true;
    const target = normalizePetFileName(petFile).toLowerCase();
    const listH = (typeof ownedCostumes !== 'undefined' && Array.isArray(ownedCostumes)) ? ownedCostumes : [];
    return listH.some(item => normalizePetFileName(item).toLowerCase() === target);
};

// Dipanggil saat login dari data Sheet Login (Kolom H & Kolom J)
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
    playerPetTrail.length = 0;
    playerPetState.x = player.x - 36;
    playerPetState.y = player.y + 8;
    playerPetState.direction = player.direction || 'down';
}

// Simpan gabungan Kolom H (ownedCostumes) & Kolom J (equippedPet) ke Spreadsheet
function syncPetAndInventoryToSpreadsheet() {
    const isFull = (typeof hasFullCostumes !== 'undefined' && hasFullCostumes);
    const listH = (typeof ownedCostumes !== 'undefined' && Array.isArray(ownedCostumes)) ? ownedCostumes : [];
    const joinedColH = isFull ? 'full' : listH.join(', ');

    if (typeof currentUserAccount !== 'undefined' && currentUserAccount) {
        currentUserAccount.ownedCostumes = [...listH];
        currentUserAccount.equippedPet = equippedPet;
        sessionStorage.setItem('activeUserSession', JSON.stringify(currentUserAccount));
    }

    if (PET_APPS_SCRIPT_URL && PET_APPS_SCRIPT_URL.startsWith('http') && typeof playerCustomName !== 'undefined' && playerCustomName) {
        fetch(PET_APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
                action: 'updateInventoryAndPet',
                player: playerCustomName,
                colH: joinedColH,       // Kolom H: Gabungan semua item dibeli (kostum + pet)
                colJ: equippedPet,      // Kolom J: Pet yang sedang dipakai
                updatedAt: Date.now()
            })
        }).catch(() => {});
    }
}

// Dipanggil oleh toko.js saat membeli barang dengan Kolom D = "h"
window.addOwnedPetToPlayer = function(petFile) {
    const normalized = normalizePetFileName(petFile);
    if (!normalized) return;

    // Gabungkan ke array Kolom H (ownedCostumes) agar tersimpan bersama kostum
    if (typeof ownedCostumes !== 'undefined' && Array.isArray(ownedCostumes)) {
        if (!window.isPetOwnedByPlayer(normalized)) {
            ownedCostumes.push(normalized);
        }
    }

    equippedPet = normalized; // Langsung dipakai & ditulis ke Kolom J
    syncPetToPlayerPosition();
    syncPetAndInventoryToSpreadsheet();
};

// Pakai pet dari Tab Profil -> Pet (langsung update Kolom J)
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

// Lepas pet (kosongkan Kolom J)
window.unequipPet = function() {
    equippedPet = "";
    syncPetAndInventoryToSpreadsheet();

    if (typeof renderProfilePetWardrobe === 'function') {
        renderProfilePetWardrobe();
    }
};

// Ambil daftar file yang berkategori Pet ('h') dari katalog Toko
function getShopPetFileSet() {
    const petSet = new Set();
    if (Array.isArray(window.SHOP_CATALOG_ITEMS)) {
        window.SHOP_CATALOG_ITEMS.forEach(item => {
            if ((item.typeCode || '').toLowerCase() === 'h' && item.fileName) {
                petSet.add(normalizePetFileName(item.fileName).toLowerCase());
            }
        });
    }
    return petSet;
}

// Render daftar pet dimiliki di Tab Profil -> Pet (diambil dari gabungan Kolom H)
window.renderProfilePetWardrobe = function() {
    const container = document.getElementById('profilePetWardrobe');
    if (!container) return;

    const isFull = (typeof hasFullCostumes !== 'undefined' && hasFullCostumes);
    const listH = (typeof ownedCostumes !== 'undefined' && Array.isArray(ownedCostumes)) ? ownedCostumes : [];
    const shopPetSet = getShopPetFileSet();

    let availablePets = [];
    if (isFull) {
        shopPetSet.forEach(lowerName => availablePets.push(lowerName));
    } else {
        listH.forEach(rawItem => {
            const norm = normalizePetFileName(rawItem);
            // Ambil item dari Kolom H yang terdaftar sebagai pet ('h') di sheet Toko
            if (shopPetSet.size === 0 || shopPetSet.has(norm.toLowerCase())) {
                if (!availablePets.some(p => p.toLowerCase() === norm.toLowerCase())) {
                    availablePets.push(norm);
                }
            }
        });
    }

    if (availablePets.length === 0) {
        container.innerHTML = `<div class="col-span-2 text-center text-[11px] text-slate-400 py-4">Belum punya pet. Beli di Warung / Toko!</div>`;
        return;
    }

    container.innerHTML = availablePets.map(fileName => {
        const isEquipped = (normalizePetFileName(equippedPet).toLowerCase() === fileName.toLowerCase());
        const displayLabel = fileName.replace(/\.png$/i, '');
        return `
            <div onclick="equipPet('${fileName.replace(/'/g, "\\'")}')" class="cursor-pointer p-2 rounded-xl border-2 transition flex flex-col items-center gap-1 ${isEquipped ? 'border-yellow-400 bg-yellow-400/15' : 'border-slate-700 bg-slate-900 hover:border-slate-500'}">
                <img src="assets/pet/${fileName}" onerror="this.src='assets/poin.png'" alt="${displayLabel}" class="w-10 h-10 object-contain">
                <span class="text-[10px] font-bold text-white truncate max-w-full">${displayLabel}</span>
                <span class="text-[9px] font-extrabold px-2 py-0.5 rounded-md ${isEquipped ? 'bg-yellow-400 text-slate-950' : 'bg-slate-800 text-slate-300'}">
                    ${isEquipped ? 'Dipakai' : 'Pakai'}
                </span>
            </div>
        `;
    }).join('');
};

// ==========================================
// UPDATE & GAMBAR PET MENGIKUTI BELAKANG PEMAIN
// ==========================================
function updatePlayerPet() {
    if (!equippedPet || typeof player === 'undefined') return;

    const distToPlayer = Math.hypot(player.x - playerPetState.x, player.y - playerPetState.y);
    if (distToPlayer > 280) {
        syncPetToPlayerPosition();
        return;
    }

    const lastTrail = playerPetTrail[playerPetTrail.length - 1];
    if (!lastTrail || Math.hypot(player.x - lastTrail.x, player.y - lastTrail.y) > 4) {
        playerPetTrail.push({ x: player.x, y: player.y, direction: player.direction || 'down' });
        if (playerPetTrail.length > PET_MAX_TRAIL) playerPetTrail.shift();
    }

    let targetX = player.x;
    let targetY = player.y;

    switch (player.direction) {
        case 'up': targetY = player.y + PET_FOLLOW_DIST; break;
        case 'down': targetY = player.y - PET_FOLLOW_DIST; break;
        case 'left': targetX = player.x + PET_FOLLOW_DIST; break;
        case 'right': targetX = player.x - PET_FOLLOW_DIST; break;
        default: targetX = player.x - PET_FOLLOW_DIST;
    }

    if (playerPetTrail.length > 4) {
        const oldest = playerPetTrail[0];
        if (Math.hypot(player.x - oldest.x, player.y - oldest.y) >= PET_FOLLOW_DIST * 0.85) {
            targetX = oldest.x;
            targetY = oldest.y;
        }
    }

    const dx = targetX - playerPetState.x;
    const dy = targetY - playerPetState.y;
    const distance = Math.hypot(dx, dy);

    if (distance > 4) {
        playerPetState.isMoving = true;
        const speed = Math.min(5.5, Math.max(2.2, distance * 0.14));
        playerPetState.x += (dx / distance) * speed;
        playerPetState.y += (dy / distance) * speed;
        playerPetState.direction = (Math.abs(dx) > Math.abs(dy)) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
        playerPetState.bobTimer += 0.25;
    } else {
        playerPetState.isMoving = false;
        playerPetState.bobTimer += 0.06;
    }
}

function drawMyPlayerPet(ctx, cameraX, cameraY, zoomScale) {
    if (!equippedPet) return;
    updatePlayerPet();

    const petX = playerPetState.x - cameraX;
    const petY = playerPetState.y - cameraY;

    ctx.save();
    ctx.scale(zoomScale, zoomScale);

    const bounceOffset = playerPetState.isMoving
        ? Math.abs(Math.sin(playerPetState.bobTimer)) * 5
        : Math.sin(playerPetState.bobTimer) * 1.5;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath();
    ctx.ellipse(petX, petY + 12, 11, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    const spriteImg = getPetSpriteImage(equippedPet);
    if (spriteImg) {
        ctx.save();
        ctx.translate(petX, petY - bounceOffset);
        if (playerPetState.direction === 'right') ctx.scale(-1, 1);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(spriteImg, -16, -16, 32, 32);
        ctx.restore();
    } else {
        ctx.save();
        ctx.translate(petX, petY - bounceOffset);
        if (playerPetState.direction === 'right') ctx.scale(-1, 1);
        ctx.font = '24px Fredoka, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🐾', 0, 0);
        ctx.restore();
    }

    ctx.restore();
}
