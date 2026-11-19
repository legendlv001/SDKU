// ==========================================
// SISTEM KOSTUM, TOKO WARUNG & LEMARI PROFIL
// ==========================================

// Katalog cadangan jika tab 'Toko' di Spreadsheet gagal dimuat
const FALLBACK_COSTUMES = [
    "lk_batik.png",
    "lk_damkar.png",
    "lk_pjok.png",
    "lk_pramuka.png",
    "lk_pemda.png",
    "lk_pgri1.png",
    "lk_pgri2.png",
    "pr_batik.png",
    "pr_perawat.png",
    "pr_pjok.png",
    "pr_pramuka.png",
    "pr_pemda.png",
    "pr_pgri1.png",
    "pr_pgri.png"
];

// Variabel status kostum pemain (diisi saat login di game.js)
let hasFullCostumes = false;
let ownedCostumes = [];
let equippedCostume = "";

let currentShopItems = [];
let pendingRedeemItem = null;

// Normalisasi nama file kostum (huruf kecil, tanpa .png) untuk pencocokan akurat
function normalizeCostumeKey(name) {
    return String(name || "")
        .trim()
        .replace(/\.png$/i, "")
        .toLowerCase();
}

// Format nama file menjadi nama tampilan (contoh: "lk_batik.png" -> "Batik")
function formatCostumeDisplayName(fileName) {
    return String(fileName || "")
        .replace(/^(pr_|lk_)/i, '')
        .replace(/\.png$/i, '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
}

// Menentukan nama file .png berdasarkan gender pemain ('L', 'P', atau 'A')
function resolveCostumeFileName(rawItemName, genderCode) {
    const clean = rawItemName.trim().toLowerCase().replace(/\s+/g, '_');
    if (clean.startsWith('pr_') || clean.startsWith('lk_')) {
        return clean.endsWith('.png') ? clean : `${clean}.png`;
    }
    const prefix = (genderCode === 'P') ? 'pr_' : 'lk_';
    return `${prefix}${clean}.png`;
}

// Membuat elemen canvas mini untuk memotong 1 frame pertama (menghadap depan)
function createSingleSpritePreviewHTML(costumeFile, boxClass = "w-11 h-11") {
    const safeFile = costumeFile.replace(/'/g, "\\'");
    return `
        <div class="${boxClass} bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center border border-slate-700 shrink-0 relative">
            <canvas data-costume-preview="${safeFile}" width="48" height="48" class="w-full h-full object-contain"></canvas>
        </div>
    `;
}

// Merender potongan 1 frame sprite ke seluruh canvas preview yang ada di layar
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
            const cols = (img.width % 4 === 0 && img.width >= img.height) ? 4 : 3;
            const rows = 4;
            const frameW = Math.floor(img.width / cols);
            const frameH = Math.floor(img.height / rows);
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(img, 0, 0, frameW, frameH, 4, 2, cvs.width - 8, cvs.height - 4);
        };
    });
}

// Mengambil katalog kostum terbaru dari tab 'Toko' di Google Sheets
async function ensureShopCatalogLoaded(forceRefresh = false) {
    if (!forceRefresh && Array.isArray(currentShopItems) && currentShopItems.length > 0) {
        return currentShopItems;
    }
    try {
        if (typeof getSheetCsvUrl === 'function') {
            const res = await fetch(getSheetCsvUrl('Toko'));
            if (res.ok) {
                const csvText = await res.text();
                const lines = csvText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                const parsed = [];
                for (let i = 1; i < lines.length; i++) {
                    const cols = lines[i].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
                    if (cols[0]) {
                        const itemCost = parseInt((cols[1] || "0").replace(/[^0-9]/g, ''), 10);
                        const cleanDisplay = formatCostumeDisplayName(cols[0]);
                        parsed.push({
                            rawName: cols[0],
                            name: cleanDisplay,
                            displayName: cleanDisplay,
                            cost: isNaN(itemCost) ? 0 : itemCost
                        });
                    }
                }
                if (parsed.length > 0) {
                    currentShopItems = parsed;
                }
            }
        }
    } catch (e) {}
    return currentShopItems;
}

// Simpan kostum yang sedang dipakai ke Kolom I Sheet Login melalui Apps Script
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

// ==========================================
// TAMPILAN TOKO / WARUNG (BELI KOSTUM)
// ==========================================
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
        const ownedKeys = new Set((ownedCostumes || []).map(c => normalizeCostumeKey(c)));
        html += `<div class="flex flex-col gap-2 w-full text-left">`;
        expandedShopItems.forEach((entry) => {
            const isOwned = hasFullCostumes || ownedKeys.has(normalizeCostumeKey(entry.costumeFile));
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
    if (typeof resetDialogAutoCloseTimer === 'function') resetDialogAutoCloseTimer();
}

window.promptRedeemShopItem = function(itemIndex, specificCostumeFile, specificLabelName) {
    if (typeof resetDialogAutoCloseTimer === 'function') resetDialogAutoCloseTimer();
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
    if (typeof resetDialogAutoCloseTimer === 'function') resetDialogAutoCloseTimer();
};

window.executeRedeemItem = function() {
    if (!pendingRedeemItem) return;
    const item = pendingRedeemItem;
    closeBuyConfirmModal();
    if (playerPoints < item.cost) return;

    const costumeFile = item.targetFile;

    playerPoints -= item.cost;
    const ownedKeys = new Set((ownedCostumes || []).map(c => normalizeCostumeKey(c)));
    if (!hasFullCostumes && !ownedKeys.has(normalizeCostumeKey(costumeFile))) {
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
// LEMARI KOSTUM DI PROFIL (PAKAI / LEPAS)
// ==========================================
async function renderProfileCostumeWardrobe() {
    const wardrobeEl = document.getElementById('profileCostumeWardrobe');
    if (!wardrobeEl) return;

    wardrobeEl.innerHTML = `<div class="col-span-2 text-center text-[11px] text-slate-400 py-3">Memuat lemari kostum...</div>`;

    const genderCode = (currentUserAccount && currentUserAccount.gender) ? currentUserAccount.gender.toUpperCase() : 'L';
    const isAdminOrFull = (genderCode === 'A') || hasFullCostumes;

    // Pastikan katalog terbaru dari tab 'Toko' sudah dimuat
    await ensureShopCatalogLoaded(false);

    // Kumpulkan seluruh file kostum yang valid
    const catalogFilesMap = new Map();

    if (Array.isArray(currentShopItems) && currentShopItems.length > 0) {
        currentShopItems.forEach(item => {
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

    // Tambahkan juga seluruh kostum yang sudah ada di daftar ownedCostumes pemain
    (ownedCostumes || []).forEach(raw => {
        const cleanFile = raw.toLowerCase().endsWith('.png') ? raw.trim() : `${raw.trim()}.png`;
        const key = normalizeCostumeKey(cleanFile);
        if (key && !catalogFilesMap.has(key)) {
            catalogFilesMap.set(key, cleanFile);
        }
    });

    // Filter kostum yang boleh ditampilkan di lemari pemain
    const ownedKeys = new Set((ownedCostumes || []).map(c => normalizeCostumeKey(c)));
    const availableList = [];

    catalogFilesMap.forEach((fileName, key) => {
        if (isAdminOrFull || ownedKeys.has(key)) {
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
