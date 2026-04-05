import { getbeneficiaries, finduserbyaccount, findbeneficiarieByid } from "../Model/database.js";

const user = JSON.parse(sessionStorage.getItem("currentUser"));

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// DOM elements
const greetingName      = document.getElementById("greetingName");
const currentDate       = document.getElementById("currentDate");
const solde             = document.getElementById("availableBalance");
const incomeElement     = document.getElementById("monthlyIncome");
const expensesElement   = document.getElementById("monthlyExpenses");
const activecards       = document.getElementById("activeCards");
const transactionsList  = document.getElementById("recentTransactionsList");
const transferBtn       = document.getElementById("quickTransfer");
const transferSection   = document.getElementById("transferPopup");
const closeTransferBtn  = document.getElementById("closeTransferBtn");
const cancelTransferBtn = document.getElementById("cancelTransferBtn");
const beneficiarySelect = document.getElementById("beneficiary");
const sourceCard        = document.getElementById("sourceCard");
const submitTransferBtn = document.getElementById("submitTransferBtn");

// Guard
if (!user) {
  alert("User not authenticated");
  window.location.href = "/index.html";
}

// Events
transferBtn.addEventListener("click", handleTransfersection);
closeTransferBtn.addEventListener("click", closeTransfer);
cancelTransferBtn.addEventListener("click", closeTransfer);
submitTransferBtn.addEventListener("click", handleTransfer);

// Dashboard data

const getDashboardData = () => {
  const monthlyIncome = user.wallet.transactions
    .filter(t => t.type === "credit" || t.type === "recharge")
    .reduce((total, t) => total + t.amount, 0);

  const monthlyExpenses = user.wallet.transactions
    .filter(t => t.type === "debit")
    .reduce((total, t) => total + t.amount, 0);

  return {
    userName: user.name,
    currentDate: new Date().toLocaleDateString("fr-FR"),
    availableBalance: `${user.wallet.balance} ${user.wallet.currency}`,
    activeCards: user.wallet.cards.length,
    monthlyIncome: `${monthlyIncome} MAD`,
    monthlyExpenses: `${monthlyExpenses} MAD`,
  };
};

function renderDashboard() {
  const dashboardData = getDashboardData();

  if (dashboardData) {
    greetingName.textContent  = dashboardData.userName;
    currentDate.textContent   = dashboardData.currentDate;
    solde.textContent         = dashboardData.availableBalance;
    incomeElement.textContent = dashboardData.monthlyIncome;
    expensesElement.textContent = dashboardData.monthlyExpenses;
    activecards.textContent   = dashboardData.activeCards;
  }

  transactionsList.innerHTML = "";
  user.wallet.transactions.forEach(transaction => {
    const transactionItem = document.createElement("div");
    transactionItem.className = "transaction-item";
    transactionItem.innerHTML = `
      <div>${transaction.date}</div>
      <div>${transaction.amount} MAD</div>
      <div>${transaction.type}</div>
    `;
    transactionsList.appendChild(transactionItem);
  });
}

renderDashboard();

// fenetre de transfert

function closeTransfer() {
  transferSection.classList.remove("active");
  document.body.classList.remove("popup-open");
}

function handleTransfersection() {
  transferSection.classList.add("active");
  document.body.classList.add("popup-open");
}

// Beneficiaries et Cards 

const beneficiaries = getbeneficiaries(user.id);

function renderBeneficiaries() {
  beneficiaries.forEach((beneficiary) => {
    const option = document.createElement("option");
    option.value = beneficiary.id;
    option.textContent = beneficiary.name;
    beneficiarySelect.appendChild(option);
  });
}
renderBeneficiaries();

function renderCards() {
  user.wallet.cards.forEach((card) => {
    const option = document.createElement("option");
    option.value = card.numcards;
    option.textContent = card.type + " ****" + card.numcards;
    sourceCard.appendChild(option);
  });
}
renderCards();

// async et await

async function checkUser(numcompte) {
  await delay(2000);
  const beneficiary = finduserbyaccount(numcompte);
  if (!beneficiary) throw "Beneficiary not found";
  return beneficiary;
}

async function checkSolde(expediteur, amount) {
  await delay(3000);
  if (expediteur.wallet.balance <= amount) {
    throw "Insufficient balance";
  }
  return "Sufficient balance";
}

async function updateSolde(expediteur, destinataire, amount) {
  await delay(200);
  expediteur.wallet.balance -= amount;
  destinataire.wallet.balance += amount;
  sessionStorage.setItem("currentUser", JSON.stringify(expediteur));
  return "Update balance done";
}

async function addtransactions(expediteur, destinataire, amount) {
  await delay(3000);

  const credit = {
    id: Date.now(),
    type: "credit",
    amount,
    date: new Date().toLocaleDateString(),
    from: expediteur.name,
  };

  const debit = {
    id: Date.now() + 1,
    type: "debit",
    amount,
    date: new Date().toLocaleDateString(),
    to: destinataire.name,
  };

  expediteur.wallet.transactions.push(debit);
  destinataire.wallet.transactions.push(credit);

  sessionStorage.setItem("currentUser", JSON.stringify(expediteur));
  return "Transaction added successfully";
}

//Fonction principale 

async function transfer(expediteur, numcompte, amount) {
  console.log("Début du transfert");

  try {
    const destinataire = await checkUser(numcompte);
    console.log("Étape 1:", destinataire.name);

    const soldeMessage = await checkSolde(expediteur, amount);
    console.log("Étape 2:", soldeMessage);

    const updateMessage = await updateSolde(expediteur, destinataire, amount);
    console.log("Étape 3:", updateMessage);

    const transactionMessage = await addtransactions(expediteur, destinataire, amount);
    console.log("Étape 4:", transactionMessage);

    console.log(`Transfert de ${amount} réussi !`);
    renderDashboard();

  } catch (error) {
    console.error("Erreur :", error);
    alert(`Échec du transfert : ${error}`);
  }
}

// Handler bouton Soumettre 

function handleTransfer(e) {
  e.preventDefault();

  const beneficiaryId = document.getElementById("beneficiary").value;
  const amount        = Number(document.getElementById("amount").value);
  if (!beneficiaryId) {
    alert("Veuillez sélectionner un bénéficiaire.");
    return;
  }
  if (!amount || amount <= 0) {
    alert("Veuillez saisir un montant valide.");
    return;
  }

  const beneficiaryAccount = findbeneficiarieByid(user.id, beneficiaryId).account;
  transfer(user, beneficiaryAccount, amount);
}