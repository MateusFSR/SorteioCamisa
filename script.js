const numbersScreen = document.getElementById("numbers-screen");
const drawScreen = document.getElementById("draw-screen");
const goToDrawButton = document.getElementById("go-to-draw-button");
const backButton = document.getElementById("back-button");
const drawButton = document.getElementById("draw-button");
const overviewButton = document.getElementById("overview-button");
const resetButton = document.getElementById("reset-button");
const numbersGrid = document.getElementById("numbers-grid");
const participantsList = document.getElementById("participants-list");
const participantsEmpty = document.getElementById("participants-empty");
const availableCount = document.getElementById("available-count");
const reservedCount = document.getElementById("reserved-count");
const wheel = document.getElementById("wheel");
const rouletteDisplay = document.getElementById("roulette-display");
const resultText = document.getElementById("result-text");
const winnerHighlight = document.getElementById("winner-highlight");
const winnerName = document.getElementById("winner-name");
const winnerNumber = document.getElementById("winner-number");
const toastNotification = document.getElementById("toast-notification");
const confirmModal = document.getElementById("confirm-modal");
const confirmModalCancel = document.getElementById("confirm-modal-cancel");
const confirmModalConfirm = document.getElementById("confirm-modal-confirm");
const buyerModal = document.getElementById("buyer-modal");
const buyerModalDescription = document.getElementById("buyer-modal-description");
const buyerForm = document.getElementById("buyer-form");
const buyerNameInput = document.getElementById("buyer-name-input");
const buyerCancelButton = document.getElementById("buyer-cancel-button");
const winnerModal = document.getElementById("winner-modal");
const winnerModalName = document.getElementById("winner-modal-name");
const winnerModalNumber = document.getElementById("winner-modal-number");
const winnerModalClose = document.getElementById("winner-modal-close");

const participants = [];
let isDrawing = false;
let autoSaveTimeoutId = null;
let toastTimeoutId = null;
let syncPollingIntervalId = null;
let lastSyncTimestamp = null;
let drawingTimeouts = [];
let pendingNumberSelection = null;
let currentWheelRotation = 0;
let isOverviewMode = false;
const remoteSync = window.REMOTE_SYNC || {};

function isSupabaseConfigured() {
  const provider = String(remoteSync.provider || "").trim().toLowerCase();
  const supabaseUrl = String(remoteSync.supabaseUrl || "").trim();
  const supabaseAnonKey = String(remoteSync.supabaseAnonKey || "").trim();
  const supabaseTable = String(remoteSync.supabaseTable || "").trim();
  return provider === "supabase" && !!supabaseUrl && !!supabaseAnonKey && !!supabaseTable;
}

function getSupabaseRestEndpoint() {
  if (!isSupabaseConfigured()) {
    return "";
  }

  const baseUrl = String(remoteSync.supabaseUrl || "").trim().replace(/\/+$/, "");
  const table = encodeURIComponent(String(remoteSync.supabaseTable || "").trim());
  return `${baseUrl}/rest/v1/${table}`;
}

