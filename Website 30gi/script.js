const daysEl = document.getElementById("days");
const hoursEl = document.getElementById("hours");
const minutesEl = document.getElementById("minutes");
const secondsEl = document.getElementById("seconds");
const messageEl = document.getElementById("countdown-message");

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
