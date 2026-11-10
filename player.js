const player = { x: 1000, y: 600, speed: 3.5, width: 48, height: 68, direction: 'down', targetX: null, targetY: null, isMovingToTarget: false };
const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, w: false, s: false, a: false, d: false };

let isChatOpen = false, unreadCount = 0, chatTimer = null, isTypingOrHovered = false;

function drawCharacterSprite(c, x, y, width, height, gender, dir, walkStep) {
    c.save();
    let currentDir = (dir === 'idle') ? 'down' : dir;
    const spriteKey = `${gender}_sprite`, imgAsset = ASSETS[spriteKey], isLoaded = assetsLoaded[spriteKey];

    if (isLoaded && imgAsset && imgAsset.width > 0) {
        // Bayangan di kaki
        c.fillStyle = 'rgba(0,0,0,0.3)'; 
        c.beginPath(); 
        c.ellipse(x + width / 2, y + height - 4, width * 0.35, 6, 0, 0, Math.PI * 2); 
        c.fill();

        // Row Index Sprite Sheet:
        // Row 0 = Down (Bawah)
        // Row 1 = Left (Kiri)
        // Row 2 = Right (Kanan)
        // Row 3 = Up (Atas)
        let rowIndex = 0;
        if (currentDir === 'down') rowIndex = 0;
        else if (currentDir === 'left') rowIndex = 1;
        else if (currentDir === 'right') rowIndex = 2;
        else if (currentDir === 'up') rowIndex = 3;

        let colIndex = 0;
        if (dir !== 'idle') {
            const stepVal = typeof walkStep === 'number' ? walkStep : 0;
            colIndex = Math.floor((stepVal * 0.25) % 5);
        }
        const frameWidth = imgAsset.width / 5, frameHeight = imgAsset.height / 4;
        
        c.drawImage(imgAsset, colIndex * frameWidth, rowIndex * frameHeight, frameWidth, frameHeight, x, y, width, height);
        c.restore(); 
        return;
    }

    // Fallback jika belum ter-load
    c.fillStyle = 'rgba(0,0,0,0.3)'; 
    c.beginPath(); 
    c.ellipse(x + width / 2, y + height - 4, width * 0.35, 6, 0, 0, Math.PI * 2); 
    c.fill();

    const isFemale = (gender === 'female');
    if (isFemale) {
        c.fillStyle = '#b91c1c'; c.fillRect(x + width * 0.25, y + height * 0.45, width * 0.5, height * 0.43);
        c.fillStyle = '#ffffff'; c.beginPath(); c.arc(x + width * 0.5, y + height * 0.25, width * 0.3, 0, Math.PI * 2); c.fill();
    } else {
        c.fillStyle = '#ffffff'; c.fillRect(x + width * 0.25, y + height * 0.3, width * 0.5, height * 0.25);
        c.fillStyle = '#1e293b'; c.fillRect(x + width * 0.25, y, width * 0.5, 14);
    }
    c.restore();
}

