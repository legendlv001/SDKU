// ==========================================
// SISTEM WARUNG / TOKO (KODE KOLOM D: p=Poin, t=Tiket, k=Kostum, h=Pet)
// ==========================================
window.SHOP_CATALOG_ITEMS = [];
let pendingRedeemItem = null;

async function ensureShopCatalogLoaded(forceReload = false) {
    if (!forceReload && Array.isArray(window.SHOP_CATALOG_ITEMS) && window.SHOP_CATALOG_ITEMS.length > 0) {
        return window.SHOP_CATALOG_ITEMS;
    }

    try {
        const csvUrl = (typeof getSheetCsvUrl === 'function')
            ? getSheetCsvUrl('Toko')
            : `https://docs.google.com/spreadsheets/d/1J4ePsSEV8xE3VCR-10Avf3W8FOQ-R1xSqWO-4IMzyWc/gviz/tq?tqx=out:csv&sheet=Toko`;

        const res = await fetch(csvUrl);
        if (!res.ok) throw new Error("Gagal mengambil data Toko");
        const csvText = await res.text();
        const lines = csvText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        const items = [];
        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
            const name = cols[0] || "";
            if (!name || name.toLowerCase() === 'nama' || name.toLowerCase() === 'barang') continue;

            const price = parseInt((cols[1] || "0").replace(/[^0-9]/g, ''), 10) || 0;
            const currencyRaw = (cols[2] || "Poin").trim();
            const currencyType = currencyRaw.toLowerCase().includes('tiket') ? 'Tiket' : 'Poin';
            const typeCode = (cols[3] || "k").trim().toLowerCase(); // p = poin, t = tiket, k = kostum, h = pet
            const paramOrFile = (cols[4] || "").trim();

            items.push({
                index: items.length,
                name,
                price,
                currencyType,
                typeCode,
                fileName: paramOrFile,
                rewardValue: parseInt(paramOrFile.replace(/[^0-9]/g, ''), 10) || 1
            });
        }

        window.SHOP_CATALOG_ITEMS = items;
        return items;
    } catch (err) {
        console.warn("Gagal memuat katalog Toko:", err);
        return window.SHOP_CATALOG_ITEMS || [];
    }
}

function getShopItemPreviewHtml(item) {
    if (item.typeCode === 'p') {
        return `<img src="assets/poin.png" alt="Poin" class="w-10 h-10 object-contain coin-spin" />`;
    }
    if (item.typeCode === 't') {
        return `<div class="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/50 flex items-center justify-center text-2xl">🎟️</div>`;
    }
    if (item.typeCode === 'h') {
        const cleanFile = item.fileName.toLowerCase().endsWith('.png') ? item.fileName : `${item.fileName}.png`;
        return `<img src="assets/pet/${cleanFile}" onerror="this.src='assets/poin.png'" alt="${item.name}" class="w-11 h-11 object-contain" />`;
    }
    // Default 'k' = Kostum
    const cleanFile = item.fileName.toLowerCase().endsWith('.png') ? item.fileName : `${item.fileName}.png`;
    return `<img src="assets/kostum/${cleanFile}" onerror="this.src='assets/poin.png'" alt="${item.name}" class="w-11 h-11 object-contain" />`;
}

function getShopCategoryBadge(typeCode) {
    switch (typeCode) {
        case 'p': return `<span class="px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/40 text-[9px] font-bold">🪙 Poin</span>`;
        case 't': return `<span class="px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-500/40 text-[9px] font-bold">🎟️ Tiket</span>`;
        case 'h': return `<span class="px-1.5 py-0.5 rounded bg-orange-950 text-orange-300 border border-orange-500/40 text-[9px] font-bold">🐾 Pet</span>`;
        default:  return `<span class="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold">👕 Kostum</span>`;
    }
}

