// ==========================================
// SISTEM KOSTUM (SHEET LOGIN KOLOM H = DIMILIKI, KOLOM I = DIPAKAI)
// ==========================================
const KOSTUM_APPS_SCRIPT_URL = (typeof APPS_SCRIPT_URL !== 'undefined' && APPS_SCRIPT_URL && APPS_SCRIPT_URL.startsWith('http'))
    ? APPS_SCRIPT_URL
    : "https://script.google.com/macros/s/AKfycbyoeis09l7mLW4qjoxZduX4cml_EDXiyTou73aUWECUZiFtdLiPYnz5t8d9n1cbs0Bv/exec";

let hasFullCostumes = false;
let ownedCostumes = [];   // Gabungan item dibeli (Kolom H Sheet Login)
let equippedCostume = ""; // Kostum yang sedang dipakai (Kolom I Sheet Login)

const COSTUME_SPRITES = {};
const costumeSpritesLoaded = {};

function normalizeCostumeFileName(rawName) {
    let clean = (rawName || "").trim();
    if (!clean) return "";
    if (!clean.toLowerCase().endsWith('.png')) clean += '.png';
    return clean;
}

function getCostumeSpriteImage(costumeFile) {
    const fileName = normalizeCostumeFileName(costumeFile);
    if (!fileName) return null;

    if (!COSTUME_SPRITES[fileName]) {
        const img = new Image();
        img.src = `assets/kostum/${fileName}`;
        img.onload = () => { costumeSpritesLoaded[fileName] = true; };
        img.onerror = () => { costumeSpritesLoaded[fileName] = false; };
        COSTUME_SPRITES[fileName] = img;
    }
    return costumeSpritesLoaded[fileName] ? COSTUME_SPRITES[fileName] : null;
}

// Cek apakah kostum sudah dimiliki pemain di Kolom H
window.isCostumeOwnedByPlayer = function(costumeFile) {
    if (hasFullCostumes) return true;
    const target = normalizeCostumeFileName(costumeFile).toLowerCase();
    return ownedCostumes.some(c => normalizeCostumeFileName(c).toLowerCase() === target);
};

// Simpan Kolom H (gabungan kostum + pet) & Kolom I (kostum dipakai) ke Google Spreadsheet
function syncCostumeDataToSpreadsheet() {
    const joinedColH = hasFullCostumes ? 'full' : ownedCostumes.join(', ');

    if (typeof currentUserAccount !== 'undefined' && currentUserAccount) {
        currentUserAccount.ownedCostumes = [...ownedCostumes];
        currentUserAccount.equippedCostume = equippedCostume;
        sessionStorage.setItem('activeUserSession', JSON.stringify(currentUserAccount));
    }

    if (KOSTUM_APPS_SCRIPT_URL && KOSTUM_APPS_SCRIPT_URL.startsWith('http') && typeof playerCustomName !== 'undefined' && playerCustomName) {
        fetch(KOSTUM_APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
                action: 'updateCostume',
                player: playerCustomName,
                ownedCostumes: joinedColH,
                equippedCostume: equippedCostume,
                updatedAt: Date.now()
            })
        }).catch(() => {});
    }
}

// Dipanggil oleh toko.js saat membeli kostum (Kolom D = "k")
window.addOwnedCostumeToPlayer = function(costumeFile) {
    const normalized = normalizeCostumeFileName(costumeFile);
    if (!normalized) return;

    if (!window.isCostumeOwnedByPlayer(normalized)) {
        ownedCostumes.push(normalized);
    }
    equippedCostume = normalized;
    syncCostumeDataToSpreadsheet();

    if (typeof updateMyPositionToFirebase === 'function') {
        updateMyPositionToFirebase();
    }
};

// Pakai kostum dari Tab Profil -> Kostum
window.equipCostume = function(costumeFile) {
    const normalized = normalizeCostumeFileName(costumeFile);
    if (!normalized || !window.isCostumeOwnedByPlayer(normalized)) return;

    equippedCostume = normalized;
    syncCostumeDataToSpreadsheet();

    if (typeof updateMyPositionToFirebase === 'function') {
        updateMyPositionToFirebase();
    }
    if (typeof renderProfileCostumeWardrobe === 'function') {
        renderProfileCostumeWardrobe();
    }
};

