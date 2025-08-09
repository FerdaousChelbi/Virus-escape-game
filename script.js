const firebaseConfig = {
  apiKey: "AIzaSyDNTINr56vFNBN7uOzmDeJpE6bwejC_bCU",
  authDomain: "virus-escape-game-70cea.firebaseapp.com",
  databaseURL: "https://virus-escape-game-70cea-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "virus-escape-game-70cea",
  storageBucket: "virus-escape-game-70cea.firebasestorage.app",
  messagingSenderId: "705781646773",
  appId: "1:705781646773:web:e389b487baabdbf5fec5fc"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const scoresRef = db.ref('scores');

const elements = {
    canvas: document.getElementById("gameCanvas"),
    startScreen: document.getElementById("startScreen"),
    playerName: document.getElementById("playerName"),
    startButton: document.getElementById("startButton"),
    infoDisplay: document.querySelector(".info-display"),
    playerDisplay: document.getElementById("playerDisplay"),
    timer: document.getElementById("timer"),
    score: document.getElementById("score"),
    gameOver: document.getElementById("gameOver"),
    resultTitle: document.getElementById("resultTitle"),
    resultScore: document.getElementById("resultScore"),
    backButton: document.getElementById("backButton"),
    controls: document.querySelector(".controls"),
    up: document.getElementById("up"),
    left: document.getElementById("left"),
    down: document.getElementById("down"),
    right: document.getElementById("right"),
    dashboard: document.getElementById("dashboard"),
    leaderboard: document.getElementById("leaderboard"),
    soundToggle: document.getElementById("soundToggle"),
    backgroundMusic: document.getElementById("backgroundMusic"),
    collisionSound: document.getElementById("collisionSound"),
    scoreSound: document.getElementById("scoreSound"),
    winSound: document.getElementById("winSound")
};

const ctx = elements.canvas.getContext("2d");
        
const config = {
    playerSize: 50,
    playerSpeed: 2,
    virusSpawnRate: 1500,
    gameDuration: 30,
    minVirusSize: 20,
    maxVirusSize: 30,
    minVirusSpeed: 0.5,
    maxVirusSpeed: 1
};

const state = {
    player: {
        x: 0,
        y: 0,
        name: ""
    },
    viruses: [],
    score: 0,
    timeLeft: config.gameDuration,
    gameActive: false,
    lastVirusTime: 0,
    animationId: null,
    canvasSize: {
        width: 0,
        height: 0
    },
    keys: {
        ArrowUp: false,
        ArrowDown: false,
        ArrowLeft: false,
        ArrowRight: false
    },
    leaderboard: [],
    soundEnabled: true
};

elements.soundToggle.addEventListener("click", () => {
    state.soundEnabled = !state.soundEnabled;
    elements.soundToggle.textContent = state.soundEnabled ? "🔊" : "🔇";
    
    if (state.soundEnabled) {
        if (state.gameActive) {
            elements.backgroundMusic.play().catch(e => console.log("Audio play prevented:", e));
        }
    } else {
        elements.backgroundMusic.pause();
        elements.collisionSound.pause();
        elements.scoreSound.pause();
        elements.winSound.pause();
    }
});

function updateLeaderboard() {
    scoresRef.orderByChild('score').limitToLast(5).once('value', (snapshot) => {
        const scores = [];
        snapshot.forEach((childSnapshot) => {
            scores.push(childSnapshot.val());
        });
        scores.sort((a, b) => b.score - a.score);
        
        elements.leaderboard.innerHTML = '';
        scores.forEach((player, index) => {
            const entry = document.createElement('div');
            entry.className = 'leaderboard-entry';
            entry.innerHTML = `
                <span>${index + 1}. ${player.name}</span>
                <span>${player.score} pts</span>
            `;
            elements.leaderboard.appendChild(entry);
        });
    });
}

const images = {
    player: new Image(),
    virus: new Image()
};

images.player.src = "assets/Logo.png";
images.virus.src = "assets/virus.png";

const setupControls = () => {
    const handlePress = (direction) => {
        return (e) => {
            e.preventDefault();
            state.keys[direction] = true;
        };
    };

    const handleRelease = (e) => {
        e.preventDefault();
        for (const key in state.keys) {
            state.keys[key] = false;
        }
    };

    elements.up.addEventListener("touchstart", handlePress("ArrowUp"), { passive: false });
    elements.down.addEventListener("touchstart", handlePress("ArrowDown"), { passive: false });
    elements.left.addEventListener("touchstart", handlePress("ArrowLeft"), { passive: false });
    elements.right.addEventListener("touchstart", handlePress("ArrowRight"), { passive: false });

    elements.up.addEventListener("mousedown", handlePress("ArrowUp"));
    elements.down.addEventListener("mousedown", handlePress("ArrowDown"));
    elements.left.addEventListener("mousedown", handlePress("ArrowLeft"));
    elements.right.addEventListener("mousedown", handlePress("ArrowRight"));

    const controls = [elements.up, elements.down, elements.left, elements.right];
    controls.forEach(control => {
        control.addEventListener("touchend", handleRelease, { passive: false });
        control.addEventListener("touchcancel", handleRelease, { passive: false });
        control.addEventListener("mouseup", handleRelease);
        control.addEventListener("mouseleave", handleRelease);
    });
};

const setupKeyboard = () => {
    document.addEventListener("keydown", (e) => {
        if (state.keys.hasOwnProperty(e.key)) {
            state.keys[e.key] = true;
        }
    });

    document.addEventListener("keyup", (e) => {
        if (state.keys.hasOwnProperty(e.key)) {
            state.keys[e.key] = false;
        }
    });
};

const resizeCanvas = () => {
    const maxWidth = window.innerWidth - 40;
    const maxHeight = window.innerHeight * 0.5;
    const ratio = 2/3;

    if (maxWidth / ratio <= maxHeight) {
        elements.canvas.width = maxWidth;
        elements.canvas.height = maxWidth / ratio;
    } else {
        elements.canvas.height = maxHeight;
        elements.canvas.width = maxHeight * ratio;
    }

    state.canvasSize.width = elements.canvas.width;
    state.canvasSize.height = elements.canvas.height;
    
    if (state.gameActive) {
        state.player.x = elements.canvas.width / 2 - config.playerSize / 2;
        state.player.y = elements.canvas.height - config.playerSize - 20;
    }
};

const createVirus = () => {
    const size = Math.random() * (config.maxVirusSize - config.minVirusSize) + config.minVirusSize;
    state.viruses.push({
        x: Math.random() * (state.canvasSize.width - size),
        y: -size,
        width: size,
        height: size,
        speed: Math.random() * (config.maxVirusSpeed - config.minVirusSpeed) + config.minVirusSpeed
    });
};

const updatePlayer = () => {
    if (state.keys.ArrowUp && state.player.y > 0) {
        state.player.y -= config.playerSpeed;
    }
    if (state.keys.ArrowDown && state.player.y < state.canvasSize.height - config.playerSize) {
        state.player.y += config.playerSpeed;
    }
    if (state.keys.ArrowLeft && state.player.x > 0) {
        state.player.x -= config.playerSpeed;
    }
    if (state.keys.ArrowRight && state.player.x < state.canvasSize.width - config.playerSize) {
        state.player.x += config.playerSpeed;
    }
};

const updateViruses = () => {
    const currentTime = Date.now();
    if (currentTime - state.lastVirusTime > config.virusSpawnRate && state.gameActive) {
        createVirus();
        state.lastVirusTime = currentTime;
    }

    for (let i = state.viruses.length - 1; i >= 0; i--) {
        state.viruses[i].y += state.viruses[i].speed;

        if (
            state.player.x < state.viruses[i].x + state.viruses[i].width &&
            state.player.x + config.playerSize > state.viruses[i].x &&
            state.player.y < state.viruses[i].y + state.viruses[i].height &&
            state.player.y + config.playerSize > state.viruses[i].y
        ) {
            if (state.soundEnabled) {
                elements.collisionSound.currentTime = 0;
                elements.collisionSound.play().catch(e => console.log("Audio play prevented:", e));
            }
            endGame(false);
            return;
        }

        if (state.viruses[i].y > state.canvasSize.height) {
            state.viruses.splice(i, 1);
            state.score++;
            elements.score.textContent = `${state.score} pts`;
            if (state.soundEnabled) {
                elements.scoreSound.currentTime = 0;
                elements.scoreSound.play().catch(e => console.log("Audio play prevented:", e));
            }
        }
    }
};

const draw = () => {
    ctx.clearRect(0, 0, state.canvasSize.width, state.canvasSize.height);
    
    ctx.drawImage(
        images.player,
        state.player.x,
        state.player.y,
        config.playerSize,
        config.playerSize
    );
    
    state.viruses.forEach(virus => {
        ctx.drawImage(
            images.virus,
            virus.x,
            virus.y,
            virus.width,
            virus.height
        );
    });
};

const gameLoop = () => {
    if (!state.gameActive) return;
    
    updatePlayer();
    updateViruses();
    draw();
    
    state.animationId = requestAnimationFrame(gameLoop);
};

const startTimer = () => {
    const timerInterval = setInterval(() => {
        if (!state.gameActive) {
            clearInterval(timerInterval);
            return;
        }
        
        state.timeLeft--;
        elements.timer.textContent = `${state.timeLeft}s`;
        
        if (state.timeLeft <= 0) {
            if (state.soundEnabled) {
                elements.winSound.play().catch(e => console.log("Audio play prevented:", e));
            }
            endGame(true);
            clearInterval(timerInterval);
        }
    }, 1000);
};

const endGame = (timeOut) => {
    state.gameActive = false;
    cancelAnimationFrame(state.animationId);
    
    elements.backgroundMusic.pause();
    
    const scoreData = {
        name: state.player.name,
        score: state.score,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    
    scoresRef.push(scoreData);
    updateLeaderboard();
    
    elements.gameOver.style.display = "block";
    
    if (timeOut) {
        elements.resultTitle.textContent = "Félicitations !";
        elements.resultScore.textContent = `Vous avez gagné ${state.score} points !`;
    } else {
        elements.resultTitle.textContent = "Partie terminée";
        elements.resultScore.textContent = `Score final: ${state.score} points`;
    }
};

elements.backButton.addEventListener("click", () => {
    elements.gameOver.style.display = "none";
    elements.canvas.style.display = "none";
    elements.infoDisplay.style.display = "none";
    elements.controls.style.display = "none";
    elements.dashboard.style.display = "none";
    
    elements.startScreen.style.display = "block";
    
    state.viruses = [];
    state.score = 0;
    state.timeLeft = config.gameDuration;
});

const startGame = () => {
    state.player.name = elements.playerName.value.trim() || "Joueur";
    
    elements.startScreen.style.display = "none";
    elements.canvas.style.display = "block";
    elements.infoDisplay.style.display = "flex";
    elements.controls.style.display = "grid";
    elements.dashboard.style.display = "block";
    
    elements.playerDisplay.textContent = state.player.name;
    
    resizeCanvas();
    
    state.gameActive = true;
    state.player.x = state.canvasSize.width / 2 - config.playerSize / 2;
    state.player.y = state.canvasSize.height - config.playerSize - 20;
    state.score = 0;
    state.timeLeft = config.gameDuration;
    
    elements.score.textContent = "0 pts";
    elements.timer.textContent = `${config.gameDuration}s`;
    
    if (state.soundEnabled) {
        elements.backgroundMusic.volume = 0.3;
        elements.backgroundMusic.play().catch(e => console.log("Audio play prevented:", e));
    }
    
    startTimer();
    gameLoop();
};

const init = () => {
    elements.startButton.addEventListener("click", startGame);
    elements.playerName.addEventListener("keypress", (e) => {
        if (e.key === "Enter") startGame();
    });
    
    setupControls();
    setupKeyboard();
    window.addEventListener("resize", resizeCanvas);
    
    let imagesLoaded = 0;
    const imageLoaded = () => {
        imagesLoaded++;
        if (imagesLoaded === 2) {
            resizeCanvas();
        }
    };
    images.player.onload = imageLoaded;
    images.virus.onload = imageLoaded;
    
    updateLeaderboard();
};

init();