function getSupabaseHeaders(extra = {}) {
  const anonKey = String(remoteSync.supabaseAnonKey || "").trim();
  return {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

function getSupabaseUserId() {
  return String(remoteSync.supabaseUserId || "default").trim();
}

function getSupabaseUserRecordEndpoint() {
  const endpoint = getSupabaseRestEndpoint();
  if (!endpoint) return "";
  return `${endpoint}?select=data_json,updated_at&user_id=eq.${encodeURIComponent(getSupabaseUserId())}`;
}

function getSupabaseUpsertEndpoint() {
  const endpoint = getSupabaseRestEndpoint();
  if (!endpoint) return "";
  return `${endpoint}?on_conflict=user_id`;
}

function getSupabasePayload() {
  return {
    user_id: getSupabaseUserId(),
    data_json: {
      participants: participants.map((participant) => ({
        name: participant.name,
        number: participant.number,
      })),
    },
    updated_at: Date.now(),
  };
}

function setCloudStatus(message) {
  if (!toastNotification) return;

  toastNotification.textContent = `☁️ ${message}`;
  toastNotification.classList.add("visible");

  if (toastTimeoutId) clearTimeout(toastTimeoutId);
  toastTimeoutId = setTimeout(() => {
    toastNotification.classList.remove("visible");
    toastTimeoutId = null;
  }, 2600);
}

function queueAutoCloudSave() {
  if (!isSupabaseConfigured()) return;

  if (autoSaveTimeoutId) clearTimeout(autoSaveTimeoutId);
  autoSaveTimeoutId = setTimeout(() => {
    saveParticipantsToCloud();
    autoSaveTimeoutId = null;
  }, 900);
}

function sanitizeParticipants(items) {
  if (!Array.isArray(items)) return [];

  const seenNumbers = new Set();
  return items
    .map((item) => ({
      name: String(item.name || "").trim(),
      number: Number(item.number),
    }))
    .filter((item) => {
      const isValidName = item.name.length > 0;
      const isValidNumber = Number.isInteger(item.number) && item.number >= 1 && item.number <= 100;
      const isUniqueNumber = !seenNumbers.has(item.number);

      if (isValidName && isValidNumber && isUniqueNumber) {
        seenNumbers.add(item.number);
        return true;
      }

      return false;
    });
}

async function saveParticipantsToCloud() {
  const endpoint = getSupabaseUpsertEndpoint();
  if (!endpoint) {
    setCloudStatus("não configurado.");
    return;
  }

  try {
    setCloudStatus("salvando no Supabase...");
    const payload = getSupabasePayload();
    const response = await fetch(endpoint, {
      method: "POST",
      headers: getSupabaseHeaders({
        Prefer: "resolution=merge-duplicates,return=minimal",
      }),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro ao salvar no Supabase:", response.status, errorText);
      setCloudStatus("erro ao salvar no Supabase.");
      return;
    }

    lastSyncTimestamp = JSON.stringify(payload.data_json.participants);
    setCloudStatus(payload.data_json.participants.length === 0 ? "lista limpa no Supabase." : "salvo no Supabase.");
  } catch (error) {
    console.error("Erro ao sincronizar:", error);
    setCloudStatus("erro ao sincronizar com Supabase.");
  }
}

async function loadParticipantsFromCloud(showFeedback = true) {
  const endpoint = getSupabaseUserRecordEndpoint();
  if (!endpoint) {
    if (showFeedback) setCloudStatus("não configurado.");
    return false;
  }

  try {
    if (showFeedback) setCloudStatus("carregando do Supabase...");
    const response = await fetch(endpoint, {
      method: "GET",
      headers: getSupabaseHeaders(),
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("Falha ao carregar do Supabase - status", response.status, body);
      throw new Error("Falha ao carregar do Supabase.");
    }

    const rows = await response.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      if (showFeedback) setCloudStatus("sem participantes no Supabase.");
      return false;
    }

    const row = rows[0];
    const rawData = row?.data_json;
    const rawParticipants = Array.isArray(rawData?.participants)
      ? rawData.participants
      : Array.isArray(rawData)
      ? rawData
      : [];
    const sanitized = sanitizeParticipants(rawParticipants);
    const incomingStr = JSON.stringify(sanitized);

    participants.length = 0;
    participants.push(...sanitized);
    renderAll();
    rouletteDisplay.textContent = "Aguardando início...";
    resultText.textContent = sanitized.length === 0
      ? "Quando quiser, toque em GIRAR ROLETA para começar."
      : "Participantes carregados da nuvem. Tudo pronto para sortear.";
    hideWinnerHighlight();
    lastSyncTimestamp = incomingStr;

    if (showFeedback) {
      setCloudStatus(sanitized.length === 0 ? "sem participantes no Supabase." : "carregado do Supabase.");
    }

    return sanitized.length > 0;
  } catch (error) {
    console.error("Erro ao carregar:", error);
    if (showFeedback) setCloudStatus("erro ao carregar do Supabase.");
    return false;
  }
}

async function syncFromCloudIfChanged() {
  if (!isSupabaseConfigured()) return;

  const endpoint = getSupabaseUserRecordEndpoint();
  if (!endpoint) return;

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: getSupabaseHeaders(),
      cache: "no-store",
    });

    if (!response.ok) return;

    const rows = await response.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      lastSyncTimestamp = null;
      return;
    }

    const rawData = rows[0]?.data_json;
    const sanitized = sanitizeParticipants(
      Array.isArray(rawData?.participants)
        ? rawData.participants
        : Array.isArray(rawData)
        ? rawData
        : []
    );
    const incomingStr = JSON.stringify(sanitized);

    if (lastSyncTimestamp === null || incomingStr !== lastSyncTimestamp) {
      lastSyncTimestamp = incomingStr;
      const currentStr = JSON.stringify(participants.map((participant) => ({
        name: participant.name,
        number: participant.number,
      })));

      if (currentStr !== incomingStr) {
        participants.length = 0;
        participants.push(...sanitized);
        renderAll();
        if (!isDrawing) {
          rouletteDisplay.textContent = "Lista atualizada";
          resultText.textContent = sanitized.length === 0
            ? "A lista foi sincronizada e está vazia."
            : "Lista sincronizada com a nuvem.";
          hideWinnerHighlight();
        }
      }
    }
  } catch (error) {
    console.debug("Erro ao sincronizar:", error);
  }
}

