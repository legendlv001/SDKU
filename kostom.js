// ==========================================
// SISTEM KOSTUM & LEMARI PROFIL (SPRITE SHEET 5x4)
// ==========================================

const FALLBACK_COSTUMES = [
    "lk_batik.png",
    "lk_damkar.png",
    "lk_pjok.png",
    "lk_pramuka.png",
    "lk_pemda.png",
    "lk_pgri1.png",
    "lk_korpri.png",
    "pr_batik.png",
    "pr_perawat.png",
    "pr_pjok.png",
    "pr_pramuka.png",
    "pr_pemda.png",
    "pr_pgri1.png",
    "pr_korpri.png"
];

let hasFullCostumes = false;
let ownedCostumes = [];
let equippedCostume = "";

// Cache gambar sprite kostum untuk dipanggil oleh player.js (getCostumeImage)
const COSTUME_IMAGE_CACHE = {};
window.getCostumeImage = function(costumeFile) {
    const raw = String(costumeFile || "").trim();
    if (!raw) return null;
    const fileName = raw.toLowerCase().endsWith('.png') ? raw : `${raw}.png`;

    if (!COSTUME_IMAGE_CACHE[fileName]) {
        const img = new Image();
        img.src = `assets/kostom/${fileName}`;
        COSTUME_IMAGE_CACHE[fileName] = img;
    }
    const cached = COSTUME_IMAGE_CACHE[fileName];
    return (cached && cached.complete && cached.naturalWidth > 0) ? cached : null;
};

function normalizeCostumeKey(name) {
    return String(name || "")
        .trim()
        .replace(/\.png$/i, "")
        .toLowerCase();
}

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

// Kotak preview 1 karakter tunggal (Baris 1 Kolom 1 = menghadap ke bawah)
function createSingleSpritePreviewHTML(costumeFile, boxClass = "w-11 h-11") {
    const safeFile = costumeFile.replace(/'/g, "\\'");
    return `
        <div class="${boxClass} bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center border border-slate-700 shrink-0 relative">
            <canvas data-costume-preview="${safeFile}" width="48" height="48" class="w-full h-full object-contain"></canvas>
        </div>
    `;
}

// Merender potongan 1 frame tunggal dari sprite sheet 5x4
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
            const cols = 5;
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

function getPetKeysToExcludeFromCostume() {
    const petKeys = new Set();
    if (typeof currentShopItems !== 'undefined' && Array.isArray(currentShopItems)) {
        currentShopItems.forEach(item => {
            if (item.itemType === 'h' && item.rawName) {
                petKeys.add(normalizeCostumeKey(item.rawName));
            }
        });
    }
    return petKeys;
}

// ==========================================
// LEMARI KOSTUM DI PROFIL (PAKAI / LEPAS)
// ==========================================
async function renderProfileCostumeWardrobe() {
    const wardrobeEl = document.getElementById('profileCostumeWardrobe');
    if (!wardrobeEl) return;

    wardrobeEl.innerHTML = `<div class="col-span-2 text-center text-[11px] text-slate-400 py-3">Memuat lemari kostum...</div>`;

    const genderCode = (currentUserAccount && currentUserAccount.gender) ? currentUserAccount.gender.toUpperCase() : 'L';
    const isAdminOrFull = (genderCode === 'A') || hasFullCostumes;

    if (typeof ensureShopCatalogLoaded === 'function') {
        await ensureShopCatalogLoaded(false);
    }

    const excludedPetKeys = getPetKeysToExcludeFromCostume();
    const catalogFilesMap = new Map();

    if (typeof currentShopItems !== 'undefined' && Array.isArray(currentShopItems) && currentShopItems.length > 0) {
        currentShopItems.forEach(item => {
            if (item.itemType && item.itemType !== 'k') return;

            const lowerName = item.rawName.toLowerCase();
            const hasExplicitPrefix = lowerName.startsWith('pr_') || lowerName.startsWith('lk_');

            if (isAdminOrFull) {
                if (hasExplicitPrefix) {
                    const f = lowerName.endsWith('.png') ? lowerName : `${lowerName}.png`;
                    catalogFilesMap.set(normalizeCostumeKey(f), f);
                } else {
                    const baseClean = lowerName.replace(/\.png$/i, '').replace(/\s+/g, '_');
                    catalogFilesMap.set(`lk_${baseClean}`, `lk_${baseClean}.png`);
                    catalogFilesMap.set(`pr_${baseClean}`, `pr_${baseClean}.png`);
                }
            } else {
                const f = resolveCostumeFileName(item.rawName, genderCode);
                catalogFilesMap.set(normalizeCostumeKey(f), f);
            }
        });
    } else if (isAdminOrFull) {
        FALLBACK_COSTUMES.forEach(f => catalogFilesMap.set(normalizeCostumeKey(f), f));
    }

    (ownedCostumes || []).forEach(raw => {
        const cleanFile = raw.toLowerCase().endsWith('.png') ? raw.trim() : `${raw.trim()}.png`;
        const key = normalizeCostumeKey(cleanFile);
        if (key && !excludedPetKeys.has(key) && !catalogFilesMap.has(key)) {
            catalogFilesMap.set(key, cleanFile);
        }
    });

    const ownedKeys = new Set((ownedCostumes || []).map(c => normalizeCostumeKey(c)));
    const availableList = [];

    catalogFilesMap.forEach((fileName, key) => {
        if (!excludedPetKeys.has(key) && (isAdminOrFull || ownedKeys.has(key))) {
            availableList.push(fileName);
        }
    });

    if (availableList.length === 0) {
        wardrobeEl.innerHTML = `<div class="col-span-2 text-center text-[11px] text-slate-400 py-3">Belum ada kostum dimiliki. Beli kostum di 🏪 Warung Sekolah!</div>`;
        return;
    }

    const equippedKey = normalizeCostumeKey(equippedCostume);
    let html = '';

    availableList.forEach(file => {
        const isEquipped = equippedKey && (normalizeCostumeKey(file) === equippedKey);
        const tagGender = file.toLowerCase().startsWith('pr_') ? ' (PR)' : (file.toLowerCase().startsWith('lk_') ? ' (LK)' : '');
        const label = formatCostumeDisplayName(file) + (isAdminOrFull ? tagGender : '');
        const safeFile = file.replace(/'/g, "\\'");

        html += `
            <div class="flex items-center justify-between p-2 rounded-xl bg-slate-800 border ${isEquipped ? 'border-emerald-400 bg-emerald-950/30' : 'border-slate-700'}">
                <div class="flex items-center gap-1.5 min-w-0">
                    ${createSingleSpritePreviewHTML(file, "w-8 h-8")}
                    <span class="text-[10px] font-bold text-white truncate">${label}</span>
                </div>
                ${isEquipped
                    ? `<button type="button" onclick="unequipCostume()" class="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-extrabold shrink-0 ml-1">Lepas</button>`
                    : `<button type="button" onclick="equipCostume('${safeFile}')" class="px-2 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-[9px] font-extrabold shrink-0 ml-1">Pakai</button>`
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
    if (typeof updateMyPositionToFirebase === 'function') updateMyPositionToFirebase();
    renderProfileCostumeWardrobe();
};

window.unequipCostume = function() {
    equippedCostume = "";
    saveEquippedCostumeToSheet("");
    if (typeof updateMyPositionToFirebase === 'function') updateMyPositionToFirebase();
    renderProfileCostumeWardrobe();
};
