(function () {
  "use strict";

  // ==================== CONSTANTS ====================
  const CANVAS_WIDTH = 400;
  const CANVAS_HEIGHT = 600;
  const GRAVITY = 0.5;
  const JUMP_STRENGTH = -9;
  const PIPE_SPEED = 2.5;
  const PIPE_WIDTH = 52;
  const PIPE_GAP = 140;
  const PIPE_SPAWN_INTERVAL = 1800;
  const GROUND_HEIGHT = 80;
  const BIRD_WIDTH = 34;
  const BIRD_HEIGHT = 24;
  const HITBOX_PADDING = 4;

  // Game States
  const GameState = {
    IDLE: "idle",
    PLAYING: "playing",
    GAME_OVER: "gameOver",
  };

  // ==================== DOM ELEMENTS ====================
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const startOverlay = document.getElementById("startOverlay");
  const gameOverOverlay = document.getElementById("gameOverOverlay");
  const startBtn = document.getElementById("startBtn");
  const restartBtn = document.getElementById("restartBtn");
  const finalScoreEl = document.getElementById("finalScore");
  const highScoreEl = document.getElementById("highScore");

  // ==================== GAME VARIABLES ====================
  let currentState = GameState.IDLE;
  let score = 0;
  let highScorePersistent =
    parseInt(localStorage.getItem("flappyHighScore")) || 0;
  let animationFrameId = null;
  let lastPipeSpawn = 0;

  // Bird object
  const bird = {
    x: CANVAS_WIDTH * 0.2,
    y: CANVAS_HEIGHT / 2,
    width: BIRD_WIDTH,
    height: BIRD_HEIGHT,
    velocity: 0,
    rotation: 0,
    bobOffset: 0,
    bobDirection: 1,
  };

  // Pipes array
  let pipes = [];

  // Ground scroll offset
  let groundOffset = 0;

  // Background parallax layers
  const backgroundLayers = {
    mountains: { offset: 0, speed: 0.2 },
    hills: { offset: 0, speed: 0.5 },
  };

  // ==================== COLOR PALETTE ====================
  const colors = {
    skyTop: "#1a0a2e",
    skyMid: "#16213e",
    skyBottom: "#0f3460",
    sun: "#ffc857",
    sunGlow: "rgba(255, 200, 87, 0.3)",
    mountain: "#2d1b4e",
    mountainHighlight: "#4a2c7a",
    hill: "#3d2a5f",
    hillHighlight: "#5a3d7a",
    ground: "#ff6b35",
    groundDark: "#cc5429",
    groundLine: "#ffc857",
    pipeBody: "#2d8a4e",
    pipeDark: "#1f6b3a",
    pipeHighlight: "#4aba6e",
    pipeCap: "#1f6b3a",
    pipeCapDark: "#145529",
    birdBody: "#ffc857",
    birdWing: "#ff6b35",
    birdBeak: "#ff4d6d",
    birdEye: "#1a0a2e",
  };

  // ==================== UTILITY FUNCTIONS ====================
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function randomRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  // ==================== BIRD FUNCTIONS ====================
  function resetBird() {
    bird.x = CANVAS_WIDTH * 0.2;
    bird.y = CANVAS_HEIGHT / 2;
    bird.velocity = 0;
    bird.rotation = 0;
    bird.bobOffset = 0;
  }

  function updateBird() {
    if (currentState === GameState.IDLE) {
      // Bobbing animation when idle
      bird.bobOffset += 0.08 * bird.bobDirection;
      if (Math.abs(bird.bobOffset) > 8) {
        bird.bobDirection *= -1;
      }
      bird.y = CANVAS_HEIGHT / 2 + bird.bobOffset;
      bird.rotation = 0;
      return;
    }

    if (currentState !== GameState.PLAYING) return;

    // Apply gravity
    bird.velocity += GRAVITY;
    bird.velocity = clamp(bird.velocity, -12, 15);
    bird.y += bird.velocity;

    // Calculate rotation based on velocity
    const targetRotation = clamp(bird.velocity * 3, -30, 90);
    bird.rotation += (targetRotation - bird.rotation) * 0.1;
  }

  function flapBird() {
    if (currentState === GameState.IDLE) {
      startGame();
      return;
    }
    if (currentState === GameState.PLAYING) {
      bird.velocity = JUMP_STRENGTH;
    }
  }

  function drawBird() {
    ctx.save();

    const drawX = bird.x + bird.width / 2;
    const drawY = bird.y + bird.height / 2;

    ctx.translate(drawX, drawY);
    ctx.rotate((bird.rotation * Math.PI) / 180);

    // Body
    ctx.fillStyle = colors.birdBody;
    ctx.beginPath();
    ctx.ellipse(0, 0, bird.width / 2, bird.height / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wing
    ctx.fillStyle = colors.birdWing;
    const wingOffset = Math.sin(Date.now() / 50) * 2;
    ctx.beginPath();
    ctx.ellipse(-4, 2 + wingOffset, 8, 6, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(8, -4, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors.birdEye;
    ctx.beginPath();
    ctx.arc(9, -4, 3, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = colors.birdBeak;
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(20, 2);
    ctx.lineTo(12, 6);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  // ==================== PIPE FUNCTIONS ====================
  function createPipe() {
    const minGapY = 80;
    const maxGapY = CANVAS_HEIGHT - GROUND_HEIGHT - PIPE_GAP - 80;
    const gapY = randomRange(minGapY, maxGapY);

    return {
      x: CANVAS_WIDTH,
      width: PIPE_WIDTH,
      gapY: gapY,
      gapHeight: PIPE_GAP,
      passed: false,
    };
  }

  function updatePipes() {
    if (currentState !== GameState.PLAYING) return;

    // Spawn new pipes
    const now = Date.now();
    if (now - lastPipeSpawn > PIPE_SPAWN_INTERVAL) {
      pipes.push(createPipe());
      lastPipeSpawn = now;
    }

    // Move and remove pipes
    for (let i = pipes.length - 1; i >= 0; i--) {
      pipes[i].x -= PIPE_SPEED;

      // Check if bird passed the pipe
      if (!pipes[i].passed && pipes[i].x + pipes[i].width < bird.x) {
        pipes[i].passed = true;
        score++;
      }

      // Remove off-screen pipes
      if (pipes[i].x + pipes[i].width < -10) {
        pipes.splice(i, 1);
      }
    }
  }

  function drawPipe(pipe) {
    const topHeight = pipe.gapY;
    const bottomY = pipe.gapY + pipe.gapHeight;
    const capHeight = 24;
    const capOverhang = 4;

    // Top pipe body
    ctx.fillStyle = colors.pipeBody;
    ctx.fillRect(pipe.x, 0, pipe.width, topHeight - capHeight);

    // Top pipe cap
    ctx.fillStyle = colors.pipeCap;
    ctx.fillRect(
      pipe.x - capOverhang,
      topHeight - capHeight,
      pipe.width + capOverhang * 2,
      capHeight,
    );

    // Top pipe highlights
    ctx.fillStyle = colors.pipeHighlight;
    ctx.fillRect(pipe.x + 4, 0, 6, topHeight - capHeight);

    ctx.fillStyle = colors.pipeDark;
    ctx.fillRect(pipe.x + pipe.width - 8, 0, 8, topHeight - capHeight);

    // Bottom pipe body
    ctx.fillStyle = colors.pipeBody;
    ctx.fillRect(
      pipe.x,
      bottomY + capHeight,
      pipe.width,
      CANVAS_HEIGHT - bottomY - capHeight - GROUND_HEIGHT,
    );

    // Bottom pipe cap
    ctx.fillStyle = colors.pipeCap;
    ctx.fillRect(
      pipe.x - capOverhang,
      bottomY,
      pipe.width + capOverhang * 2,
      capHeight,
    );

    // Bottom pipe highlights
    ctx.fillStyle = colors.pipeHighlight;
    ctx.fillRect(
      pipe.x + 4,
      bottomY + capHeight,
      6,
      CANVAS_HEIGHT - bottomY - capHeight - GROUND_HEIGHT,
    );

    ctx.fillStyle = colors.pipeDark;
    ctx.fillRect(
      pipe.x + pipe.width - 8,
      bottomY + capHeight,
      8,
      CANVAS_HEIGHT - bottomY - capHeight - GROUND_HEIGHT,
    );
  }

  // ==================== COLLISION DETECTION ====================
  function checkCollisions() {
    if (currentState !== GameState.PLAYING) return false;

    // Ground collision
    if (bird.y + bird.height >= CANVAS_HEIGHT - GROUND_HEIGHT) {
      return true;
    }

    // Ceiling collision
    if (bird.y <= 0) {
      return true;
    }

    // Pipe collisions with padding for fairness
    const birdLeft = bird.x + HITBOX_PADDING;
    const birdRight = bird.x + bird.width - HITBOX_PADDING;
    const birdTop = bird.y + HITBOX_PADDING;
    const birdBottom = bird.y + bird.height - HITBOX_PADDING;

    for (const pipe of pipes) {
      const pipeLeft = pipe.x;
      const pipeRight = pipe.x + pipe.width;

      // Check horizontal overlap
      if (birdRight > pipeLeft && birdLeft < pipeRight) {
        // Check top pipe collision
        if (birdTop < pipe.gapY) {
          return true;
        }
        // Check bottom pipe collision
        if (birdBottom > pipe.gapY + pipe.gapHeight) {
          return true;
        }
      }
    }

    return false;
  }

  // ==================== BACKGROUND RENDERING ====================
  function drawBackground() {
    // Sky gradient
    const skyGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    skyGradient.addColorStop(0, colors.skyTop);
    skyGradient.addColorStop(0.5, colors.skyMid);
    skyGradient.addColorStop(1, colors.skyBottom);
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Sun/Moon
    ctx.fillStyle = colors.sunGlow;
    ctx.beginPath();
    ctx.arc(320, 100, 60, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors.sun;
    ctx.beginPath();
    ctx.arc(320, 100, 35, 0, Math.PI * 2);
    ctx.fill();

    // Stars (small dots)
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    for (let i = 0; i < 30; i++) {
      const starX = (i * 137) % CANVAS_WIDTH;
      const starY = (i * 97) % (CANVAS_HEIGHT / 2);
      const size = (i % 3) + 1;
      ctx.beginPath();
      ctx.arc(starX, starY, size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Parallax mountains
    drawMountains();
  }

  function drawMountains() {
    // Far mountains (slowest)
    ctx.fillStyle = colors.mountain;
    const mountainOffset = backgroundLayers.mountains.offset;

    for (let i = -1; i < 3; i++) {
      const x = i * 200 + mountainOffset;
      ctx.beginPath();
      ctx.moveTo(x, CANVAS_HEIGHT - GROUND_HEIGHT);
      ctx.lineTo(x + 100, CANVAS_HEIGHT - GROUND_HEIGHT - 150);
      ctx.lineTo(x + 200, CANVAS_HEIGHT - GROUND_HEIGHT);
      ctx.closePath();
      ctx.fill();
    }

    // Near hills (medium speed)
    ctx.fillStyle = colors.hill;
    const hillOffset = backgroundLayers.hills.offset;

    for (let i = -1; i < 4; i++) {
      const x = i * 150 + hillOffset;
      ctx.beginPath();
      ctx.moveTo(x, CANVAS_HEIGHT - GROUND_HEIGHT);
      ctx.quadraticCurveTo(
        x + 75,
        CANVAS_HEIGHT - GROUND_HEIGHT - 80,
        x + 150,
        CANVAS_HEIGHT - GROUND_HEIGHT,
      );
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawGround() {
    // Main ground
    const groundGradient = ctx.createLinearGradient(
      0,
      CANVAS_HEIGHT - GROUND_HEIGHT,
      0,
      CANVAS_HEIGHT,
    );
    groundGradient.addColorStop(0, colors.ground);
    groundGradient.addColorStop(1, colors.groundDark);
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, CANVAS_HEIGHT - GROUND_HEIGHT, CANVAS_WIDTH, GROUND_HEIGHT);

    // Ground line decoration
    ctx.fillStyle = colors.groundLine;
    const lineY = CANVAS_HEIGHT - GROUND_HEIGHT;
    ctx.fillRect(0, lineY, CANVAS_WIDTH, 4);

    // Scrolling ground pattern
    ctx.fillStyle = colors.groundDark;
    for (let i = -1; i < 15; i++) {
      const x = ((i * 30 + groundOffset) % (CANVAS_WIDTH + 30)) - 30;
      ctx.fillRect(x, lineY + 10, 20, 3);
      ctx.fillRect(x + 15, lineY + 25, 20, 3);
    }
  }

  function updateBackground() {
    if (currentState !== GameState.PLAYING) return;

    groundOffset = (groundOffset + PIPE_SPEED) % 30;
    backgroundLayers.mountains.offset =
      (backgroundLayers.mountains.offset +
        PIPE_SPEED * backgroundLayers.mountains.speed) %
      200;
    backgroundLayers.hills.offset =
      (backgroundLayers.hills.offset +
        PIPE_SPEED * backgroundLayers.hills.speed) %
      150;
  }

  // ==================== SCORE RENDERING ====================
  function drawScore() {
    if (currentState !== GameState.PLAYING) return;

    ctx.save();
    ctx.font = "900 64px Outfit";
    ctx.textAlign = "center";

    // Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.fillText(score.toString(), CANVAS_WIDTH / 2 + 3, 73);

    // Main text
    ctx.fillStyle = "#ffffff";
    ctx.fillText(score.toString(), CANVAS_WIDTH / 2, 70);

    ctx.restore();
  }

  // ==================== GAME STATE MANAGEMENT ====================
  function startGame() {
    currentState = GameState.PLAYING;
    score = 0;
    pipes = [];
    lastPipeSpawn = Date.now();
    resetBird();

    startOverlay.classList.add("hidden");
    gameOverOverlay.classList.add("hidden");
  }

  function endGame() {
    currentState = GameState.GAME_OVER;

    // Update high score
    if (score > highScorePersistent) {
      highScorePersistent = score;
      localStorage.setItem("flappyHighScore", highScorePersistent.toString());
    }

    finalScoreEl.textContent = score;
    highScoreEl.textContent = highScorePersistent;

    gameOverOverlay.classList.remove("hidden");
  }

  function resetGame() {
    currentState = GameState.IDLE;
    score = 0;
    pipes = [];
    resetBird();
    groundOffset = 0;
    backgroundLayers.mountains.offset = 0;
    backgroundLayers.hills.offset = 0;

    gameOverOverlay.classList.add("hidden");
    startOverlay.classList.remove("hidden");
  }

  // ==================== MAIN GAME LOOP ====================
  function gameLoop() {
    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw background
    drawBackground();

    // Update and draw pipes
    updatePipes();
    pipes.forEach(drawPipe);

    // Update and draw ground
    updateBackground();
    drawGround();

    // Update and draw bird
    updateBird();
    drawBird();

    // Check collisions
    if (checkCollisions()) {
      endGame();
    }

    // Draw score
    drawScore();

    animationFrameId = requestAnimationFrame(gameLoop);
  }

  // ==================== INPUT HANDLING ====================
  function handleInput(e) {
    if (e.type === "keydown" && e.code !== "Space") return;
    if (e.type === "keydown") e.preventDefault();
    if (e.type === "touchstart") e.preventDefault();

    if (currentState === GameState.IDLE) {
      startGame();
    } else if (currentState === GameState.PLAYING) {
      flapBird();
    }
  }

  // Keyboard input
  document.addEventListener("keydown", handleInput);

  // Mouse input
  canvas.addEventListener("click", handleInput);

  // Touch input
  canvas.addEventListener("touchstart", handleInput, { passive: false });

  // Button handlers
  startBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    startGame();
  });

  restartBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    startGame();
  });

  // Prevent double-tap zoom on mobile
  document.addEventListener(
    "touchend",
    (e) => {
      if (e.target.closest(".game-btn")) {
        e.preventDefault();
      }
    },
    { passive: false },
  );

  // ==================== INITIALIZATION ====================
  function init() {
    // Set initial high score display
    highScoreEl.textContent = highScorePersistent;

    // Start the game loop
    gameLoop();
  }

  // Start the game
  init();
})();
