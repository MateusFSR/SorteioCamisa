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
const STORAGE_KEY = "sorteio-camiseta-brasil-participants-v1";
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

function saveParticipantsToLocalStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(participants));
}

function loadParticipantsFromLocalStorage() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;

  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return;

    const seenNumbers = new Set();
    const sanitized = parsed.filter((item) => {
      const isValid =
        item &&
        typeof item.name === "string" &&
        item.name.trim() &&
        Number.isInteger(item.number) &&
        item.number >= 1 &&
        item.number <= 100 &&
        !seenNumbers.has(item.number);
      if (isValid) seenNumbers.add(item.number);
      return isValid;
    });

    participants.length = 0;
    participants.push(...sanitized.map((item) => ({ name: item.name.trim(), number: item.number })));
    renderParticipants();
  } catch (error) {
    console.error("Erro ao carregar localStorage:", error);
    localStorage.removeItem(STORAGE_KEY);
  }
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
  const endpoint = getSupabaseRestEndpoint();
  if (!endpoint) {
    setCloudStatus("não configurado.");
    return;
  }

  try {
    setCloudStatus("salvando no Supabase...");
    const payload = participants.map((p) => ({ name: p.name, number: p.number }));

    // Busca todos os registros existentes no Supabase
    console.log("Sincronizando com Supabase...");
    const getRes = await fetch(`${endpoint}?select=number,name`, {
      method: "GET",
      headers: getSupabaseHeaders(),
      cache: "no-store",
    });

    if (!getRes.ok) {
      const getErrorText = await getRes.text();
      console.error("Get falhou:", getRes.status, getErrorText);
      setCloudStatus("erro ao buscar dados do Supabase.");
      return;
    }

    const existingRecords = await getRes.json();
    const existingMap = new Map(existingRecords.map(r => [r.number, r.name]));
    
    // Separa em novos, atualizações e deletados
    const toInsert = payload.filter(p => !existingMap.has(p.number));
    const toUpdate = payload.filter(p => existingMap.has(p.number) && existingMap.get(p.number) !== p.name);
    const existingNumbers = new Set(existingRecords.map(r => r.number));
    const currentNumbers = new Set(payload.map(p => p.number));
    const toDelete = existingRecords.filter(r => !currentNumbers.has(r.number));

    // Delete registros removidos
    if (toDelete.length > 0) {
      console.log("Deletando", toDelete.length, "registros removidos...");
      for (const record of toDelete) {
        const deleteRes = await fetch(`${endpoint}?number=eq.${record.number}`, {
          method: "DELETE",
          headers: getSupabaseHeaders(),
        });
        if (!deleteRes.ok) {
          console.warn(`Aviso: Falha ao deletar número ${record.number}`);
        }
      }
    }

    // Insert novos registros
    if (toInsert.length > 0) {
      console.log("Inserindo", toInsert.length, "novo(s) registro(s)...");
      const insertRes = await fetch(endpoint, {
        method: "POST",
        headers: getSupabaseHeaders(),
        body: JSON.stringify(toInsert),
      });

      if (!insertRes.ok) {
        const errorText = await insertRes.text();
        console.error("Insert falhou:", insertRes.status, errorText);
        setCloudStatus("erro ao salvar no Supabase.");
        return;
      }
    }

    // Update registros modificados
    if (toUpdate.length > 0) {
      console.log("Atualizando", toUpdate.length, "registro(s)...");
      for (const record of toUpdate) {
        const updateRes = await fetch(`${endpoint}?number=eq.${record.number}`, {
          method: "PATCH",
          headers: getSupabaseHeaders(),
          body: JSON.stringify({ name: record.name }),
        });

        if (!updateRes.ok) {
          console.warn(`Aviso: Falha ao atualizar número ${record.number}`);
        }
      }
    }

    if (toInsert.length === 0 && toUpdate.length === 0 && toDelete.length === 0) {
      console.log("Sem alterações para sincronizar");
    }

    setCloudStatus(payload.length === 0 ? "lista limpa no Supabase." : "salvo no Supabase com sucesso.");
    console.log("Supabase sincronizado com sucesso");
  } catch (error) {
    console.error("Erro ao sincronizar:", error);
    setCloudStatus("erro ao sincronizar com Supabase.");
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
  saveParticipantsToLocalStorage();
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
    
    localStorage.removeItem(STORAGE_KEY);
    saveParticipantsToLocalStorage();
    
    // Tenta deletar do Supabase também
    await saveParticipantsToCloud();
    console.log("Tudo limpo!");
  });
});

// INICIALIZAÇÃO
console.log("Carregando aplicação...");
buildWheel();
loadParticipantsFromLocalStorage();

console.log("Participantes carregados:", participants.length);

window.addEventListener("beforeunload", () => {
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
