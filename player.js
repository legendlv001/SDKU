
// =============================================================
// PLAYER.JS - Data Karakter, Gerakan, Sprite & Sistem Chat
// =============================================================

const player = {
    x: 1000, y: 600, speed: 2.8, width: 38, height: 52,
    direction: 'down', targetX: null, targetY: null, isMovingToTarget: false
};

const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, w: false, s: false, a: false, d: false };

let isChatOpen = false;
let unreadCount = 0;
let chatTimer = null;
let isTypingOrHovered = false;
const autoHideDelay = 5000;

function drawCharacterSprite(c, x, y, width, height, gender, dir, walkStep) {
    c.save();
    let currentDir = (dir === 'idle') ? 'down' : dir;
    const assetKey = `${gender}_${currentDir}`;
    const imgAsset = ASSETS[assetKey];
    const isLoaded = assetsLoaded[assetKey];

    const bobbing = (dir !== 'idle') ? Math.sin(walkStep * 0.4) * 3 : 0;
    const sway = (dir !== 'idle') ? Math.sin(walkStep * 0.2) * 0.05 : 0;
    const charY = y + bobbing;

    if (isLoaded) {
        c.fillStyle = 'rgba(0,0,0,0.25)';
        c.beginPath();
        c.ellipse(x + width / 2, y + height - 2, width * 0.32, 6, 0, 0, Math.PI * 2);
        c.fill();

        c.translate(x + width / 2, charY + height / 2);
        c.rotate(sway);
        c.drawImage(imgAsset, -width / 2, -height / 2, width, height);
        c.restore();
        return;
    }

    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.beginPath();
    c.ellipse(x + width / 2, y + height - 3, width * 0.35, 6, 0, 0, Math.PI * 2);
    c.fill();

    c.translate(x + width / 2, charY + height / 2);
    c.rotate(sway);

    const isFemale = (gender === 'female');
    const drawX = -width / 2;
    const drawY = -height / 2;

    if (isFemale) {
        c.fillStyle = '#b91c1c';
        c.fillRect(drawX + width * 0.25, drawY + height * 0.45, width * 0.5, height * 0.43);
        c.fillStyle = '#ffffff';
        c.beginPath();
        c.roundRect(drawX + width * 0.12, drawY, width * 0.76, height * 0.42, 18);
        c.fill();
    } else {
        c.fillStyle = '#ffffff';
        c.fillRect(drawX + width * 0.25, drawY + height * 0.3, width * 0.5, height * 0.25);
        c.fillStyle = '#1e293b';
        c.beginPath();
        c.roundRect(drawX + width * 0.25, drawY, width * 0.5, 14, 4);
        c.fill();
    }
    c.restore();
}

