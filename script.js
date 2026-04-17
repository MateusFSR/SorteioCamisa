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
const loadCloudButton = document.getElementById("load-cloud-button");
const cloudStatus = document.getElementById("cloud-status");
const winnerModal = document.getElementById("winner-modal");
const winnerModalText = document.getElementById("winner-modal-text");
const closeModalButton = document.getElementById("close-modal-button");

const participants = [];
let isDrawing = false;
let currentRotation = 0;
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

function getCloudEndpoint() {
  const baseUrl = String(remoteSync.databaseUrl || "").trim();
  if (!baseUrl) {
    return "";
  }

  const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const authToken = String(remoteSync.authToken || "").trim();
  const authSuffix = authToken ? `?auth=${encodeURIComponent(authToken)}` : "";
  return `${normalizedBase}/participants.json${authSuffix}`;
}

function setCloudStatus(message) {
  cloudStatus.textContent = `Status da nuvem: ${message}`;
}

function saveParticipantsToLocalStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(participants));
}

function loadParticipantsFromLocalStorage() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return;
  }

  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) {
      return;
    }

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

      if (isValid) {
        seenNumbers.add(item.number);
      }
      return isValid;
    });

    participants.length = 0;
    participants.push(...sanitized.map((item) => ({ name: item.name.trim(), number: item.number })));
    renderParticipants();
  } catch (error) {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function sanitizeParticipants(items) {
  if (!Array.isArray(items)) {
    throw new Error("Formato inválido de participantes.");
  }

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

function applyParticipants(newParticipants, message) {
  participants.length = 0;
  participants.push(...newParticipants);
  renderParticipants();
  saveParticipantsToLocalStorage();
  resultText.textContent = message;
  rouletteDisplay.textContent = "Aguardando sorteio...";
}

async function saveParticipantsToCloud() {
  if (isSupabaseConfigured()) {
    const endpoint = getSupabaseRestEndpoint();
    if (!endpoint) {
      setCloudStatus("não configurado. Edite remote-config.js.");
      alert("Configure o arquivo remote-config.js para salvar na nuvem.");
      return;
    }

    try {
      setCloudStatus("salvando no Supabase...");
      const payload = participants.map((participant) => ({
        name: participant.name,
        number: participant.number,
      }));

      const response = await fetch(`${endpoint}?on_conflict=number`, {
        method: "POST",
        headers: getSupabaseHeaders({
          Prefer: "resolution=merge-duplicates,return=minimal",
        }),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Falha ao salvar no Supabase.");
      }

      setCloudStatus("salvo no Supabase com sucesso.");
    } catch (error) {
      setCloudStatus("erro ao salvar no Supabase.");
      alert("Não foi possível salvar no Supabase.");
    }
    return;
  }

  const endpoint = getCloudEndpoint();
  if (!endpoint) {
    setCloudStatus("não configurado. Edite remote-config.js.");
    alert("Configure o arquivo remote-config.js para salvar na nuvem.");
    return;
  }

  try {
    setCloudStatus("salvando...");
    const response = await fetch(endpoint, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        version: 1,
        updatedAt: new Date().toISOString(),
        participants,
      }),
    });

    if (!response.ok) {
      throw new Error("Falha ao salvar na nuvem.");
    }

    setCloudStatus("salvo com sucesso.");
  } catch (error) {
    setCloudStatus("erro ao salvar.");
    alert("Não foi possível salvar na nuvem.");
  }
}

