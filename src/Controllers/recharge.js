const user = JSON.parse(sessionStorage.getItem("currentUser"));

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

// ─── Promises ───────────────────────────────────────────────────────────────

// 1. Valider le montant
function validateMontant(amount) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!amount || isNaN(amount) || amount <= 0) {
        reject("Le montant doit être strictement supérieur à zéro.");
      } else if (amount < MONTANT_MIN) {
        reject(`Le montant minimum de rechargement est ${MONTANT_MIN} MAD.`);
      } else if (amount > MONTANT_MAX) {
        reject(`Le montant maximum de rechargement est ${MONTANT_MAX} MAD.`);
      } else {
        resolve(amount);
      }
    }, 300);
  });
}

// 2. Valider que la carte appartient à l'utilisateur
function validateCard(numCard) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const card = user.wallet.cards.find(
        (c) => String(c.numcards) === String(numCard)
      );
      if (!card) {
        reject("Moyen de paiement introuvable ou n'appartient pas à votre compte.");
      } else {
        resolve(card);
      }
    }, 500);
  });
}

// 3. Vérifier la date d'expiration
function checkCardExpiry(card) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const d1 = new Date(card.expiry);
      const d2 = new Date();
      if (d1 - d2 > 0) {
        resolve(card);
      } else {
        reject("Cette carte est invalide à cause de sa date d'expiration.");
      }
    }, 1000);
  });
}

// 4. Mettre à jour le solde
function updateSolde(amount) {
  return new Promise((resolve) => {
    setTimeout(() => {
      user.wallet.balance += amount;
      sessionStorage.setItem("currentUser", JSON.stringify(user));
      resolve("Solde mis à jour avec succès.");
    }, 300);
  });
}

// 5. Enregistrer la transaction
function addRechargeTransaction(card, amount) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const transaction = {
        id: Date.now(),
        type: "recharge",
        amount: amount,
        date: new Date().toLocaleDateString("fr-FR"),
        from: `Carte ****${card.numcards}`,
        status: "success",
      };
      user.wallet.transactions.push(transaction);
      sessionStorage.setItem("currentUser", JSON.stringify(user));
      resolve("Transaction enregistrée avec succès.");
    }, 300);
  });
}

// ─── Fonction principale ─────────────────────────────────────────────────────

function recharger(numCard, amount) {
  console.log("\n DÉBUT DU RECHARGEMENT ");

  validateMontant(amount)
    .then((validAmount) => {
      console.log("Étape 1 — Montant valide :", validAmount, "MAD");
      return validateCard(numCard);
    })

    .then((card) => {
      console.log("Étape 2 — Carte trouvée :", card.type, "****" + card.numcards);
      return checkCardExpiry(card);
    })

    .then((card) => {
      console.log("Étape 3 — Carte non expirée, expiry :", card.expiry);
      return updateSolde(amount).then((msg) => {
        console.log("Étape 4 —", msg);
        return card;
      });
    })

    .then((card) => {
      return addRechargeTransaction(card, amount).then((msg) => {
        console.log("Étape 5 —", msg);
      });
    })

    .then(() => {
      console.log(`Rechargement de ${amount} MAD réussi !`);
      showMessage(`Rechargement de ${amount} MAD effectué avec succès !`, "success");
      renderDashboard();
    })

    .catch((error) => {
      console.error("Erreur :", error);

      const failedTransaction = {
        id: Date.now(),
        type: "recharge",
        amount: amount,
        date: new Date().toLocaleDateString("fr-FR"),
        from: `Carte ****${numCard}`,
        status: "failed",
        error: error,
      };
      user.wallet.transactions.push(failedTransaction);
      sessionStorage.setItem("currentUser", JSON.stringify(user));
      showMessage(`Échec du rechargement : ${error}`, "error");
    });
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