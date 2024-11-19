let socket;
let character;
let players = {};
let currentBiome = 'light';
let connectionError = false;
let backgroundImages = {};

const preventScrollKeys = new Set([
    32, // Space
    37, // Left
    38, // Up
    39, // Right
    40  // Down
]);

function getCurrentBiome() {
    const currentHour = new Date().getHours();
    // Consider 6:00 to 18:00 as day time
    return (currentHour >= 6 && currentHour < 18) ? 'light' : 'dark';
}

function checkAndUpdateBiome() {
    const newBiome = getCurrentBiome();
    if (newBiome !== currentBiome) {
        const oldBiome = currentBiome;
        currentBiome = newBiome;
        if (socket?.connected) {
            socket.emit('change_biome', { biome: currentBiome });
            window.Analytics.trackBiomeChange(oldBiome, currentBiome);
        }
    }
}

document.addEventListener('keydown', (e) => {
    if (preventScrollKeys.has(e.keyCode)) {
        e.preventDefault();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.querySelector('.header-menu .menu-toggle');
    const menuContent = document.querySelector('.header-menu .menu-content');
    
    if (menuToggle && menuContent) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            menuContent.classList.toggle('show');
        });
        
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.header-menu')) {
                menuContent.classList.remove('show');
            }
        });
    }

    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }
});

function sendMessage() {
    const chatInput = document.getElementById('chat-input');
    const message = chatInput.value.trim();
    
    if (message && socket?.connected) {
        socket.emit('chat_message', { message });
        chatInput.value = '';
        window.Analytics.trackChatEvent('Send Message', message.length);
    }
}

function addChatMessage(data) {
    const chatMessages = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';
    messageDiv.innerHTML = `<span class="chat-username">${data.username}:</span> ${data.message}`;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function updateOnlineUsersList(players) {
    const usersList = document.getElementById('online-users-list');
    if (!usersList) return;
    
    usersList.innerHTML = '';
    Object.values(players).forEach(player => {
        const userDiv = document.createElement('div');
        userDiv.className = 'online-user';
        userDiv.textContent = player.username || 'Anonymous';
        usersList.appendChild(userDiv);
    });
}

function preload() {
    backgroundImages.light = loadImage('/static/images/forestday.jpg');
    backgroundImages.dark = loadImage('/static/images/forestnight.jpg');
}

function setup() {
    document.body.classList.add('playing');
    
    const canvas = createCanvas(800, 600);
    canvas.parent('game-canvas');
    
    character = new Character(100, 100);
    
    // Set initial biome based on time
    currentBiome = getCurrentBiome();
    
    // Check biome every minute
    setInterval(checkAndUpdateBiome, 60000);
    
    try {
        socket = io.connect(window.location.origin, {
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5
        });
        
        socket.on('connect', () => {
            console.log('Connected to server');
            connectionError = false;
            window.Analytics.trackGameEvent('Connection', 'Connected to Game Server');
        });
        
        socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            connectionError = true;
            window.Analytics.trackError('Connection Error', error.message);
        });
        
        socket.on('players_update', (data) => {
            players = data;
            if (character && data[socket.id] && !character.positionInitialized) {
                character.x = data[socket.id].position.x;
                character.y = data[socket.id].position.y;
                character.positionInitialized = true;
                window.Analytics.trackGameEvent('Player', 'Position Initialized');
            }
            updateOnlineUsersList(players);
        });

        socket.on('character_data', (data) => {
            character.color = data.color;
            currentBiome = data.biome;
        });

        socket.on('chat_message', (data) => {
            addChatMessage(data);
        });

        socket.emit('request_character_data');
    } catch (error) {
        console.error('Failed to initialize socket:', error);
        connectionError = true;
    }

    canvas.elt.addEventListener('keydown', (e) => {
        if (preventScrollKeys.has(e.keyCode)) {
            e.preventDefault();
        }
    });
}

function draw() {
    const biomeProperties = getBiomeProperties(currentBiome);
    if (backgroundImages[currentBiome]) {
        image(backgroundImages[currentBiome], 0, 0, width, height);
    } else {
        background(biomeProperties.backgroundColor);
    }
    
    if (connectionError) {
        fill(255, 0, 0);
        textAlign(CENTER);
        textSize(16);
        text('Connection error. Trying to reconnect...', width/2, height/2);
        return;
    }
    
    Object.values(players).forEach(player => {
        if (player.id !== socket?.id) {
            if (character.images[player.color]) {
                imageMode(CENTER);
                image(character.images[player.color], player.position.x, player.position.y, 32, 32);
                imageMode(CORNER);
            }
            
            fill(255);
            textAlign(CENTER);
            textSize(12);
            text(player.username || 'Anonymous', player.position.x, player.position.y - 25);
        }
    });
    
    character.speed = biomeProperties.speed;
    
    character.update();
    character.display();
    
    if (socket?.connected) {
        socket.emit('player_move', {
            position: { x: character.x, y: character.y },
            biome: currentBiome
        });
    }
}

function keyPressed(e) {
    if (e && preventScrollKeys.has(e.keyCode)) {
        e.preventDefault();
    }
    character.handleKeyPress(keyCode);
}

function windowResized() {
    resizeCanvas(min(windowWidth - 40, 800), min(windowHeight - 200, 600));
}