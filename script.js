const firebaseConfig = {
    apiKey: "AIzaSyDo4llw1qn8x-b-OKNkfZQfGNx81wD4w7M",
    authDomain: "virus-escape-game.firebaseapp.com",
    databaseURL: "https://virus-escape-game-default-rtdb.europe-west1.firebasedatabase.app/",
    projectId: "virus-escape-game",
    storageBucket: "virus-escape-game.firebasestorage.app",
    messagingSenderId: "181801113501",
    appId: "1:181801113501:web:a0815d2a3283fbdfdd8174",
    measurementId: "G-0DTKTDM021"
};

// Éléments du DOM
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
    scoresList: document.getElementById("scoresList"),
    soundToggle: document.getElementById("soundToggle"),
    backgroundMusic: document.getElementById("backgroundMusic"),
    collisionSound: document.getElementById("collisionSound"),
    scoreSound: document.getElementById("scoreSound"),
    winSound: document.getElementById("winSound"),
    scoresList: document.getElementById("scoresList")

};

// Contexte du canvas
const ctx = elements.canvas.getContext("2d");

// Configuration du jeu
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

// État du jeu
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

try {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully");
    
    const db = firebase.database();
    db.ref(".info/connected").on("value", (snapshot) => {
        if (snapshot.val() === true) {
            console.log("Connected to Firebase Realtime Database");
        } else {
            console.log("Not connected to Firebase");
        }
    });
} catch (error) {
    console.error("Firebase initialization error:", error);
}

function saveScore(name, score) {
    if (!name || !score) {
        console.error("Invalid score data");
        return;
    }

    const scoresRef = db.ref("scores");
    const newScoreRef = scoresRef.push();
    
    const scoreData = {
        name: name,
        score: score,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        userAgent: navigator.userAgent
    };

    newScoreRef.set(scoreData)
        .then(() => {
            console.log("Score saved successfully");
            loadLeaderboard(); 
        })
        .catch((error) => {
            console.error("Error saving score:", error);
            localStorage.setItem("pendingScore", JSON.stringify(scoreData));
        });
}


function loadLeaderboard() {
    db.ref("scores")
        .orderByChild("score")
        .limitToLast(5) 
        .once("value")
        .then((snapshot) => {
            const scores = [];
            snapshot.forEach((child) => {
                scores.push({
                    name: child.val().name,
                    score: child.val().score
                });
            });
            
            scores.sort((a, b) => b.score - a.score);
            
            elements.scoresList.innerHTML = "";
            scores.slice(0, 5).forEach((score, index) => {
                const li = document.createElement("li");
                li.textContent = `${index + 1}. ${score.name}: ${score.score} pts`;
                elements.scoresList.appendChild(li);
            });
        })
        .catch((error) => {
            console.error("Error loading leaderboard:", error);
            elements.scoresList.innerHTML = "<li>Could not load leaderboard</li>";
        });
}
// Images
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
    const ratio = 2 / 3;

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
    ctx.drawImage(images.player, state.player.x, state.player.y, config.playerSize, config.playerSize);
    state.viruses.forEach(virus => {
        ctx.drawImage(images.virus, virus.x, virus.y, virus.width, virus.height);
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
    saveScore(state.player.name, state.score);
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
    loadLeaderboard();
};

init();
