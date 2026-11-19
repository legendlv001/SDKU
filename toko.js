// ==========================================
// SISTEM TOKO / WARUNG SEKOLAH (KATEGORI KOLOM D: P, T, K)
// ==========================================

let currentShopItems = [];
let pendingRedeemItem = null;

function parseNumericCell(rawVal) {
    const str = String(rawVal || "").trim();
    if (!str) return 0;
    const num = parseInt(str.replace(/[^0-9]/g, ''), 10);
    return isNaN(num) ? 0 : num;
}

// Mengambil katalog dari tab 'Toko' di Google Sheets
// Kolom A: Nama Barang | Kolom B: Poin | Kolom C: Tiket | Kolom D: Kategori (P / T / K)
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
                        const rawTitle = cols[0].trim();
                        const poinVal = parseNumericCell(cols[1]); // Kolom B
                        const tiketVal = parseNumericCell(cols[2]); // Kolom C
                        const rawCat = String(cols[3] || "K").trim().toUpperCase(); // Kolom D: P, T, atau K

                        let category = 'K';
                        if (rawCat === 'P') category = 'P';
                        else if (rawCat === 'T') category = 'T';

                        const isCurrencyExchange = (category === 'P' || category === 'T');
                        const cleanDisplay = isCurrencyExchange ? rawTitle : formatCostumeDisplayName(rawTitle);

                        parsed.push({
                            rawName: rawTitle,
                            name: cleanDisplay,
                            displayName: cleanDisplay,
                            poinVal: poinVal,
                            tiketVal: tiketVal,
                            category: category, // 'P' = Poin, 'T' = Tiket, 'K' = Kostum
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
// TAMPILAN TOKO / WARUNG
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
        if (item.category === 'P' || item.category === 'T') {
            expandedShopItems.push({
                ...item,
                actualIndex: idx,
                costumeFile: "",
                labelName: item.displayName
            });
            return;
        }

        // Kategori 'K' (Kostum)
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
        html += `<div class="text-center text-xs text-slate-400 p-4 bg-slate-800/60 rounded-xl">Belum ada barang yang tersedia di Warung saat ini.</div>`;
    } else {
        const ownedKeys = new Set((ownedCostumes || []).map(c => normalizeCostumeKey(c)));
        html += `<div class="flex flex-col gap-2 w-full text-left">`;

        expandedShopItems.forEach((entry) => {
            const safeLabel = entry.labelName.replace(/'/g, "\\'");

            // KATEGORI 'P': BELI POIN (Bayar Kolom C Tiket -> Dapat +Kolom B Poin)
            if (entry.category === 'P') {
                const canExchange = entry.tiketVal > 0 && entry.poinVal > 0 && playerTickets >= entry.tiketVal;
                const btnLabel = canExchange ? `Tukar ${entry.tiketVal} 🎟️` : 'Tiket Kurang';
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
                                    <span class="text-sky-300 font-bold">${entry.tiketVal} Tiket</span>
                                    <span class="text-slate-400">➔</span>
                                    <span class="text-amber-400 font-extrabold">+${entry.poinVal} Poin</span>
                                </div>
                            </div>
                        </div>
                        <button type="button" onclick="promptRedeemShopItem(${entry.actualIndex}, '', '${safeLabel}', 'get_points')" ${canExchange ? '' : 'disabled'}
                            class="px-3 py-1.5 rounded-xl font-extrabold text-[11px] transition shrink-0 shadow ${btnClass}">
                            ${btnLabel}
                        </button>
                    </div>
                `;
                return;
            }

            // KATEGORI 'T': BELI TIKET (Bayar Kolom B Poin -> Dapat +Kolom C Tiket)
            if (entry.category === 'T') {
                const canExchange = entry.poinVal > 0 && entry.tiketVal > 0 && playerPoints >= entry.poinVal;
                const btnLabel = canExchange ? `Tukar ${entry.poinVal} Poin` : 'Poin Kurang';
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
                                    <span class="text-amber-300 font-bold">${entry.poinVal} Poin</span>
                                    <span class="text-slate-400">➔</span>
                                    <span class="text-sky-400 font-extrabold">+${entry.tiketVal} Tiket</span>
                                </div>
                            </div>
                        </div>
                        <button type="button" onclick="promptRedeemShopItem(${entry.actualIndex}, '', '${safeLabel}', 'get_tickets')" ${canExchange ? '' : 'disabled'}
                            class="px-3 py-1.5 rounded-xl font-extrabold text-[11px] transition shrink-0 shadow ${btnClass}">
                            ${btnLabel}
                        </button>
                    </div>
                `;
                return;
            }

            // KATEGORI 'K': BELI KOSTUM (Bisa pakai Kolom B Poin dan/atau Kolom C Tiket)
            const isOwned = hasFullCostumes || ownedKeys.has(normalizeCostumeKey(entry.costumeFile));
            let actionButtonsHTML = '';

            if (isOwned) {
                actionButtonsHTML = `<span class="px-3 py-1.5 rounded-xl font-extrabold text-[11px] bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 shrink-0">Sudah Dimiliki</span>`;
            } else {
                const btns = [];
                if (entry.poinVal > 0) {
                    const canAffordPoin = playerPoints >= entry.poinVal;
                    const cls = canAffordPoin
                        ? "bg-amber-400 hover:bg-amber-500 text-slate-950 cursor-pointer active:scale-95"
                        : "bg-slate-700 text-slate-400 cursor-not-allowed opacity-60";
                    btns.push(`
                        <button type="button" onclick="promptRedeemShopItem(${entry.actualIndex}, '${entry.costumeFile}', '${safeLabel}', 'buy_with_points')" ${canAffordPoin ? '' : 'disabled'}
                            class="px-2.5 py-1 rounded-lg font-extrabold text-[10px] transition shadow flex items-center gap-1 ${cls}">
                            <img src="assets/poin.png" class="w-3 h-3 object-contain" /> ${entry.poinVal}
                        </button>
                    `);
                }
                if (entry.tiketVal > 0) {
                    const canAffordTiket = playerTickets >= entry.tiketVal;
                    const cls = canAffordTiket
                        ? "bg-sky-400 hover:bg-sky-500 text-slate-950 cursor-pointer active:scale-95"
                        : "bg-slate-700 text-slate-400 cursor-not-allowed opacity-60";
                    btns.push(`
                        <button type="button" onclick="promptRedeemShopItem(${entry.actualIndex}, '${entry.costumeFile}', '${safeLabel}', 'buy_with_tickets')" ${canAffordTiket ? '' : 'disabled'}
                            class="px-2.5 py-1 rounded-lg font-extrabold text-[10px] transition shadow flex items-center gap-1 ${cls}">
                            🎟️ ${entry.tiketVal}
                        </button>
                    `);
                }
                actionButtonsHTML = `<div class="flex flex-col gap-1.5 shrink-0">${btns.join('')}</div>`;
            }

            let priceSubtitle = [];
            if (entry.poinVal > 0) priceSubtitle.push(`<span class="text-amber-400 font-bold">${entry.poinVal} Poin</span>`);
            if (entry.tiketVal > 0) priceSubtitle.push(`<span class="text-sky-400 font-bold">${entry.tiketVal} Tiket</span>`);

            html += `
                <div class="flex items-center justify-between p-3 bg-slate-800 border border-slate-700 rounded-xl">
                    <div class="flex items-center gap-2.5 pr-2">
                        ${createSingleSpritePreviewHTML(entry.costumeFile, "w-11 h-11")}
                        <div>
                            <div class="text-xs md:text-sm font-bold text-white">${entry.labelName}</div>
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

window.promptRedeemShopItem = function(itemIndex, specificCostumeFile, specificLabelName, mode) {
    if (typeof resetDialogAutoCloseTimer === 'function') resetDialogAutoCloseTimer();
    const item = currentShopItems[itemIndex];
    if (!item) return;

    const targetLabel = specificLabelName || item.displayName;
    let confirmMsg = '';

    if (mode === 'get_points') {
        if (playerTickets < item.tiketVal) return;
        confirmMsg = `Tukarkan <strong class="text-sky-400">${item.tiketVal} Tiket</strong> menjadi <strong class="text-amber-400">+${item.poinVal} Poin</strong>?`;
    } else if (mode === 'get_tickets') {
        if (playerPoints < item.poinVal) return;
        confirmMsg = `Tukarkan <strong class="text-amber-400">${item.poinVal} Poin</strong> menjadi <strong class="text-sky-400">+${item.tiketVal} Tiket</strong>?`;
    } else if (mode === 'buy_with_tickets') {
        if (playerTickets < item.tiketVal) return;
        confirmMsg = `Beli kostum <strong class="text-white">${targetLabel}</strong> seharga <strong class="text-sky-400">${item.tiketVal} Tiket</strong>?`;
    } else {
        if (playerPoints < item.poinVal) return;
        confirmMsg = `Beli kostum <strong class="text-white">${targetLabel}</strong> seharga <strong class="text-amber-400">${item.poinVal} Poin</strong>?`;
    }

    const genderCode = (currentUserAccount && currentUserAccount.gender) ? currentUserAccount.gender.toUpperCase() : 'L';
    const targetFile = (item.category === 'K')
        ? (specificCostumeFile || resolveCostumeFileName(item.rawName, genderCode))
        : "";

    pendingRedeemItem = { ...item, targetFile, targetLabel, mode };
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

    let feedbackMsg = '';
    let chatAnnouncement = '';

    if (item.mode === 'get_points') {
        if (playerTickets < item.tiketVal) return;
        playerTickets -= item.tiketVal;
        playerPoints += item.poinVal;
        feedbackMsg = `✅ Berhasil menukar <strong>${item.tiketVal} Tiket</strong> menjadi <strong>+${item.poinVal} Poin</strong>!`;
        chatAnnouncement = `🔄 ${playerCustomName} menukar ${item.tiketVal} Tiket menjadi +${item.poinVal} Poin di Warung!`;
    } else if (item.mode === 'get_tickets') {
        if (playerPoints < item.poinVal) return;
        playerPoints -= item.poinVal;
        playerTickets += item.tiketVal;
        feedbackMsg = `✅ Berhasil menukar <strong>${item.poinVal} Poin</strong> menjadi <strong>+${item.tiketVal} Tiket</strong>!`;
        chatAnnouncement = `🔄 ${playerCustomName} menukar ${item.poinVal} Poin menjadi +${item.tiketVal} Tiket di Warung!`;
    } else if (item.mode === 'buy_with_tickets') {
        if (playerTickets < item.tiketVal) return;
        playerTickets -= item.tiketVal;
        const ownedKeys = new Set((ownedCostumes || []).map(c => normalizeCostumeKey(c)));
        if (!hasFullCostumes && item.targetFile && !ownedKeys.has(normalizeCostumeKey(item.targetFile))) {
            ownedCostumes.push(item.targetFile);
        }
        feedbackMsg = `✅ Berhasil membeli <strong>${item.targetLabel}</strong> dengan <strong>${item.tiketVal} Tiket</strong>!`;
        chatAnnouncement = `🛍️ ${playerCustomName} membeli kostum "${item.targetLabel}" memakai Tiket!`;
    } else {
        if (playerPoints < item.poinVal) return;
        playerPoints -= item.poinVal;
        const ownedKeys = new Set((ownedCostumes || []).map(c => normalizeCostumeKey(c)));
        if (!hasFullCostumes && item.targetFile && !ownedKeys.has(normalizeCostumeKey(item.targetFile))) {
            ownedCostumes.push(item.targetFile);
        }
        feedbackMsg = `✅ Berhasil membeli <strong>${item.targetLabel}</strong> dengan <strong>${item.poinVal} Poin</strong>!`;
        chatAnnouncement = `🛍️ ${playerCustomName} membeli kostum "${item.targetLabel}" di Warung!`;
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
                costumeFile: item.targetFile || "",
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