function updateGame() {
    let dx = 0;
    let dy = 0;

    let nextX = player.x;
    let nextY = player.y;

    // 1. GERAKAN POINT-AND-CLICK
    if (player.isMovingToTarget && player.targetX !== null && player.targetY !== null) {
        const diffX = player.targetX - player.x;
        const diffY = player.targetY - player.y;
        const dist = Math.hypot(diffX, diffY);

        if (dist < player.speed) {
            nextX = player.targetX;
            nextY = player.targetY;
            player.isMovingToTarget = false;
            player.targetX = null;
            player.targetY = null;
            player.direction = 'idle';
            walkTimer = 0;
        } else {
            dx = diffX / dist;
            dy = diffY / dist;
            nextX = player.x + dx * player.speed;
            nextY = player.y + dy * player.speed;

            if (Math.abs(diffX) > Math.abs(diffY)) {
                player.direction = (diffX > 0) ? 'right' : 'left';
            } else {
                player.direction = (diffY > 0) ? 'down' : 'up';
            }
            walkTimer++;
        }
    } else {
        // 2. GERAKAN KEYBOARD & ANALOG
        if (keys.ArrowUp || keys.w) dy -= 1;
        if (keys.ArrowDown || keys.s) dy += 1;
        if (keys.ArrowLeft || keys.a) dx -= 1;
        if (keys.ArrowRight || keys.d) dx += 1;

        if (dx !== 0 || dy !== 0) {
            const len = Math.hypot(dx, dy);
            nextX = player.x + (dx / len) * player.speed;
            nextY = player.y + (dy / len) * player.speed;

            if (Math.abs(dx) > Math.abs(dy)) {
                player.direction = (dx > 0) ? 'right' : 'left';
            } else {
                player.direction = (dy > 0) ? 'down' : 'up';
            }
            walkTimer++;
        } else {
            player.direction = 'idle';
            walkTimer = 0;
        }
    }

    // 3. COLLISION PANTAI & LAUT
    if (currentWorldLocation === 2) {
        if (nextX <= 1040) {
            const t = nextX / 1040;
            const beachLineY = 1120 - (330 * Math.pow(t, 0.75));
            if (nextY > beachLineY) {
                nextY = player.y;
                player.isMovingToTarget = false;
            }
        } else {
            const pierBottomDeckY = 820;

            if (nextY > pierBottomDeckY) {
                nextY = player.y;
                player.isMovingToTarget = false;
            }

            if (nextX > 1960) {
                nextX = player.x;
                player.isMovingToTarget = false;
            }
        }
    }

    player.x = Math.max(30, Math.min(MAP_WIDTH - 30, nextX));
    player.y = Math.max(40, Math.min(MAP_HEIGHT - 40, nextY));

    checkBuildingProximity();
}

function pauseChatTimer() {
    isTypingOrHovered = true;
    if (chatTimer) { clearTimeout(chatTimer); chatTimer = null; }
}

function resetChatTimer() {
    isTypingOrHovered = false;
    if (chatTimer) clearTimeout(chatTimer);
    if (isChatOpen) {
        chatTimer = setTimeout(() => {
            const chatInput = document.getElementById('chatInput');
            if (document.activeElement !== chatInput && !isTypingOrHovered) closeChat();
        }, autoHideDelay);
    }
}

function toggleChat() {
    if (isChatOpen) closeChat();
    else openChat();
}

function openChat() {
    isChatOpen = true;
    document.getElementById('chatBoxPopup').classList.remove('hidden');
    unreadCount = 0;
    updateChatBadge();
    resetChatTimer();

    setTimeout(() => {
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 50);
}

function closeChat() {
    isChatOpen = false;
    document.getElementById('chatBoxPopup').classList.add('hidden');
    if (chatTimer) clearTimeout(chatTimer);
}

function updateChatBadge() {
    const badge = document.getElementById('chatBadge');
    if (!badge) return;
    if (unreadCount > 0) {
        badge.innerText = unreadCount > 99 ? '99+' : unreadCount;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

function addChatMessage(sender, text, isPlayer = false) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;

    const msgDiv = document.createElement('div');
    msgDiv.className = `flex flex-col ${isPlayer ? 'items-end' : 'items-start'}`;

    const senderSpan = document.createElement('span');
    senderSpan.className = 'text-[10px] font-bold text-slate-400 mb-0.5 px-1';
    senderSpan.innerText = sender;

    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = `px-3 py-1.5 rounded-2xl max-w-[85%] text-xs ${
        isPlayer ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-200 text-slate-800 rounded-bl-none font-medium'
    }`;
    bubbleDiv.innerText = text;

    msgDiv.appendChild(senderSpan);
    msgDiv.appendChild(bubbleDiv);
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    if (!isChatOpen) {
        unreadCount++;
        updateChatBadge();
    } else {
        resetChatTimer();
    }
}

function sendChatMessage() {
    const input = document.getElementById('chatInput');
    if (!input) return;
    const text = input.value.trim();
    if (text.length === 0) return;

    if (window.sendFirebaseChat) {
        window.sendFirebaseChat(playerCustomName || "Saya", text);
    } else {
        addChatMessage(playerCustomName || "Saya", text, true);
    }
    input.value = "";
    resetChatTimer();
}

