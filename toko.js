// ==========================================
// SISTEM TOKO / WARUNG SEKOLAH (KOLOM D: p = POIN, t = TIKET, k = KOSTUM, h = PET)
// ==========================================

let currentShopItems = [];
let pendingRedeemItem = null;

// Parsing nilai kolom B (Poin) atau kolom C (Tiket)
function parseShopCellValue(rawVal) {
    const str = String(rawVal || "").trim();
    if (!str) return { isReward: false, amount: 0, valid: false };
    const isReward = str.startsWith('+');
    const num = parseInt(str.replace(/[^0-9]/g, ''), 10);
    if (isNaN(num) || num <= 0) return { isReward: false, amount: 0, valid: false };
    return { isReward, amount: num, valid: true };
}

// Normalisasi nama file pet (contoh: "kucing" -> "kucing.png")
function resolvePetFileName(rawItemName) {
    const clean = String(rawItemName || "").trim();
    if (!clean) return "";
    return clean.toLowerCase().endsWith('.png') ? clean : `${clean}.png`;
}

// Mengambil katalog barang/kostum/pet/penukaran dari tab 'Toko' di Google Sheets
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
                        const colB = parseShopCellValue(cols[1]); // Kolom B: Poin
                        const colC = parseShopCellValue(cols[2]); // Kolom C: Tiket
                        const rawType = (cols[3] || "").trim().toLowerCase(); // Kolom D: p / t / k / h

                        // Tentukan kategori item dari Kolom D (default 'k' jika kosong)
                        let itemType = 'k';
                        if (rawType === 'p' || rawType === 'poin') itemType = 'p';
                        else if (rawType === 't' || rawType === 'tiket') itemType = 't';
                        else if (rawType === 'h' || rawType === 'pet' || rawType === 'hewan') itemType = 'h';
                        else if (rawType === 'k' || rawType === 'kostum' || rawType === 'kostom') itemType = 'k';
                        else if (colB.isReward) itemType = 'p';
                        else if (colC.isReward) itemType = 't';

                        const isCurrencyExchange = (itemType === 'p' || itemType === 't');
                        const cleanDisplay = isCurrencyExchange ? cols[0].trim() : formatCostumeDisplayName(cols[0]);

                        parsed.push({
                            rawName: cols[0].trim(),
                            name: cleanDisplay,
                            displayName: cleanDisplay,
                            pointRule: colB,
                            ticketRule: colC,
                            itemType: itemType, // 'p', 't', 'k', atau 'h'
                            isCurrencyExchange: isCurrencyExchange
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

// ==========================================
// TAMPILAN TOKO / WARUNG (BELI KOSTUM, PET & TUKAR POIN/TIKET)
// ==========================================
function renderShopItemsList() {
    const modalContent = document.getElementById('modalContent');
    if (!modalContent) return;

    const genderCode = (currentUserAccount && currentUserAccount.gender) ? currentUserAccount.gender.toUpperCase() : 'L';
    const isAdminGender = (genderCode === 'A');

    let html = `
        <div class="grid grid-cols-2 gap-2 mb-3">
            <div class="flex items-center justify-between bg-amber-950/80 border border-amber-500/40 px-3 py-2 rounded-xl">
                <span class="text-[11px] font-bold text-amber-200">Poin:</span>
                <div class="flex items-center gap-1">
                    <img src="assets/poin.png" alt="Poin" class="w-4 h-4 object-contain coin-spin" />
                    <span id="shopPoinBalance" class="text-sm font-extrabold text-amber-400">${playerPoints}</span>
                </div>
            </div>
            <div class="flex items-center justify-between bg-sky-950/80 border border-sky-500/40 px-3 py-2 rounded-xl">
                <span class="text-[11px] font-bold text-sky-200">Tiket:</span>
                <div class="flex items-center gap-1">
                    <span class="text-sm">🎟️</span>
                    <span id="shopTiketBalance" class="text-sm font-extrabold text-sky-400">${playerTickets}</span>
                </div>
            </div>
        </div>
        <div id="shopFeedbackBanner" class="hidden mb-2.5 px-3 py-2 rounded-xl text-xs font-bold text-center"></div>
    `;

    let expandedShopItems = [];
    currentShopItems.forEach((item, idx) => {
        if (item.itemType === 'p' || item.itemType === 't') {
            expandedShopItems.push({
                ...item,
                actualIndex: idx,
                costumeFile: "",
                petFile: "",
                labelName: item.displayName
            });
            return;
        }

        // itemType === 'h' (Pet)
        if (item.itemType === 'h') {
            const pFile = resolvePetFileName(item.rawName);
            expandedShopItems.push({
                ...item,
                actualIndex: idx,
                costumeFile: "",
                petFile: pFile,
                labelName: item.displayName
            });
            return;
        }

        // itemType === 'k' (Kostum)
        const lowerName = item.rawName.toLowerCase();
        const hasExplicitPrefix = lowerName.startsWith('pr_') || lowerName.startsWith('lk_');

        if (isAdminGender) {
            if (hasExplicitPrefix) {
                const file = lowerName.endsWith('.png') ? lowerName : `${lowerName}.png`;
                const tag = lowerName.startsWith('pr_') ? ' (PR)' : ' (LK)';
                expandedShopItems.push({ ...item, actualIndex: idx, costumeFile: file, petFile: "", labelName: item.displayName + tag });
            } else {
                const baseClean = lowerName.replace(/\.png$/i, '').replace(/\s+/g, '_');
                expandedShopItems.push({ ...item, actualIndex: idx, costumeFile: `lk_${baseClean}.png`, petFile: "", labelName: `${item.displayName} (LK)` });
                expandedShopItems.push({ ...item, actualIndex: idx, costumeFile: `pr_${baseClean}.png`, petFile: "", labelName: `${item.displayName} (PR)` });
            }
        } else {
            if (lowerName.startsWith('pr_') && genderCode !== 'P') return;
            if (lowerName.startsWith('lk_') && genderCode !== 'L') return;
            const file = resolveCostumeFileName(item.rawName, genderCode);
            expandedShopItems.push({ ...item, actualIndex: idx, costumeFile: file, petFile: "", labelName: item.displayName });
        }
    });

    if (expandedShopItems.length === 0) {
        html += `<div class="text-center text-xs text-slate-400 p-4 bg-slate-800/60 rounded-xl">Belum ada barang yang tersedia di Warung saat ini.</div>`;
    } else {
        const ownedKeys = new Set((ownedCostumes || []).map(c => normalizeCostumeKey(c)));
        html += `<div class="flex flex-col gap-2 w-full text-left">`;

        expandedShopItems.forEach((entry) => {
            const pRule = entry.pointRule || { isReward: false, amount: 0, valid: false };
            const tRule = entry.ticketRule || { isReward: false, amount: 0, valid: false };
            const safeLabel = entry.labelName.replace(/'/g, "\\'");

            // KASUS 1: KOLOM D = 'p' (ITEM POIN — DIBELI MENGGUNAKAN TIKET DI KOLOM C)
            if (entry.itemType === 'p') {
                const rewardPoin = pRule.valid ? pRule.amount : (parseInt(entry.rawName.replace(/[^0-9]/g, ''), 10) || 0);
                const costTiket = tRule.valid ? tRule.amount : 0;
                const canExchange = (rewardPoin > 0 && costTiket > 0 && playerTickets >= costTiket);
                const btnLabel = canExchange ? `Tukar ${costTiket} 🎟️` : 'Tiket Kurang';
                const btnClass = canExchange
                    ? "bg-amber-400 hover:bg-amber-500 text-slate-950 cursor-pointer active:scale-95"
                    : "bg-slate-700 text-slate-400 cursor-not-allowed opacity-60";

                html += `
                    <div class="flex items-center justify-between p-3 bg-slate-800/95 border border-amber-500/40 rounded-xl">
                        <div class="flex items-center gap-2.5 pr-2">
                            <div class="w-11 h-11 rounded-lg bg-amber-950 border border-amber-400/40 flex items-center justify-center p-2 shrink-0">
                                <img src="assets/poin.png" alt="Poin" class="w-full h-full object-contain coin-spin" />
                            </div>
                            <div>
                                <div class="text-xs md:text-sm font-bold text-white">${entry.labelName}</div>
                                <div class="text-[11px] mt-0.5">
                                    <span class="text-sky-300 font-bold">${costTiket} Tiket</span>
                                    <span class="text-slate-400">➔</span>
                                    <span class="text-amber-400 font-extrabold">+${rewardPoin} Poin</span>
                                </div>
                            </div>
                        </div>
                        <button type="button" onclick="promptRedeemShopItem(${entry.actualIndex}, '', '${safeLabel}', 'exchange_p')" ${canExchange ? '' : 'disabled'}
                            class="px-3 py-1.5 rounded-xl font-extrabold text-[11px] transition shrink-0 shadow ${btnClass}">
                            ${btnLabel}
                        </button>
                    </div>
                `;
                return;
            }

            // KASUS 2: KOLOM D = 't' (ITEM TIKET — DIBELI MENGGUNAKAN POIN DI KOLOM B)
            if (entry.itemType === 't') {
                const rewardTiket = tRule.valid ? tRule.amount : (parseInt(entry.rawName.replace(/[^0-9]/g, ''), 10) || 0);
                const costPoin = pRule.valid ? pRule.amount : 0;
                const canExchange = (rewardTiket > 0 && costPoin > 0 && playerPoints >= costPoin);
                const btnLabel = canExchange ? `Tukar ${costPoin} Poin` : 'Poin Kurang';
                const btnClass = canExchange
                    ? "bg-sky-400 hover:bg-sky-500 text-slate-950 cursor-pointer active:scale-95"
                    : "bg-slate-700 text-slate-400 cursor-not-allowed opacity-60";

                html += `
                    <div class="flex items-center justify-between p-3 bg-slate-800/95 border border-sky-500/40 rounded-xl">
                        <div class="flex items-center gap-2.5 pr-2">
                            <div class="w-11 h-11 rounded-lg bg-sky-950 border border-sky-400/40 flex items-center justify-center text-xl shrink-0">🎟️</div>
                            <div>
                                <div class="text-xs md:text-sm font-bold text-white">${entry.labelName}</div>
                                <div class="text-[11px] mt-0.5">
                                    <span class="text-amber-300 font-bold">${costPoin} Poin</span>
                                    <span class="text-slate-400">➔</span>
                                    <span class="text-sky-400 font-extrabold">+${rewardTiket} Tiket</span>
                                </div>
                            </div>
                        </div>
                        <button type="button" onclick="promptRedeemShopItem(${entry.actualIndex}, '', '${safeLabel}', 'exchange_t')" ${canExchange ? '' : 'disabled'}
                            class="px-3 py-1.5 rounded-xl font-extrabold text-[11px] transition shrink-0 shadow ${btnClass}">
                            ${btnLabel}
                        </button>
                    </div>
                `;
                return;
            }

            // KASUS 3 & 4: KOLOM D = 'k' (KOSTUM) ATAU 'h' (PET)
            const isPetItem = (entry.itemType === 'h');
            const targetItemFile = isPetItem ? entry.petFile : entry.costumeFile;
            const isOwned = hasFullCostumes || ownedKeys.has(normalizeCostumeKey(targetItemFile));
            let actionButtonsHTML = '';

            if (isOwned) {
                actionButtonsHTML = `<span class="px-3 py-1.5 rounded-xl font-extrabold text-[11px] bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 shrink-0">Sudah Dimiliki</span>`;
            } else {
                const btns = [];
                if (pRule.valid && !pRule.isReward) {
                    const canAffordPoin = playerPoints >= pRule.amount;
                    const cls = canAffordPoin
                        ? "bg-amber-400 hover:bg-amber-500 text-slate-950 cursor-pointer active:scale-95"
                        : "bg-slate-700 text-slate-400 cursor-not-allowed opacity-60";
                    btns.push(`
                        <button type="button" onclick="promptRedeemShopItem(${entry.actualIndex}, '${targetItemFile.replace(/'/g, "\\'")}', '${safeLabel}', 'points')" ${canAffordPoin ? '' : 'disabled'}
                            class="px-2.5 py-1 rounded-lg font-extrabold text-[10px] transition shadow flex items-center gap-1 ${cls}">
                            <img src="assets/poin.png" class="w-3 h-3 object-contain" /> ${pRule.amount}
                        </button>
                    `);
                }
                if (tRule.valid && !tRule.isReward) {
                    const canAffordTiket = playerTickets >= tRule.amount;
                    const cls = canAffordTiket
                        ? "bg-sky-400 hover:bg-sky-500 text-slate-950 cursor-pointer active:scale-95"
                        : "bg-slate-700 text-slate-400 cursor-not-allowed opacity-60";
                    btns.push(`
                        <button type="button" onclick="promptRedeemShopItem(${entry.actualIndex}, '${targetItemFile.replace(/'/g, "\\'")}', '${safeLabel}', 'tickets')" ${canAffordTiket ? '' : 'disabled'}
                            class="px-2.5 py-1 rounded-lg font-extrabold text-[10px] transition shadow flex items-center gap-1 ${cls}">
                            🎟️ ${tRule.amount}
                        </button>
                    `);
                }
                actionButtonsHTML = `<div class="flex flex-col gap-1.5 shrink-0">${btns.join('')}</div>`;
            }

            let priceSubtitle = [];
            if (pRule.valid && !pRule.isReward) priceSubtitle.push(`<span class="text-amber-400 font-bold">${pRule.amount} Poin</span>`);
            if (tRule.valid && !tRule.isReward) priceSubtitle.push(`<span class="text-sky-400 font-bold">${tRule.amount} Tiket</span>`);

            const previewBoxHTML = isPetItem
                ? `<div class="w-11 h-11 bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center border border-orange-500/40 shrink-0 p-1">
                       <img src="assets/pet/${entry.petFile}" onerror="this.src='assets/poin.png'" alt="${entry.labelName}" class="w-full h-full object-contain" />
                   </div>`
                : createSingleSpritePreviewHTML(entry.costumeFile, "w-11 h-11");

            const categoryTag = isPetItem
                ? `<span class="text-[9px] font-bold text-orange-300 bg-orange-950/80 border border-orange-500/40 px-1.5 py-0.5 rounded mr-1">🐾 Pet</span>`
                : '';

            html += `
                <div class="flex items-center justify-between p-3 bg-slate-800 border ${isPetItem ? 'border-orange-500/35' : 'border-slate-700'} rounded-xl">
                    <div class="flex items-center gap-2.5 pr-2">
                        ${previewBoxHTML}
                        <div>
                            <div class="text-xs md:text-sm font-bold text-white flex items-center flex-wrap gap-1">${categoryTag}<span>${entry.labelName}</span></div>
                            <div class="text-[11px] text-slate-300 mt-0.5">${priceSubtitle.join(' <span class="text-slate-500">/</span> ')}</div>
                        </div>
                    </div>
                    ${actionButtonsHTML}
                </div>
            `;
        });

        html += `</div>`;
    }

    modalContent.innerHTML = html;
    renderAllCostumePreviewCanvases();
    if (typeof resetDialogAutoCloseTimer === 'function') resetDialogAutoCloseTimer();
}

window.promptRedeemShopItem = function(itemIndex, specificItemFile, specificLabelName, payMethod = 'points') {
    if (typeof resetDialogAutoCloseTimer === 'function') resetDialogAutoCloseTimer();
    const item = currentShopItems[itemIndex];
    if (!item) return;

    const pRule = item.pointRule || { isReward: false, amount: 0, valid: false };
    const tRule = item.ticketRule || { isReward: false, amount: 0, valid: false };
    const targetLabel = specificLabelName || item.displayName;
    const isPetItem = (item.itemType === 'h');
    const itemNoun = isPetItem ? 'pet' : 'kostum';
    let confirmMsg = '';

    if (payMethod === 'exchange_p' || item.itemType === 'p') {
        const rewardPoin = pRule.valid ? pRule.amount : (parseInt(item.rawName.replace(/[^0-9]/g, ''), 10) || 0);
        const costTiket = tRule.valid ? tRule.amount : 0;
        if (costTiket <= 0 || rewardPoin <= 0 || playerTickets < costTiket) return;
        confirmMsg = `Tukarkan <strong class="text-sky-400">${costTiket} Tiket</strong> menjadi <strong class="text-amber-400">+${rewardPoin} Poin</strong>?`;
    } else if (payMethod === 'exchange_t' || item.itemType === 't') {
        const rewardTiket = tRule.valid ? tRule.amount : (parseInt(item.rawName.replace(/[^0-9]/g, ''), 10) || 0);
        const costPoin = pRule.valid ? pRule.amount : 0;
        if (costPoin <= 0 || rewardTiket <= 0 || playerPoints < costPoin) return;
        confirmMsg = `Tukarkan <strong class="text-amber-400">${costPoin} Poin</strong> menjadi <strong class="text-sky-400">+${rewardTiket} Tiket</strong>?`;
    } else if (payMethod === 'tickets') {
        if (!tRule.valid || playerTickets < tRule.amount) return;
        confirmMsg = `Beli ${itemNoun} <strong class="text-white">${targetLabel}</strong> seharga <strong class="text-sky-400">${tRule.amount} Tiket</strong>?`;
    } else {
        if (!pRule.valid || playerPoints < pRule.amount) return;
        confirmMsg = `Beli ${itemNoun} <strong class="text-white">${targetLabel}</strong> seharga <strong class="text-amber-400">${pRule.amount} Poin</strong>?`;
    }

    const genderCode = (currentUserAccount && currentUserAccount.gender) ? currentUserAccount.gender.toUpperCase() : 'L';
    let targetFile = "";
    if (item.itemType === 'h') {
        targetFile = specificItemFile || resolvePetFileName(item.rawName);
    } else if (item.itemType === 'k') {
        targetFile = specificItemFile || resolveCostumeFileName(item.rawName, genderCode);
    }

    pendingRedeemItem = { ...item, targetFile, targetLabel, payMethod };
    const textElem = document.getElementById('buyConfirmText');
    if (textElem) textElem.innerHTML = confirmMsg;
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

    const pRule = item.pointRule || { isReward: false, amount: 0, valid: false };
    const tRule = item.ticketRule || { isReward: false, amount: 0, valid: false };
    const isPetItem = (item.itemType === 'h');
    let feedbackMsg = '';
    let chatAnnouncement = '';

    if (item.payMethod === 'exchange_p' || item.itemType === 'p') {
        const rewardPoin = pRule.valid ? pRule.amount : (parseInt(item.rawName.replace(/[^0-9]/g, ''), 10) || 0);
        const costTiket = tRule.valid ? tRule.amount : 0;
        if (costTiket <= 0 || rewardPoin <= 0 || playerTickets < costTiket) return;
        playerTickets -= costTiket;
        playerPoints += rewardPoin;
        feedbackMsg = `✅ Berhasil menukar <strong>${costTiket} Tiket</strong> menjadi <strong>+${rewardPoin} Poin</strong>!`;
        chatAnnouncement = `🔄 ${playerCustomName} menukar ${costTiket} Tiket menjadi +${rewardPoin} Poin di Warung!`;
    } else if (item.payMethod === 'exchange_t' || item.itemType === 't') {
        const rewardTiket = tRule.valid ? tRule.amount : (parseInt(item.rawName.replace(/[^0-9]/g, ''), 10) || 0);
        const costPoin = pRule.valid ? pRule.amount : 0;
        if (costPoin <= 0 || rewardTiket <= 0 || playerPoints < costPoin) return;
        playerPoints -= costPoin;
        playerTickets += rewardTiket;
        feedbackMsg = `✅ Berhasil menukar <strong>${costPoin} Poin</strong> menjadi <strong>+${rewardTiket} Tiket</strong>!`;
        chatAnnouncement = `🔄 ${playerCustomName} menukar ${costPoin} Poin menjadi +${rewardTiket} Tiket di Warung!`;
    } else if (item.payMethod === 'tickets') {
        if (!tRule.valid || playerTickets < tRule.amount) return;
        playerTickets -= tRule.amount;
        const ownedKeys = new Set((ownedCostumes || []).map(c => normalizeCostumeKey(c)));
        if (!hasFullCostumes && item.targetFile && !ownedKeys.has(normalizeCostumeKey(item.targetFile))) {
            ownedCostumes.push(item.targetFile);
        }
        if (isPetItem && typeof addOwnedPetToPlayer === 'function') {
            addOwnedPetToPlayer(item.targetFile);
        }
        const noun = isPetItem ? 'pet' : 'kostum';
        feedbackMsg = `✅ Berhasil membeli ${noun} <strong>${item.targetLabel}</strong> dengan <strong>${tRule.amount} Tiket</strong>!`;
        chatAnnouncement = `🛍️ ${playerCustomName} membeli ${noun} "${item.targetLabel}" memakai Tiket!`;
    } else {
        if (!pRule.valid || playerPoints < pRule.amount) return;
        playerPoints -= pRule.amount;
        const ownedKeys = new Set((ownedCostumes || []).map(c => normalizeCostumeKey(c)));
        if (!hasFullCostumes && item.targetFile && !ownedKeys.has(normalizeCostumeKey(item.targetFile))) {
            ownedCostumes.push(item.targetFile);
        }
        if (isPetItem && typeof addOwnedPetToPlayer === 'function') {
            addOwnedPetToPlayer(item.targetFile);
        }
        const noun = isPetItem ? 'pet' : 'kostum';
        feedbackMsg = `✅ Berhasil membeli ${noun} <strong>${item.targetLabel}</strong> dengan <strong>${pRule.amount} Poin</strong>!`;
        chatAnnouncement = `🛍️ ${playerCustomName} membeli ${noun} "${item.targetLabel}" di Warung!`;
    }

    if (currentUserAccount) {
        currentUserAccount.points = playerPoints;
        currentUserAccount.tickets = playerTickets;
        currentUserAccount.ownedCostumes = ownedCostumes;
        sessionStorage.setItem('activeUserSession', JSON.stringify(currentUserAccount));
    }

    if (typeof updatePointsDisplay === 'function') updatePointsDisplay();
    renderShopItemsList();

    const banner = document.getElementById('shopFeedbackBanner');
    if (banner) {
        banner.className = "mb-2.5 px-3 py-2 rounded-xl text-xs font-bold text-center bg-emerald-950/90 border border-emerald-500 text-emerald-300";
        banner.innerHTML = feedbackMsg;
        banner.classList.remove('hidden');
    }

    if (typeof APPS_SCRIPT_URL !== 'undefined' && APPS_SCRIPT_URL && APPS_SCRIPT_URL.startsWith('http')) {
        fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
                action: 'updateCurrencyAndRedeem',
                player: playerCustomName,
                item: item.targetLabel,
                costumeFile: isPetItem ? "" : (item.targetFile || ""),
                petFile: isPetItem ? (item.targetFile || "") : "",
                remainingPoints: playerPoints,
                remainingTickets: playerTickets,
                timestamp: Date.now()
            })
        }).catch(() => {});
    }

    if (typeof window.sendFirebaseChat === 'function' && chatAnnouncement) {
        window.sendFirebaseChat("Warung", chatAnnouncement);
    }
};