window.renderShopItemsList = function() {
    const modalContent = document.getElementById('modalContent');
    if (!modalContent) return;

    const items = window.SHOP_CATALOG_ITEMS || [];
    const curPoin = (typeof playerPoints !== 'undefined') ? playerPoints : 0;
    const curTiket = (typeof playerTickets !== 'undefined') ? playerTickets : 0;

    let headerBalanceHtml = `
        <div class="flex items-center justify-between gap-2 bg-slate-800/95 border border-amber-400/40 px-3 py-2 rounded-2xl mb-3 text-xs">
            <div class="flex items-center gap-1.5">
                <img src="assets/poin.png" alt="Poin" class="w-4 h-4 object-contain coin-spin" />
                <span class="text-slate-300">Poin:</span>
                <strong id="shopPoinBalance" class="text-amber-300 font-extrabold">${curPoin}</strong>
            </div>
            <div class="flex items-center gap-1.5">
                <span>🎟️</span>
                <span class="text-slate-300">Tiket:</span>
                <strong id="shopTiketBalance" class="text-sky-300 font-extrabold">${curTiket}</strong>
            </div>
        </div>
    `;

    if (items.length === 0) {
        modalContent.innerHTML = headerBalanceHtml + `<div class="text-center text-xs text-slate-400 p-4 bg-slate-800/60 rounded-xl">Belum ada barang dijual di Toko saat ini.</div>`;
        return;
    }

    let listHtml = `<div class="flex flex-col gap-2 w-full text-left">`;
    items.forEach((item, idx) => {
        let isOwned = false;
        if (item.typeCode === 'k' && typeof isCostumeOwnedByPlayer === 'function') {
            isOwned = isCostumeOwnedByPlayer(item.fileName);
        } else if (item.typeCode === 'h' && typeof isPetOwnedByPlayer === 'function') {
            isOwned = isPetOwnedByPlayer(item.fileName);
        }

        const priceIcon = item.currencyType === 'Tiket' ? '🎟️' : '🪙';
        const actionBtn = isOwned
            ? `<span class="px-3 py-1.5 bg-slate-700 text-emerald-300 font-extrabold text-[11px] rounded-xl border border-emerald-500/40 shrink-0">Dimiliki ✓</span>`
            : `<button type="button" onclick="openBuyConfirmModal(${idx})" class="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold text-[11px] rounded-xl shadow transition active:scale-95 shrink-0">
                   ${priceIcon} ${item.price} ${item.currencyType}
               </button>`;

        listHtml += `
            <div class="flex items-center justify-between gap-2.5 p-2.5 bg-slate-800/90 border border-slate-700 hover:border-amber-400/50 rounded-2xl transition">
                <div class="flex items-center gap-2.5 min-w-0">
                    <div class="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0 p-1">
                        ${getShopItemPreviewHtml(item)}
                    </div>
                    <div class="min-w-0">
                        <div class="mb-0.5">${getShopCategoryBadge(item.typeCode)}</div>
                        <div class="text-xs font-extrabold text-white truncate">${item.name}</div>
                        <div class="text-[10px] text-slate-400">Harga: ${item.price} ${item.currencyType}</div>
                    </div>
                </div>
                ${actionBtn}
            </div>
        `;
    });
    listHtml += `</div>`;

    modalContent.innerHTML = headerBalanceHtml + listHtml;
};

window.openBuyConfirmModal = function(itemIndex) {
    const item = window.SHOP_CATALOG_ITEMS && window.SHOP_CATALOG_ITEMS[itemIndex];
    if (!item) return;

    const curBalance = item.currencyType === 'Tiket' ? (playerTickets || 0) : (playerPoints || 0);
    if (curBalance < item.price) {
        alert(`${item.currencyType} kamu tidak cukup! Dibutuhkan ${item.price} ${item.currencyType}, saldo kamu ${curBalance} ${item.currencyType}.`);
        return;
    }

    pendingRedeemItem = item;
    const textEl = document.getElementById('buyConfirmText');
    if (textEl) {
        textEl.innerHTML = `Tukarkan <strong class="text-amber-300">${item.price} ${item.currencyType}</strong> untuk mendapatkan <strong class="text-white">${item.name}</strong>?`;
    }

    const modal = document.getElementById('buyConfirmModal');
    if (modal) modal.classList.remove('hidden');
    if (typeof resetDialogAutoCloseTimer === 'function') resetDialogAutoCloseTimer();
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

    // 1. Potong saldo Poin atau Tiket
    if (item.currencyType === 'Tiket') {
        if ((playerTickets || 0) < item.price) return;
        playerTickets -= item.price;
    } else {
        if ((playerPoints || 0) < item.price) return;
        playerPoints -= item.price;
    }

    // 2. Proses item berdasarkan Kolom D (p = poin, t = tiket, k = kostum, h = pet)
    if (item.typeCode === 'p') {
        playerPoints += item.rewardValue;
    } else if (item.typeCode === 't') {
        playerTickets += item.rewardValue;
    } else if (item.typeCode === 'h') {
        // Pet -> digabung ke Sheet Login Kolom H & dipakai di Kolom J
        if (typeof addOwnedPetToPlayer === 'function') {
            addOwnedPetToPlayer(item.fileName);
        }
    } else {
        // Kostum ('k') -> digabung ke Sheet Login Kolom H & dipakai di Kolom I
        if (typeof addOwnedCostumeToPlayer === 'function') {
            addOwnedCostumeToPlayer(item.fileName);
        }
    }

    // 3. Simpan perubahan saldo Poin & Tiket ke Google Spreadsheet
    if (typeof savePlayerPointsToFirebase === 'function') {
        savePlayerPointsToFirebase();
    }

    // 4. Perbarui tampilan Toko
    renderShopItemsList();

    if (typeof window.sendFirebaseChat === 'function') {
        window.sendFirebaseChat("Warung", `🛍️ ${playerCustomName} baru saja menukarkan ${item.price} ${item.currencyType} dengan "${item.name}"!`);
    }
};
