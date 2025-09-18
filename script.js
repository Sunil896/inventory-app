// ---------- script.js ----------
const API_URL = "PASTE_YOUR_SCRIPT_WEB_APP_URL_HERE"; // <-- set this
let expenses = []; // full 2D array from sheet (including header row)
let chartProject, chartItemType;

// UI refs
const loginScreen = document.getElementById("loginScreen");
const codeInput = document.getElementById("codeInput");
const codeBtn = document.getElementById("codeBtn");
const codeMsg = document.getElementById("codeMsg");
const dashboard = document.getElementById("dashboard");
const logoutBtn = document.getElementById("logoutBtn");
const addBtn = document.getElementById("addBtn");
const modal = document.getElementById("modal");
const cancelBtn = document.getElementById("cancelBtn");
const saveBtn = document.getElementById("saveBtn");
const modalMsg = document.getElementById("modalMsg");

codeBtn.addEventListener("click", validateCode);
codeInput.addEventListener("keyup", (e)=>{ if(e.key==="Enter") validateCode(); });

logoutBtn.addEventListener("click", () => {
  location.reload();
});

// modal open/close
addBtn.addEventListener("click", ()=> { openModal(); });
cancelBtn.addEventListener("click", ()=> { closeModal(); });
modal.addEventListener("click", (ev)=>{ if(ev.target === modal) closeModal(); });

saveBtn.addEventListener("click", async ()=>{
  modalMsg.textContent = "";
  const row = {
    Date: document.getElementById("fDate").value || "",
    ItemType: document.getElementById("fItemType").value.trim(),
    Item: document.getElementById("fItem").value.trim(),
    Vendor: document.getElementById("fVendor").value.trim(),
    Amount: document.getElementById("fAmount").value.trim(),
    InvoiceNo: document.getElementById("fInvoice").value.trim(),
    Project: document.getElementById("fProject").value.trim(),
    PaymentStatus: document.getElementById("fPaymentStatus").value,
    InvoiceSubmittedTo: document.getElementById("fSubmitted").value.trim()
  };
  // basic validation
  if (!row.ItemType || !row.Item || !row.Amount) { modalMsg.textContent = "Please fill at least Item Type, Item and Amount."; return; }

  // send to backend
  modalMsg.textContent = "Saving...";
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ action: "add", row }),
      headers: { "Content-Type": "application/json" }
    });
    const json = await res.json();
    if (json.status === "ok") {
      modalMsg.textContent = "Saved.";
      closeModal();
      await loadExpenses(); // refresh UI
    } else {
      modalMsg.textContent = "Error saving: " + (json.message || JSON.stringify(json));
    }
  } catch (err) {
    modalMsg.textContent = "Network error: " + err.message;
  }
});

// Validate code by asking API
async function validateCode(){
  const code = (codeInput.value || "").trim();
  if (!code || code.length !== 4) { codeMsg.textContent = "Enter a 4-digit code."; return; }
  codeMsg.textContent = "Checking...";
  try {
    const res = await fetch(API_URL + "?method=validateCode&code=" + encodeURIComponent(code));
    const obj = await res.json();
    if (obj.valid) {
      showDashboard();
    } else {
      codeMsg.textContent = "Invalid code.";
    }
  } catch (err) {
    codeMsg.textContent = "Error validating code.";
    console.error(err);
  }
}

function showDashboard(){
  loginScreen.classList.add("hidden");
  dashboard.classList.remove("hidden");
  loadExpenses();
}

// Load expenses from sheet and build UI
async function loadExpenses(){
  try {
    const res = await fetch(API_URL + "?method=getExpenses");
    const data = await res.json(); // 2D array (including headers)
    expenses = data || [];
    renderTable();
    renderCharts();
  } catch (err) {
    console.error("Failed to load:", err);
  }
}

function renderTable(){
  const tbody = document.querySelector("#expenseTable tbody");
  tbody.innerHTML = "";
  if (expenses.length <= 1) return;
  // Skip header row
  for (let i = 1; i < expenses.length; i++) {
    const r = expenses[i];
    const tr = document.createElement("tr");
    // Map columns as header: Date | Item Type | Item | Vendor detail | Amount | Invoice no. | Project | Payment Status | Invoice submitted to
    tr.innerHTML = `
      <td>${escapeCell(r[0])}</td>
      <td>${escapeCell(r[1])}</td>
      <td>${escapeCell(r[2])}</td>
      <td>${escapeCell(r[3])}</td>
      <td>${escapeCell(r[4])}</td>
      <td>${escapeCell(r[5])}</td>
      <td>${escapeCell(r[6])}</td>
      <td>${escapeCell(r[7])}</td>
      <td>${escapeCell(r[8])}</td>
    `;
    tbody.appendChild(tr);
  }
}

function escapeCell(v){ return v === undefined || v === null ? "" : String(v); }

function aggregationMaps(){
  const byProject = {};
  const byItemType = {};
  if (expenses.length <= 1) return {byProject, byItemType};
  for (let i = 1; i < expenses.length; i++){
    const r = expenses[i];
    const project = r[6] || "Unassigned";
    const itemType = r[1] || "Other";
    const amount = parseFloat(r[4]) || 0;
    byProject[project] = (byProject[project] || 0) + amount;
    byItemType[itemType] = (byItemType[itemType] || 0) + amount;
  }
  return {byProject, byItemType};
}

function renderCharts(){
  const maps = aggregationMaps();
  drawPie("projectChart", maps.byProject, chartProject, (c)=>chartProject = c);
  drawPie("itemTypeChart", maps.byItemType, chartItemType, (c)=>chartItemType = c);
}

function drawPie(canvasId, dataMap, existingChart, saveRef){
  const ctx = document.getElementById(canvasId).getContext("2d");
  const labels = Object.keys(dataMap);
  const values = labels.map(l => dataMap[l]);
  // destroy existing chart if present
  if (existingChart) try { existingChart.destroy(); } catch(e){}
  // create with simple color generation
  const bg = labels.map((_,i)=>`hsl(${(i*47)%360} 70% 50%)`);
  const chart = new Chart(ctx, {
    type: 'pie',
    data: { labels, datasets: [{ data: values, backgroundColor: bg }] },
    options: { responsive:true, plugins: { legend:{position:'bottom'} } }
  });
  saveRef(chart);
}

function openModal(){
  modal.classList.remove("hidden");
  // clear fields
  document.getElementById("fDate").value = new Date().toISOString().slice(0,10);
  document.getElementById("fItemType").value = "";
  document.getElementById("fItem").value = "";
  document.getElementById("fVendor").value = "";
  document.getElementById("fAmount").value = "";
  document.getElementById("fInvoice").value = "";
  document.getElementById("fProject").value = "";
  document.getElementById("fPaymentStatus").value = "Pending";
  document.getElementById("fSubmitted").value = "";
  modalMsg.textContent = "";
}
function closeModal(){
  modal.classList.add("hidden");
}
