const daysEl = document.getElementById("days");
const hoursEl = document.getElementById("hours");
const minutesEl = document.getElementById("minutes");
const secondsEl = document.getElementById("seconds");
const messageEl = document.getElementById("countdown-message");

if (daysEl && hoursEl && minutesEl && secondsEl && messageEl) {
  const eventDate = new Date("2026-05-14T12:00:00+02:00");

  function renderCountdown() {
    const current = new Date();
    const diffMs = eventDate.getTime() - current.getTime();

    if (diffMs <= 0) {
      daysEl.textContent = "0";
      hoursEl.textContent = "0";
      minutesEl.textContent = "0";
      secondsEl.textContent = "0";
      messageEl.textContent = "Heute ist es so weit. Bis gleich an der Boccia Bahn!";
      return;
    }

    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    daysEl.textContent = String(days);
    hoursEl.textContent = String(hours).padStart(2, "0");
    minutesEl.textContent = String(minutes).padStart(2, "0");
    secondsEl.textContent = String(seconds).padStart(2, "0");
    messageEl.textContent = "Countdown bis zum Treffpunkt um 12:00 Uhr.";
  }

  renderCountdown();
  setInterval(renderCountdown, 1000);
}

(() => {
  const canvas = document.getElementById("boccia-canvas");
  const angleInput = document.getElementById("boccia-angle");
  const powerInput = document.getElementById("boccia-power");
  const angleValue = document.getElementById("boccia-angle-value");
  const powerValue = document.getElementById("boccia-power-value");
  const throwBtn = document.getElementById("boccia-throw-btn");
  const nextRoundBtn = document.getElementById("boccia-next-round-btn");
  const resetBtn = document.getElementById("boccia-reset-btn");
  const statusEl = document.getElementById("boccia-status");
  const roundEl = document.getElementById("boccia-round");
  const scorePlayerEl = document.getElementById("boccia-score-player");
  const scoreCpuEl = document.getElementById("boccia-score-cpu");

  if (
    !canvas ||
    !angleInput ||
    !powerInput ||
    !angleValue ||
    !powerValue ||
    !throwBtn ||
    !nextRoundBtn ||
    !resetBtn ||
    !statusEl ||
    !roundEl ||
    !scorePlayerEl ||
    !scoreCpuEl
  ) {
    return;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  const config = {
    maxBallsPerSide: 4,
    startX: 76,
    ballRadius: 12,
    jackRadius: 7,
    lanePaddingX: 38,
    lanePaddingY: 46,
    friction: 0.985,
    jackFriction: 0.983,
    minSpeed: 0.08,
  };

  const state = {
    round: 1,
    score: {
      player: 0,
      cpu: 0,
    },
    thrown: {
      player: 0,
      cpu: 0,
    },
    turn: "player",
    balls: [],
    jack: { x: 0, y: 0, vx: 0, vy: 0, moving: false },
    roundDone: false,
    wasMoving: false,
    cpuTimeout: null,
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function randomRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function getLane() {
    return {
      x1: config.lanePaddingX,
      x2: canvas.width - config.lanePaddingX,
      y1: config.lanePaddingY,
      y2: canvas.height - config.lanePaddingY,
      cy: canvas.height / 2,
    };
  }

  function setStatus(text) {
    statusEl.textContent = text;
  }

  function isMoving() {
    return state.jack.moving || state.balls.some((ball) => ball.moving);
  }

  function updateOutputs() {
    angleValue.textContent = `${angleInput.value} deg`;
    powerValue.textContent = `${powerInput.value}%`;
  }

  function updateScoreboard() {
    roundEl.textContent = String(state.round);
    scorePlayerEl.textContent = String(state.score.player);
    scoreCpuEl.textContent = String(state.score.cpu);
  }

  function updateControls() {
    const movingNow = isMoving();
    const playerCanThrow =
      state.turn === "player" &&
      !movingNow &&
      !state.roundDone &&
      state.thrown.player < config.maxBallsPerSide;

    throwBtn.disabled = !playerCanThrow;
    angleInput.disabled = !playerCanThrow;
    powerInput.disabled = !playerCanThrow;
  }

  function clearCpuTimeout() {
    if (state.cpuTimeout) {
      clearTimeout(state.cpuTimeout);
      state.cpuTimeout = null;
    }
  }

  function resetRoundState() {
    clearCpuTimeout();
    state.balls = [];
    state.thrown.player = 0;
    state.thrown.cpu = 0;
    state.turn = "player";
    state.roundDone = false;
    state.wasMoving = false;
    nextRoundBtn.hidden = true;

    const lane = getLane();
    state.jack.x = randomRange(
      lane.x1 + (lane.x2 - lane.x1) * 0.56,
      lane.x2 - 44
    );
    state.jack.y = randomRange(lane.y1 + 26, lane.y2 - 26);
    state.jack.vx = 0;
    state.jack.vy = 0;
    state.jack.moving = false;

    setStatus("Du bist dran. Winkel und Kraft einstellen, dann werfen.");
    updateControls();
  }

  function startNewGame() {
    state.round = 1;
    state.score.player = 0;
    state.score.cpu = 0;
    updateScoreboard();
    resetRoundState();
  }

  function startNextRound() {
    state.round += 1;
    updateScoreboard();
    resetRoundState();
  }

  function createBall(team, angleDeg, powerPercent) {
    const lane = getLane();
    const angleRad = (angleDeg * Math.PI) / 180;
    const speed = 2.1 + (powerPercent / 100) * 5.6;

    return {
      team,
      x: config.startX,
      y: lane.cy,
      vx: Math.cos(angleRad) * speed,
      vy: Math.sin(angleRad) * speed,
      r: config.ballRadius,
      moving: true,
    };
  }

  function playerThrow() {
    if (throwBtn.disabled) {
      return;
    }

    const angle = Number(angleInput.value);
    const power = Number(powerInput.value);

    state.balls.push(createBall("player", angle, power));
    state.thrown.player += 1;
    state.turn = "cpu";

    setStatus(
      `Du hast Kugel ${state.thrown.player}/${config.maxBallsPerSide} geworfen.`
    );
    updateControls();
  }

  function cpuThrow() {
    if (state.roundDone || state.thrown.cpu >= config.maxBallsPerSide) {
      return;
    }

    const lane = getLane();
    const targetAngle =
      (Math.atan2(state.jack.y - lane.cy, state.jack.x - config.startX) * 180) /
      Math.PI;
    const angle = clamp(targetAngle + randomRange(-8, 8), -27, 27);

    const distance = Math.hypot(state.jack.x - config.startX, state.jack.y - lane.cy);
    const laneLength = lane.x2 - config.startX;
    const basePower = clamp((distance / laneLength) * 120, 36, 100);
    const power = clamp(basePower + randomRange(-18, 12), 35, 100);

    state.balls.push(createBall("cpu", angle, power));
    state.thrown.cpu += 1;
    state.turn = "player";

    setStatus(
      `Computer wirft Kugel ${state.thrown.cpu}/${config.maxBallsPerSide}.`
    );
    updateControls();
  }

  function scheduleCpuThrow() {
    clearCpuTimeout();
    state.cpuTimeout = setTimeout(() => {
      cpuThrow();
      state.cpuTimeout = null;
    }, 700);
  }

  function finishRound() {
    state.roundDone = true;
    clearCpuTimeout();

    const result = state.balls
      .map((ball) => ({
        team: ball.team,
        distance: Math.hypot(ball.x - state.jack.x, ball.y - state.jack.y),
      }))
      .sort((a, b) => a.distance - b.distance);

    if (result.length === 0) {
      setStatus("Keine Kugeln auf dem Feld. Naechste Runde starten.");
      nextRoundBtn.hidden = false;
      updateControls();
      return;
    }

    const winner = result[0].team;
    let points = 0;
    for (const item of result) {
      if (item.team !== winner) {
        break;
      }
      points += 1;
    }

    state.score[winner] += points;
    updateScoreboard();

    const winnerLabel = winner === "player" ? "Du" : "Computer";
    const plural = points === 1 ? "Punkt" : "Punkte";
    setStatus(`Runde ${state.round}: ${winnerLabel} holt ${points} ${plural}.`);
    nextRoundBtn.hidden = false;
    updateControls();
  }

  function handleAllBallsStopped() {
    if (state.roundDone) {
      updateControls();
      return;
    }

    if (
      state.thrown.player >= config.maxBallsPerSide &&
      state.thrown.cpu >= config.maxBallsPerSide
    ) {
      finishRound();
      return;
    }

    if (state.turn === "cpu") {
      if (state.thrown.cpu < config.maxBallsPerSide) {
        setStatus("Computer zielt...");
        scheduleCpuThrow();
      } else {
        state.turn = "player";
        setStatus("Du bist wieder dran.");
      }
    } else if (state.thrown.player >= config.maxBallsPerSide) {
      if (state.thrown.cpu < config.maxBallsPerSide) {
        state.turn = "cpu";
        setStatus("Computer ist wieder dran...");
        scheduleCpuThrow();
      }
    } else {
      setStatus("Du bist dran.");
    }

    updateControls();
  }

  function resolveCollisions() {
    for (let i = 0; i < state.balls.length; i += 1) {
      for (let j = i + 1; j < state.balls.length; j += 1) {
        const a = state.balls[i];
        const b = state.balls[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distance = Math.hypot(dx, dy);
        const minDistance = a.r + b.r;

        if (distance <= 0 || distance >= minDistance) {
          continue;
        }

        const nx = dx / distance;
        const ny = dy / distance;
        const overlap = minDistance - distance;

        a.x -= nx * overlap * 0.5;
        a.y -= ny * overlap * 0.5;
        b.x += nx * overlap * 0.5;
        b.y += ny * overlap * 0.5;

        const relativeVelocityX = b.vx - a.vx;
        const relativeVelocityY = b.vy - a.vy;
        const impactSpeed = relativeVelocityX * nx + relativeVelocityY * ny;
        if (impactSpeed > 0) {
          continue;
        }

        const bounce = 0.78;
        const impulse = (-(1 + bounce) * impactSpeed) / 2;
        const impulseX = impulse * nx;
        const impulseY = impulse * ny;

        a.vx -= impulseX;
        a.vy -= impulseY;
        b.vx += impulseX;
        b.vy += impulseY;

        a.moving = true;
        b.moving = true;
      }
    }

    const jackMass = 0.58;
    const ballMass = 1;
    const totalMass = jackMass + ballMass;
    for (const ball of state.balls) {
      const dx = state.jack.x - ball.x;
      const dy = state.jack.y - ball.y;
      const distance = Math.hypot(dx, dy);
      const minDistance = ball.r + config.jackRadius;

      if (distance >= minDistance) {
        continue;
      }

      const nx = distance === 0 ? 1 : dx / distance;
      const ny = distance === 0 ? 0 : dy / distance;
      const overlap = minDistance - distance;

      // Lighter jack gets displaced more than a normal ball.
      ball.x -= nx * overlap * (jackMass / totalMass);
      ball.y -= ny * overlap * (jackMass / totalMass);
      state.jack.x += nx * overlap * (ballMass / totalMass);
      state.jack.y += ny * overlap * (ballMass / totalMass);

      const relativeVelocityX = state.jack.vx - ball.vx;
      const relativeVelocityY = state.jack.vy - ball.vy;
      const impactSpeed = relativeVelocityX * nx + relativeVelocityY * ny;
      if (impactSpeed >= 0) {
        continue;
      }

      const bounce = 0.76;
      const impulse =
        (-(1 + bounce) * impactSpeed) / (1 / ballMass + 1 / jackMass);
      const impulseX = impulse * nx;
      const impulseY = impulse * ny;

      ball.vx -= impulseX / ballMass;
      ball.vy -= impulseY / ballMass;
      state.jack.vx += impulseX / jackMass;
      state.jack.vy += impulseY / jackMass;

      ball.moving = true;
      state.jack.moving = true;
    }
  }

  function updatePhysics() {
    const lane = getLane();

    for (const ball of state.balls) {
      if (!ball.moving) {
        continue;
      }

      ball.x += ball.vx;
      ball.y += ball.vy;
      ball.vx *= config.friction;
      ball.vy *= config.friction;

      if (ball.y - ball.r < lane.y1) {
        ball.y = lane.y1 + ball.r;
        ball.vy *= -0.52;
      }
      if (ball.y + ball.r > lane.y2) {
        ball.y = lane.y2 - ball.r;
        ball.vy *= -0.52;
      }
      if (ball.x + ball.r > lane.x2) {
        ball.x = lane.x2 - ball.r;
        ball.vx *= -0.36;
      }
      if (ball.x - ball.r < lane.x1) {
        ball.x = lane.x1 + ball.r;
        ball.vx *= -0.36;
      }
    }

    if (state.jack.moving) {
      state.jack.x += state.jack.vx;
      state.jack.y += state.jack.vy;
      state.jack.vx *= config.jackFriction;
      state.jack.vy *= config.jackFriction;

      if (state.jack.y - config.jackRadius < lane.y1) {
        state.jack.y = lane.y1 + config.jackRadius;
        state.jack.vy *= -0.48;
      }
      if (state.jack.y + config.jackRadius > lane.y2) {
        state.jack.y = lane.y2 - config.jackRadius;
        state.jack.vy *= -0.48;
      }
      if (state.jack.x + config.jackRadius > lane.x2) {
        state.jack.x = lane.x2 - config.jackRadius;
        state.jack.vx *= -0.32;
      }
      if (state.jack.x - config.jackRadius < lane.x1) {
        state.jack.x = lane.x1 + config.jackRadius;
        state.jack.vx *= -0.32;
      }
    }

    resolveCollisions();

    for (const ball of state.balls) {
      if (!ball.moving) {
        continue;
      }

      const speed = Math.hypot(ball.vx, ball.vy);
      if (speed < config.minSpeed) {
        ball.vx = 0;
        ball.vy = 0;
        ball.moving = false;
      }
    }

    const jackSpeed = Math.hypot(state.jack.vx, state.jack.vy);
    if (jackSpeed < config.minSpeed) {
      state.jack.vx = 0;
      state.jack.vy = 0;
      state.jack.moving = false;
    } else {
      state.jack.moving = true;
    }

    const movingNow = isMoving();
    if (state.wasMoving && !movingNow) {
      handleAllBallsStopped();
    }
    state.wasMoving = movingNow;
  }

  function drawBall(x, y, radius, fillColor, strokeColor) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = strokeColor;
    ctx.stroke();
  }

  function drawScene() {
    const lane = getLane();
    const laneWidth = lane.x2 - lane.x1;
    const laneHeight = lane.y2 - lane.y1;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#6a8750";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#dcc18d";
    ctx.fillRect(lane.x1, lane.y1, laneWidth, laneHeight);

    ctx.strokeStyle = "rgba(57, 49, 38, 0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(lane.x1, lane.y1, laneWidth, laneHeight);

    ctx.setLineDash([6, 8]);
    ctx.strokeStyle = "rgba(68, 58, 40, 0.4)";
    ctx.beginPath();
    ctx.moveTo(config.startX + 14, lane.y1);
    ctx.lineTo(config.startX + 14, lane.y2);
    ctx.stroke();
    ctx.setLineDash([]);

    if (state.turn === "player" && !state.roundDone && !isMoving()) {
      const angleRad = (Number(angleInput.value) * Math.PI) / 180;
      const power = Number(powerInput.value);
      const guideLength = 60 + power * 1.2;

      ctx.beginPath();
      ctx.moveTo(config.startX, lane.cy);
      ctx.lineTo(
        config.startX + Math.cos(angleRad) * guideLength,
        lane.cy + Math.sin(angleRad) * guideLength
      );
      ctx.strokeStyle = "rgba(15, 118, 110, 0.55)";
      ctx.lineWidth = 4;
      ctx.stroke();
    }

    drawBall(
      state.jack.x,
      state.jack.y,
      config.jackRadius,
      "#f8fafc",
      "rgba(30, 41, 59, 0.75)"
    );

    for (const ball of state.balls) {
      if (ball.team === "player") {
        drawBall(ball.x, ball.y, ball.r, "#0f766e", "#0b4f4a");
      } else {
        drawBall(ball.x, ball.y, ball.r, "#c2410c", "#7c2d12");
      }
    }
  }

  function tick() {
    updatePhysics();
    drawScene();
    requestAnimationFrame(tick);
  }

  angleInput.addEventListener("input", updateOutputs);
  powerInput.addEventListener("input", updateOutputs);
  throwBtn.addEventListener("click", playerThrow);
  nextRoundBtn.addEventListener("click", startNextRound);
  resetBtn.addEventListener("click", startNewGame);

  updateOutputs();
  startNewGame();
  tick();
})();
