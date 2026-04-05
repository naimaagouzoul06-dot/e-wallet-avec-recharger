const user = JSON.parse(sessionStorage.getItem("currentUser"));

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Constantes
const MONTANT_MIN = 10;
const MONTANT_MAX = 10000;

// Éléments DOM
const rechargeBtn       = document.getElementById("quickRecharge");
const rechargeSection   = document.getElementById("rechargePopup");
const closeRechargeBtn  = document.getElementById("closeRechargeBtn");
const cancelRechargeBtn = document.getElementById("cancelRechargeBtn");
const submitRechargeBtn = document.getElementById("submitRechargeBtn");
const rechargeCard      = document.getElementById("rechargeCard");
const rechargeAmount    = document.getElementById("rechargeAmount");
const rechargeMessage   = document.getElementById("rechargeMessage");

// Vérification de l'authentification
if (!user) {
  alert("Utilisateur non authentifié");
  window.location.href = "/index.html";
}

// Écouteurs d'événements
rechargeBtn.addEventListener("click", openRecharge);
closeRechargeBtn.addEventListener("click", closeRecharge);
cancelRechargeBtn.addEventListener("click", closeRecharge);
submitRechargeBtn.addEventListener("click", handleRecharge);

// Ouvrir le popup
function openRecharge() {
  rechargeSection.classList.add("active");
  document.body.classList.add("popup-open");
  clearMessage();
  renderRechargeCards();
}

// Fermer le popup
function closeRecharge() {
  rechargeSection.classList.remove("active");
  document.body.classList.remove("popup-open");
}

// Afficher un message erreur ou succès
function showMessage(text, type = "error") {
  rechargeMessage.textContent = text;
  rechargeMessage.className = `message ${type}`;
}

// Effacer le message
function clearMessage() {
  rechargeMessage.textContent = "";
  rechargeMessage.className = "";
}

// Remplir le select des cartes
function renderRechargeCards() {
  rechargeCard.innerHTML = '<option value="" disabled selected>Sélectionner une carte</option>';
  user.wallet.cards.forEach((card) => {
    const option = document.createElement("option");
    option.value = card.numcards;                          // garde la valeur telle quelle
    option.textContent = card.type + " ****" + card.numcards;
    rechargeCard.appendChild(option);
  });
}

// Mettre à jour l'affichage du dashboard
function renderDashboard() {
  const soldeEl        = document.getElementById("availableBalance");
  const incomeEl       = document.getElementById("monthlyIncome");
  const expensesEl     = document.getElementById("monthlyExpenses");
  const transactionsList = document.getElementById("recentTransactionsList");

  if (soldeEl) soldeEl.textContent = `${user.wallet.balance} ${user.wallet.currency}`;
  const monthlyIncome = user.wallet.transactions
    .filter(t => t.type === "credit" || t.type === "recharge")
    .reduce((total, t) => total + t.amount, 0);

  const monthlyExpenses = user.wallet.transactions
    .filter(t => t.type === "debit")
    .reduce((total, t) => total + t.amount, 0);

  if (incomeEl)   incomeEl.textContent   = `${monthlyIncome} MAD`;
  if (expensesEl) expensesEl.textContent = `${monthlyExpenses} MAD`;

  if (transactionsList) {
    transactionsList.innerHTML = "";
    user.wallet.transactions.forEach(transaction => {
      const item = document.createElement("div");
      item.className = "transaction-item";
      item.innerHTML = `
        <div>${transaction.date}</div>
        <div>${transaction.amount} MAD</div>
        <div>${transaction.type}</div>
      `;
      transactionsList.appendChild(item);
    });
  }
}

// ─── async et await ───────────────────────────────────────────────────────────────

async function validateMontant(amount) {
  await delay(300);

  if (!amount || isNaN(amount) || amount <= 0)
    throw "Le montant doit être strictement supérieur à zéro.";

  if (amount < MONTANT_MIN)
    throw `Le montant minimum de rechargement est ${MONTANT_MIN} MAD.`;

  if (amount > MONTANT_MAX)
    throw `Le montant maximum de rechargement est ${MONTANT_MAX} MAD.`;

  return amount;
}

async function validateCard(numCard) {
  await delay(500);

  const card = user.wallet.cards.find(
    (c) => String(c.numcards) === String(numCard)
  );

  if (!card)
    throw "Moyen de paiement introuvable.";

  return card;
}

async function checkCardExpiry(card) {
  await delay(1000);

  const d1 = new Date(card.expiry);
  const d2 = new Date();

  if (d1 - d2 <= 0)
    throw "Carte expirée.";

  return card;
}

async function updateSolde(amount) {
  await delay(300);

  user.wallet.balance += amount;
  sessionStorage.setItem("currentUser", JSON.stringify(user));

  return "Solde mis à jour";
}

async function addRechargeTransaction(card, amount) {
  await delay(300);

  const transaction = {
    id: Date.now(),
    type: "recharge",
    amount,
    date: new Date().toLocaleDateString("fr-FR"),
    from: `Carte ****${card.numcards}`,
    status: "success",
  };

  user.wallet.transactions.push(transaction);
  sessionStorage.setItem("currentUser", JSON.stringify(user));

  return "Transaction enregistrée";
}

// ─── Fonction principale ─────────────────────────────────────────────────────

async function recharger(numCard, amount) {
  console.log("DÉBUT DU RECHARGEMENT");

  try {
    const validAmount = await validateMontant(amount);
    console.log("Étape 1:", validAmount);

    const card = await validateCard(numCard);
    console.log("Étape 2:", card.type);

    await checkCardExpiry(card);
    console.log("Étape 3: Carte valide");

    const msg1 = await updateSolde(amount);
    console.log("Étape 4:", msg1);

    const msg2 = await addRechargeTransaction(card, amount);
    console.log("Étape 5:", msg2);

    showMessage(`Rechargement de ${amount} MAD réussi`, "success");
    renderDashboard();

  } catch (error) {
    console.error(error);

    const failedTransaction = {
      id: Date.now(),
      type: "recharge",
      amount,
      date: new Date().toLocaleDateString("fr-FR"),
      from: `Carte ****${numCard}`,
      status: "failed",
      error,
    };

    user.wallet.transactions.push(failedTransaction);
    sessionStorage.setItem("currentUser", JSON.stringify(user));

    showMessage(`Échec : ${error}`, "error");
  }
}
// ─── Handler bouton Soumettre ─────────────────────────────────────────────────

function handleRecharge(e) {
  e.preventDefault();
  clearMessage();

  const numCard = rechargeCard.value;
  const amount  = Number(rechargeAmount.value);

  if (!numCard) {
    showMessage("Veuillez sélectionner une carte.", "error");
    return;
  }

  recharger(numCard, amount);
}