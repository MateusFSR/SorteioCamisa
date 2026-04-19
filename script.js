const form = document.getElementById("entry-form");
const nameInput = document.getElementById("name");
const numberInput = document.getElementById("number");
const participantsList = document.getElementById("participants-list");
const drawButton = document.getElementById("draw-button");
const resetButton = document.getElementById("reset-button");
const resultText = document.getElementById("result-text");
const rouletteDisplay = document.getElementById("roulette-display");
const wheel = document.getElementById("wheel");
const saveCloudButton = document.getElementById("save-cloud-button");
const toastNotification = document.getElementById("toast-notification");
const winnerModal = document.getElementById("winner-modal");
const winnerModalText = document.getElementById("winner-modal-text");
const closeModalButton = document.getElementById("close-modal-button");
const confirmModal = document.getElementById("confirm-modal");
const confirmModalCancel = document.getElementById("confirm-modal-cancel");
const confirmModalConfirm = document.getElementById("confirm-modal-confirm");
const availableNumbersDiv = document.getElementById("available-numbers");

const participants = [];
let isDrawing = false;
let currentRotation = 0;
let autoSaveTimeoutId = null;
let toastTimeoutId = null;
let syncPollingIntervalId = null;
let lastSyncTimestamp = null;
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
      participants: participants.map((p) => ({ name: p.name, number: p.number })),
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
    .map((item) => ({ name: String(item.name || "").trim(), number: Number(item.number) }))
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
    setCloudStatus(
      payload.data_json.participants.length === 0
        ? "lista limpa no Supabase."
        : "salvo no Supabase com sucesso."
    );
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

    if (sanitized.length === 0) {
      lastSyncTimestamp = incomingStr;
      if (showFeedback) setCloudStatus("sem participantes no Supabase.");
      return false;
    }

    participants.length = 0;
    participants.push(...sanitized);
    renderParticipants();
    resultText.textContent = "Participantes carregados do Supabase.";
    rouletteDisplay.textContent = "Aguardando sorteio...";
    lastSyncTimestamp = incomingStr;
    if (showFeedback) setCloudStatus("carregado do Supabase com sucesso.");
    return true;
  } catch (error) {
    console.error("Erro ao carregar:", error);
    if (showFeedback) {
      setCloudStatus("erro ao carregar do Supabase.");
      if (error?.message) {
        console.warn("Verifique se a tabela Supabase está criada e se o anon key tem permissão de leitura.");
      }
    }
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
      const currentStr = JSON.stringify(participants.map((p) => ({ name: p.name, number: p.number })));
      if (currentStr !== incomingStr) {
        participants.length = 0;
        participants.push(...sanitized);
        renderParticipants();
        resultText.textContent = sanitized.length === 0 ? "Lista sincronizada (vazia)." : "Sincronizado com nuvem.";
        rouletteDisplay.textContent = "Aguardando sorteio...";
      }
    }
  } catch (error) {
    console.debug("Erro ao sincronizar:", error);
  }
}