function startSyncPolling() {
  if (!isSupabaseConfigured() || syncPollingIntervalId !== null) return;

  syncPollingIntervalId = setInterval(() => {
    syncFromCloudIfChanged();
  }, 3000);
}

function stopSyncPolling() {
  if (syncPollingIntervalId !== null) {
    clearInterval(syncPollingIntervalId);
    syncPollingIntervalId = null;
  }
}

function sortParticipants() {
  participants.sort((first, second) => first.number - second.number);
}

function getParticipantByNumber(number) {
  return participants.find((participant) => participant.number === number) || null;
}

function updateStats() {
  const reserved = participants.length;
  const available = 100 - reserved;
  availableCount.textContent = String(available);
  reservedCount.textContent = String(reserved);

  if (overviewButton) {
    overviewButton.textContent = String(available);
  }
}

function renderNumbersGrid() {
  numbersGrid.innerHTML = "";

  for (let number = 1; number <= 100; number += 1) {
    const participant = getParticipantByNumber(number);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `number-card ${participant ? "reserved" : "available"}`;
    button.dataset.number = String(number);
    button.innerHTML = `
      <span class="number-value">${number}</span>
      <span class="number-status">${participant ? "Reservado" : "Disponível"}</span>
      <span class="number-owner">${participant ? participant.name : "Toque para registrar"}</span>
    `;

    button.addEventListener("click", () => handleNumberSelection(number, button));
    button.addEventListener("pointerdown", () => {
      button.classList.add("is-pressed");
    });
    button.addEventListener("pointerup", () => {
      button.classList.remove("is-pressed");
    });
    button.addEventListener("pointerleave", () => {
      button.classList.remove("is-pressed");
    });

    numbersGrid.appendChild(button);
  }
}