// Kembali ke baju default
window.unequipCostume = function() {
    equippedCostume = "";
    syncCostumeDataToSpreadsheet();

    if (typeof updateMyPositionToFirebase === 'function') {
        updateMyPositionToFirebase();
    }
    if (typeof renderProfileCostumeWardrobe === 'function') {
        renderProfileCostumeWardrobe();
    }
};

// Ambil daftar file yang berkategori Pet ('h') di Toko agar tidak tampil di lemari Kostum
function getExcludedPetFilesSet() {
    const petSet = new Set();
    if (Array.isArray(window.SHOP_CATALOG_ITEMS)) {
        window.SHOP_CATALOG_ITEMS.forEach(item => {
            if ((item.typeCode || '').toLowerCase() === 'h' && item.fileName) {
                petSet.add(normalizeCostumeFileName(item.fileName).toLowerCase());
            }
        });
    }
    return petSet;
}

// Render daftar kostum di Tab Profil -> Kostum (mengecualikan file Pet 'h' dari Kolom H)
window.renderProfileCostumeWardrobe = async function() {
    const container = document.getElementById('profileCostumeWardrobe');
    if (!container) return;

    if (typeof ensureShopCatalogLoaded === 'function' && (!window.SHOP_CATALOG_ITEMS || window.SHOP_CATALOG_ITEMS.length === 0)) {
        await ensureShopCatalogLoaded(false);
    }

    const excludedPets = getExcludedPetFilesSet();
    let availableCostumes = [];

    if (hasFullCostumes && Array.isArray(window.SHOP_CATALOG_ITEMS)) {
        window.SHOP_CATALOG_ITEMS.forEach(item => {
            if ((item.typeCode || '').toLowerCase() === 'k' && item.fileName) {
                const norm = normalizeCostumeFileName(item.fileName);
                if (!availableCostumes.some(c => c.toLowerCase() === norm.toLowerCase())) {
                    availableCostumes.push(norm);
                }
            }
        });
    } else {
        ownedCostumes.forEach(rawItem => {
            const norm = normalizeCostumeFileName(rawItem);
            if (!excludedPets.has(norm.toLowerCase())) {
                if (!availableCostumes.some(c => c.toLowerCase() === norm.toLowerCase())) {
                    availableCostumes.push(norm);
                }
            }
        });
    }

    if (availableCostumes.length === 0) {
        container.innerHTML = `<div class="col-span-2 text-center text-[11px] text-slate-400 py-4">Belum punya kostum. Beli di Warung / Toko!</div>`;
        return;
    }

    container.innerHTML = availableCostumes.map(fileName => {
        const isEquipped = (normalizeCostumeFileName(equippedCostume).toLowerCase() === fileName.toLowerCase());
        const displayLabel = fileName.replace(/\.png$/i, '');
        return `
            <div onclick="equipCostume('${fileName.replace(/'/g, "\\'")}')" class="cursor-pointer p-2 rounded-xl border-2 transition flex flex-col items-center gap-1 ${isEquipped ? 'border-yellow-400 bg-yellow-400/15' : 'border-slate-700 bg-slate-900 hover:border-slate-500'}">
                <img src="assets/kostum/${fileName}" onerror="this.src='assets/poin.png'" alt="${displayLabel}" class="w-10 h-10 object-contain">
                <span class="text-[10px] font-bold text-white truncate max-w-full">${displayLabel}</span>
                <span class="text-[9px] font-extrabold px-2 py-0.5 rounded-md ${isEquipped ? 'bg-yellow-400 text-slate-950' : 'bg-slate-800 text-slate-300'}">
                    ${isEquipped ? 'Dipakai' : 'Pakai'}
                </span>
            </div>
        `;
    }).join('');
};