async function loadParticipantsFromCloud(showFeedback = true) {
  if (isSupabaseConfigured()) {
    const endpoint = getSupabaseRestEndpoint();
    if (!endpoint) {
      setCloudStatus("não configurado. Edite remote-config.js.");
      return false;
    }

    try {
      if (showFeedback) {
        setCloudStatus("carregando do Supabase...");
      }

      const response = await fetch(`${endpoint}?select=name,number&order=number.asc`, {
        method: "GET",
        headers: getSupabaseHeaders(),
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Falha ao carregar do Supabase.");
      }

      const incoming = await response.json();
      const sanitized = sanitizeParticipants(incoming);

      if (sanitized.length === 0) {
        if (showFeedback) {
          setCloudStatus("sem participantes salvos no Supabase.");
        }
        return false;
      }

      applyParticipants(sanitized, "Participantes carregados do Supabase.");
      setCloudStatus("carregado do Supabase com sucesso.");
      return true;
    } catch (error) {
      if (showFeedback) {
        setCloudStatus("erro ao carregar do Supabase.");
        alert("Não foi possível carregar do Supabase.");
      }
      return false;
    }
  }

  const endpoint = getCloudEndpoint();
  if (!endpoint) {
    setCloudStatus("não configurado. Edite remote-config.js.");
    return false;
  }

  try {
    if (showFeedback) {
      setCloudStatus("carregando...");
    }

    const response = await fetch(endpoint, { method: "GET", cache: "no-store" });
    if (!response.ok) {
      throw new Error("Falha ao carregar da nuvem.");
    }

    const parsed = await response.json();
    const incoming = Array.isArray(parsed?.participants) ? parsed.participants : [];
    const sanitized = sanitizeParticipants(incoming);

    if (sanitized.length === 0) {
      if (showFeedback) {
        setCloudStatus("sem participantes salvos na nuvem.");
      }
      return false;
    }

    applyParticipants(sanitized, "Participantes carregados da nuvem.");
    setCloudStatus("carregado com sucesso.");
    return true;
  } catch (error) {
    if (showFeedback) {
      setCloudStatus("erro ao carregar.");
      alert("Não foi possível carregar da nuvem.");
    }
    return false;
  }
}

function openWinnerModal(name, number) {
  winnerModalText.textContent = `${name} foi sorteado(a) com o número ${number}!`;
  winnerModal.classList.remove("hidden");
}

function closeWinnerModal() {
  winnerModal.classList.add("hidden");
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
    const start = index * angleStep;
    const end = start + angleStep;
    const color = colors[index % colors.length];
    return `${color} ${start}deg ${end}deg`;
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

function renderParticipants() {
  participantsList.innerHTML = "";

  participants
    .sort((a, b) => a.number - b.number)
    .forEach((participant) => {
      const li = document.createElement("li");
      li.textContent = `${participant.name} escolheu o número ${participant.number}`;
      participantsList.appendChild(li);
    });

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
}

function drawWinner() {
  if (participants.length === 0) {
    alert("Adicione pelo menos um participante antes do sorteio.");
    return;
  }

  if (isDrawing) {
    return;
  }

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

function loadParticipantsFromObject(parsed) {
  const incoming = Array.isArray(parsed?.participants) ? parsed.participants : parsed;
  const sanitized = sanitizeParticipants(incoming);
  applyParticipants(sanitized, "Participantes carregados do arquivo.");
}

async function loadParticipantsFromRepositoryFile() {
  if (participants.length > 0) {
    return;
  }

  try {
    const response = await fetch("./participantes.json", { cache: "no-store" });
    if (!response.ok) {
      return;
    }
    const parsed = await response.json();
    loadParticipantsFromObject(parsed);
  } catch (error) {
    // Sem arquivo padrão disponível, segue com localStorage.
  }
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
loadCloudButton.addEventListener("click", () => loadParticipantsFromCloud(true));
closeModalButton.addEventListener("click", closeWinnerModal);
winnerModal.addEventListener("click", (event) => {
  if (event.target === winnerModal) {
    closeWinnerModal();
  }
});

resetButton.addEventListener("click", () => {
  if (isDrawing) {
    return;
  }

  participants.length = 0;
  participantsList.innerHTML = "";
  wheel.style.transform = "rotate(0deg)";
  wheel.style.transition = "transform 0ms linear";
  currentRotation = 0;
  rouletteDisplay.textContent = "Aguardando sorteio...";
  resultText.textContent = "Nenhum sorteio realizado ainda.";
  buildWheel();
  saveParticipantsToLocalStorage();
});

buildWheel();
loadParticipantsFromLocalStorage();
loadParticipantsFromCloud(false).then((loaded) => {
  if (!loaded) {
    loadParticipantsFromRepositoryFile();
  }
});

if (isSupabaseConfigured() || getCloudEndpoint()) {
  setCloudStatus("configurado.");
} else {
  setCloudStatus("não configurado. Edite remote-config.js.");
}