function renderParticipantsList() {
  participantsList.innerHTML = "";
  sortParticipants();

  if (participants.length === 0) {
    participantsEmpty.classList.remove("hidden");
    return;
  }

  participantsEmpty.classList.add("hidden");

  participants.forEach((participant) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <span class="participant-name">${participant.name}</span>
      <span class="participant-number">Nº ${participant.number}</span>
    `;
    participantsList.appendChild(item);
  });
}

function buildWheel() {
  if (!wheel) return;

  wheel.innerHTML = "";
  wheel.style.transform = `rotate(${currentWheelRotation}deg)`;

  if (participants.length === 0) {
    wheel.style.background =
      "radial-gradient(circle at center, rgba(255, 255, 255, 0.18) 0 9%, transparent 10%), #12203d";
    return;
  }

  const angleStep = 360 / participants.length;
  const colors = ["#1f8fff", "#34f5c5", "#8f7bff", "#ff7a7a", "#ffd166", "#5eead4"];
  const gradientStops = participants.map((_, index) => {
    const start = index * angleStep;
    const end = (index + 1) * angleStep;
    return `${colors[index % colors.length]} ${start}deg ${end}deg`;
  });

  wheel.style.background = `
    radial-gradient(circle at center, rgba(255, 255, 255, 0.18) 0 9%, transparent 10%),
    conic-gradient(${gradientStops.join(", ")})
  `;

  participants.forEach((participant, index) => {
    const label = document.createElement("span");
    const angle = index * angleStep + angleStep / 2;
    const radius = participants.length > 18 ? 102 : 112;
    label.className = "wheel-label";
    label.textContent = `${participant.number}`;
    label.style.transform = `translate(-50%, -50%) rotate(${angle}deg) translateY(-${radius}px) rotate(${-angle}deg)`;
    wheel.appendChild(label);
  });
}

function renderAll() {
  updateStats();
  renderNumbersGrid();
  renderParticipantsList();
  buildWheel();
}

function hideWinnerHighlight() {
  winnerHighlight.classList.add("hidden");
  winnerName.textContent = "-";
  winnerNumber.textContent = "Número -";
}

function showWinnerHighlight(participant) {
  winnerName.textContent = participant.name;
  winnerNumber.textContent = `Número ${participant.number}`;
  winnerHighlight.classList.remove("hidden");
}

function openWinnerModal(participant) {
  winnerModalName.textContent = participant.name;
  winnerModalNumber.textContent = `Número ${participant.number}`;
  winnerModal.classList.remove("hidden");
}

function closeWinnerModal() {
  winnerModal.classList.add("hidden");
}

function openBuyerModal(number, button) {
  pendingNumberSelection = { number, button };
  buyerModalDescription.textContent = `Informe o nome para reservar o número ${number}.`;
  buyerNameInput.value = "";
  buyerModal.classList.remove("hidden");
  setTimeout(() => {
    buyerNameInput.focus();
  }, 0);
}

function closeBuyerModal() {
  buyerModal.classList.add("hidden");
  pendingNumberSelection = null;
  buyerForm.reset();
}

function addParticipant(name, number) {
  participants.push({ name, number });
  renderAll();
  queueAutoCloudSave();
  resultText.textContent = `${name} foi adicionado ao número ${number}.`;
  rouletteDisplay.textContent = "Participante registrado";
  hideWinnerHighlight();
}

function handleNumberSelection(number, button) {
  if (isDrawing) return;

  const existingParticipant = getParticipantByNumber(number);
  if (existingParticipant) {
    alert(`O número ${number} já está reservado para ${existingParticipant.name}.`);
    return;
  }

  openBuyerModal(number, button);
}

function setOverviewMode(enabled) {
  isOverviewMode = enabled;
  document.body.classList.toggle("overview-mode", enabled);

  if (!overviewButton) return;

  overviewButton.setAttribute("aria-pressed", String(enabled));
  overviewButton.title = enabled
    ? "Voltar para o modo normal"
    : "Mostrar todos os números";
}

function showScreen(screenName) {
  const showNumbers = screenName === "numbers";

  if (!showNumbers && isOverviewMode) {
    setOverviewMode(false);
  }

  numbersScreen.classList.toggle("hidden", !showNumbers);
  drawScreen.classList.toggle("hidden", showNumbers);

  if (overviewButton) {
    overviewButton.classList.toggle("hidden", !showNumbers);
  }
}

function clearDrawingTimeouts() {
  drawingTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
  drawingTimeouts = [];
}

function finishDraw(winner) {
  rouletteDisplay.classList.remove("spinning");
  rouletteDisplay.textContent = winner.name;
  resultText.textContent = `Número sorteado: ${winner.number}`;
  showWinnerHighlight(winner);
  openWinnerModal(winner);
  drawButton.disabled = false;
  drawButton.textContent = "GIRAR ROLETA";
  isDrawing = false;
}

function drawWinner() {
  if (participants.length === 0) {
    alert("Cadastre pelo menos um participante antes do sorteio.");
    return;
  }

  if (isDrawing) return;

  hideWinnerHighlight();
  clearDrawingTimeouts();
  isDrawing = true;
  drawButton.disabled = true;
  drawButton.textContent = "SORTEANDO...";
  rouletteDisplay.classList.add("spinning");
  resultText.textContent = "A roleta está girando devagar para criar suspense...";

  const winner = participants[Math.floor(Math.random() * participants.length)];
  const totalSteps = 18;
  let elapsed = 0;
  const winnerIndex = participants.findIndex(
    (participant) => participant.number === winner.number && participant.name === winner.name
  );
  const angleStep = 360 / participants.length;
  const winnerCenter = winnerIndex * angleStep + angleStep / 2;
  const targetRestAngle = (360 - winnerCenter) % 360;
  const normalizedCurrent = ((currentWheelRotation % 360) + 360) % 360;
  const delta = (targetRestAngle - normalizedCurrent + 360) % 360;
  const finalRotation = currentWheelRotation + 5 * 360 + delta;

  wheel.style.transition = "transform 7800ms cubic-bezier(0.12, 0.82, 0.16, 1)";
  wheel.style.transform = `rotate(${finalRotation}deg)`;
  currentWheelRotation = finalRotation;

  for (let step = 0; step < totalSteps; step += 1) {
    const randomParticipant = participants[Math.floor(Math.random() * participants.length)];
    elapsed += 120 + step * 34;
    const timeoutId = setTimeout(() => {
      rouletteDisplay.textContent = randomParticipant.name;
      resultText.textContent = `Número em destaque: ${randomParticipant.number}`;
    }, elapsed);
    drawingTimeouts.push(timeoutId);
  }

  const finalTimeoutId = setTimeout(() => {
    finishDraw(winner);
    drawingTimeouts = [];
  }, 7900);
  drawingTimeouts.push(finalTimeoutId);
}

function openConfirmModal(callback) {
  confirmModal.classList.remove("hidden");
  confirmModalConfirm.onclick = () => {
    confirmModal.classList.add("hidden");
    callback();
  };
  confirmModalCancel.onclick = () => {
    confirmModal.classList.add("hidden");
  };
}

function closeConfirmModal() {
  confirmModal.classList.add("hidden");
}

async function resetAll() {
  clearDrawingTimeouts();
  isDrawing = false;
  drawButton.disabled = false;
  drawButton.textContent = "GIRAR ROLETA";
  participants.length = 0;
  currentWheelRotation = 0;
  if (wheel) {
    wheel.style.transition = "transform 0ms linear";
    wheel.style.transform = "rotate(0deg)";
  }
  renderAll();
  rouletteDisplay.classList.remove("spinning");
  rouletteDisplay.textContent = "Aguardando início...";
  resultText.textContent = "Quando quiser, toque em GIRAR ROLETA para começar.";
  hideWinnerHighlight();
  await saveParticipantsToCloud();
}

goToDrawButton.addEventListener("click", () => {
  showScreen("draw");
});

backButton.addEventListener("click", () => {
  showScreen("numbers");
});

if (overviewButton) {
  overviewButton.addEventListener("click", () => {
    setOverviewMode(!isOverviewMode);
  });
}

drawButton.addEventListener("click", drawWinner);

confirmModal.addEventListener("click", (event) => {
  if (event.target === confirmModal) closeConfirmModal();
});

buyerModal.addEventListener("click", (event) => {
  if (event.target === buyerModal) closeBuyerModal();
});

winnerModal.addEventListener("click", (event) => {
  if (event.target === winnerModal) closeWinnerModal();
});

buyerCancelButton.addEventListener("click", () => {
  closeBuyerModal();
});

winnerModalClose.addEventListener("click", () => {
  closeWinnerModal();
});

buyerForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!pendingNumberSelection) return;

  const { number, button } = pendingNumberSelection;
  const existingParticipant = getParticipantByNumber(number);
  if (existingParticipant) {
    closeBuyerModal();
    alert(`O número ${number} já está reservado para ${existingParticipant.name}.`);
    return;
  }

  const normalizedName = buyerNameInput.value.trim();
  if (!normalizedName) {
    buyerNameInput.focus();
    return;
  }

  addParticipant(normalizedName, number);
  closeBuyerModal();

  if (button) {
    button.classList.add("is-pressed");
    setTimeout(() => button.classList.remove("is-pressed"), 180);
  }
});

resetButton.addEventListener("click", () => {
  if (isDrawing) return;

  openConfirmModal(async () => {
    await resetAll();
  });
});

window.addEventListener("beforeunload", () => {
  stopSyncPolling();
  clearDrawingTimeouts();
  if (autoSaveTimeoutId) {
    clearTimeout(autoSaveTimeoutId);
    autoSaveTimeoutId = null;
    saveParticipantsToCloud();
  }
});

renderAll();
hideWinnerHighlight();
setOverviewMode(false);
showScreen("numbers");

loadParticipantsFromCloud(false).then((loadedFromCloud) => {
  if (loadedFromCloud) {
    console.log("Participantes carregados do Supabase:", participants.length);
  } else {
    console.log("Nenhum participante no Supabase.");
  }
});

startSyncPolling();

if (isSupabaseConfigured()) {
  setCloudStatus("configurado.");
} else {
  setCloudStatus("não configurado. Edite remote-config.js.");
}