function startSyncPolling() {
  if (!isSupabaseConfigured()) return;
  if (syncPollingIntervalId !== null) return;
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

function openWinnerModal(name, number) {
  winnerModalText.textContent = `${name} foi sorteado(a) com o número ${number}!`;
  winnerModal.classList.remove("hidden");
}

function closeWinnerModal() {
  winnerModal.classList.add("hidden");
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

function buildWheel() {
  wheel.innerHTML = "";
  if (participants.length === 0) {
    wheel.style.background = "#0f172a";
    return;
  }

  const angleStep = 360 / participants.length;
  const colors = ["#1e3a8a", "#1d4e89", "#1e40af", "#1f3f75", "#1d355f", "#172554"];
  const gradientParts = participants.map((_, index) => {
    const color = colors[index % colors.length];
    return `${color} ${index * angleStep}deg ${(index + 1) * angleStep}deg`;
  });

  wheel.style.background = `conic-gradient(${gradientParts.join(", ")})`;

  participants.forEach((participant, index) => {
    const label = document.createElement("span");
    label.className = "wheel-segment-label";
    label.textContent = `${participant.number}`;
    const angle = index * angleStep + angleStep / 2;
    label.style.transform = `translate(-50%, -50%) rotate(${angle}deg) translateY(-150px) rotate(${-angle}deg)`;
    wheel.appendChild(label);
  });
}

function renderAvailableNumbers() {
  const selectedNumbers = new Set(participants.map((p) => p.number));
  const availableNumbers = [];
  for (let i = 1; i <= 100; i++) {
    if (!selectedNumbers.has(i)) availableNumbers.push(i);
  }

  if (availableNumbers.length === 0) {
    availableNumbersDiv.innerHTML = "<p style='text-align: center; margin: 0;'>Todos os números foram selecionados!</p>";
    return;
  }

  availableNumbersDiv.innerHTML = "";
  const container = document.createElement("div");
  container.className = "numbers-grid";
  availableNumbers.forEach((number) => {
    const square = document.createElement("div");
    square.className = "number-square";
    square.textContent = number;
    container.appendChild(square);
  });
  availableNumbersDiv.appendChild(container);
}

function renderParticipants() {
  participantsList.innerHTML = "";
  participants.sort((a, b) => a.number - b.number).forEach((participant) => {
    const li = document.createElement("li");
    li.textContent = `${participant.name} escolheu o número ${participant.number}`;
    participantsList.appendChild(li);
  });
  renderAvailableNumbers();
  buildWheel();
}

function addParticipant(name, number) {
  const normalizedName = name.trim().toLowerCase();
  const numberAlreadyChosen = participants.some((p) => p.number === number);
  const duplicateEntry = participants.some(
    (p) => p.number === number && p.name.trim().toLowerCase() === normalizedName
  );

  if (duplicateEntry) {
    alert("Essa mesma entrada de nome e número já existe.");
    return;
  }

  if (numberAlreadyChosen) {
    alert("Este número já foi escolhido. Escolha outro entre 1 e 100.");
    return;
  }

  participants.push({ name, number });
  renderParticipants();
  queueAutoCloudSave();
}

function drawWinner() {
  if (participants.length === 0) {
    alert("Adicione pelo menos um participante antes do sorteio.");
    return;
  }

  if (isDrawing) return;

  isDrawing = true;
  drawButton.disabled = true;
  drawButton.textContent = "Sorteando...";
  rouletteDisplay.classList.add("spinning");
  resultText.textContent = "A roleta está girando...";

  const drawnIndex = Math.floor(Math.random() * participants.length);
  const winner = participants[drawnIndex];
  const drawnNumber = winner.number;
  const angleStep = 360 / participants.length;
  const winnerCenter = drawnIndex * angleStep + angleStep / 2;
  const targetRestAngle = (360 - winnerCenter) % 360;
  const normalizedCurrent = ((currentRotation % 360) + 360) % 360;
  const delta = (targetRestAngle - normalizedCurrent + 360) % 360;
  const fullSpins = 6 * 360;
  const finalRotation = currentRotation + fullSpins + delta;

  wheel.style.transition = "transform 4600ms cubic-bezier(0.15, 0.9, 0.12, 1)";
  wheel.style.transform = `rotate(${finalRotation}deg)`;
  currentRotation = finalRotation;

  setTimeout(() => {
    rouletteDisplay.classList.remove("spinning");
    rouletteDisplay.textContent = `${winner.name} - Nº ${drawnNumber}`;
    resultText.textContent = `Número sorteado: ${drawnNumber}. Vencedor: ${winner.name}!`;
    openWinnerModal(winner.name, drawnNumber);
    drawButton.disabled = false;
    drawButton.textContent = "Sortear vencedor";
    isDrawing = false;
  }, 4700);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = nameInput.value.trim();
  const number = Number(numberInput.value);

  if (!name) {
    alert("Digite o nome da pessoa.");
    return;
  }

  if (!Number.isInteger(number) || number < 1 || number > 100) {
    alert("Digite um número inteiro entre 1 e 100.");
    return;
  }

  addParticipant(name, number);
  nameInput.value = "";
  numberInput.value = "";
  nameInput.focus();
});

drawButton.addEventListener("click", drawWinner);
saveCloudButton.addEventListener("click", saveParticipantsToCloud);
closeModalButton.addEventListener("click", closeWinnerModal);
winnerModal.addEventListener("click", (event) => {
  if (event.target === winnerModal) closeWinnerModal();
});

confirmModal.addEventListener("click", (event) => {
  if (event.target === confirmModal) closeConfirmModal();
});

resetButton.addEventListener("click", async () => {
  if (isDrawing) return;

  openConfirmModal(async () => {
    console.log("Limpando tudo...");
    participants.length = 0;
    participantsList.innerHTML = "";
    wheel.style.transform = "rotate(0deg)";
    wheel.style.transition = "transform 0ms linear";
    currentRotation = 0;
    rouletteDisplay.textContent = "Aguardando sorteio...";
    resultText.textContent = "Nenhum sorteio realizado ainda.";
    buildWheel();
    renderAvailableNumbers();
    
    // Tenta deletar do Supabase também
    await saveParticipantsToCloud();
    console.log("Tudo limpo!");
  });
});

// INICIALIZAÇÃO
console.log("Carregando aplicação...");
buildWheel();

// Tenta carregar do Supabase (sempre)
loadParticipantsFromCloud(false).then((loadedFromCloud) => {
  if (loadedFromCloud) {
    console.log("Participantes carregados do Supabase:", participants.length);
  } else {
    console.log("Nenhum participante no Supabase.");
  }
});

// Inicia sincronização automática a cada 3 segundos
startSyncPolling();

window.addEventListener("beforeunload", () => {
  stopSyncPolling();
  if (autoSaveTimeoutId) {
    clearTimeout(autoSaveTimeoutId);
    autoSaveTimeoutId = null;
    saveParticipantsToCloud();
  }
});

if (isSupabaseConfigured()) {
  setCloudStatus("configurado.");
} else {
  setCloudStatus("não configurado. Edite remote-config.js.");
}