function updateGame() {
    let dx = 0, dy = 0, nextX = player.x, nextY = player.y;
    let currentWalkTimer = (typeof walkTimer !== 'undefined') ? walkTimer : (window.walkTimer || 0);

    if (player.isMovingToTarget && player.targetX !== null && player.targetY !== null) {
        const diffX = player.targetX - player.x, diffY = player.targetY - player.y, dist = Math.hypot(diffX, diffY);
        if (dist < player.speed) {
            nextX = player.targetX; nextY = player.targetY; player.isMovingToTarget = false;
            player.targetX = null; player.targetY = null; player.direction = 'idle'; currentWalkTimer = 0;
        } else {
            dx = diffX / dist; dy = diffY / dist;
            nextX = player.x + dx * player.speed; nextY = player.y + dy * player.speed;
            player.direction = (Math.abs(diffX) > Math.abs(diffY)) ? ((diffX > 0) ? 'right' : 'left') : ((diffY > 0) ? 'down' : 'up');
            currentWalkTimer++;
        }
    } else {
        if (keys.ArrowUp || keys.w) dy -= 1;
        if (keys.ArrowDown || keys.s) dy += 1;
        if (keys.ArrowLeft || keys.a) dx -= 1;
        if (keys.ArrowRight || keys.d) dx += 1;

        if (dx !== 0 || dy !== 0) {
            const len = Math.hypot(dx, dy);
            nextX = player.x + (dx / len) * player.speed; nextY = player.y + (dy / len) * player.speed;
            player.direction = (Math.abs(dx) > Math.abs(dy)) ? ((dx > 0) ? 'right' : 'left') : ((dy > 0) ? 'down' : 'up');
            currentWalkTimer++;
        } else {
            player.direction = 'idle'; currentWalkTimer = 0;
        }
    }

    window.walkTimer = currentWalkTimer;
    if (typeof walkTimer !== 'undefined') walkTimer = currentWalkTimer;

    if (typeof currentWorldLocation !== 'undefined' && currentWorldLocation === 2) {
        if (nextX <= 1040) {
            const t = nextX / 1040;
            const beachLineY = 1120 - (330 * Math.pow(t, 0.75));
            if (nextY > beachLineY) { nextY = player.y; player.isMovingToTarget = false; }
        } else {
            if (nextY > 820) { nextY = player.y; player.isMovingToTarget = false; }
            if (nextX > 1960) { nextX = player.x; player.isMovingToTarget = false; }
        }
    }

    if (typeof MAP_WIDTH !== 'undefined') {
        player.x = Math.max(30, Math.min(MAP_WIDTH - 30, nextX));
        player.y = Math.max(40, Math.min(MAP_HEIGHT - 40, nextY));
    } else { player.x = nextX; player.y = nextY; }

    if (typeof checkBuildingProximity === 'function') checkBuildingProximity();
    else if (typeof window.checkBuildingProximity === 'function') window.checkBuildingProximity();
}

function toggleChat() { if (isChatOpen) closeChat(); else openChat(); }
function openChat() {
    isChatOpen = true; document.getElementById('chatBoxPopup').classList.remove('hidden'); unreadCount = 0; updateChatBadge();
    setTimeout(() => { const chatMessages = document.getElementById('chatMessages'); if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight; }, 50);
}
function closeChat() { isChatOpen = false; document.getElementById('chatBoxPopup').classList.add('hidden'); }
function updateChatBadge() {
    const badge = document.getElementById('chatBadge'); if (!badge) return;
    if (unreadCount > 0) { badge.innerText = unreadCount > 99 ? '99+' : unreadCount; badge.classList.remove('hidden'); }
    else { badge.classList.add('hidden'); }
}
function addChatMessage(sender, text, isPlayer = false) {
    const chatMessages = document.getElementById('chatMessages'); if (!chatMessages) return;
    const msgDiv = document.createElement('div'); msgDiv.className = `flex flex-col ${isPlayer ? 'items-end' : 'items-start'}`;
    const senderSpan = document.createElement('span'); senderSpan.className = 'text-[10px] font-bold text-slate-400 mb-0.5 px-1'; senderSpan.innerText = sender;
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = `px-3 py-1.5 rounded-2xl max-w-[85%] text-xs ${isPlayer ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-200 text-slate-800 rounded-bl-none font-medium'}`;
    bubbleDiv.innerText = text;
    msgDiv.appendChild(senderSpan); msgDiv.appendChild(bubbleDiv); chatMessages.appendChild(msgDiv); chatMessages.scrollTop = chatMessages.scrollHeight;
    if (!isChatOpen) { unreadCount++; updateChatBadge(); }
}
function sendChatMessage() {
    const input = document.getElementById('chatInput'); if (!input) return;
    const text = input.value.trim(); if (text.length === 0) return;
    if (window.sendFirebaseChat) window.sendFirebaseChat(playerCustomName || "Saya", text);
    else addChatMessage(playerCustomName || "Saya", text, true);
    input.value = "";
}