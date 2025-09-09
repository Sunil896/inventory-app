const API_URL = "https://script.google.com/macros/s/AKfycbwTGSgFAXuOrRXt402rIca6b15Iwh9pw1M9StsZnnofBfzuVLxbmB64vjZHKhm3lDqY/exec";
let items = [];
let currentUser = null;
let isAdmin = false;

// Google Login
async function handleCredentialResponse(response) {
  const data = jwt_decode(response.credential);
  currentUser = data.email;

  // Get role from Google Sheet
  const res = await fetch(`${API_URL}?method=getRole&email=${currentUser}`);
  const role = await res.text();
  isAdmin = role === "Admin";

  document.getElementById("loginSection").style.display = "none";
  document.getElementById("appSection").style.display = "block";

  if (!isAdmin) document.getElementById("adminControls").style.display = "none";
  if (isAdmin) document.getElementById("logsSection").style.display = "block";

  loadData();
  if (isAdmin) loadLogs();
}

// Load Inventory
async function loadData() {
  const res = await fetch(`${API_URL}?method=getInventory`);
  const data = await res.json();
  items = data.slice(1).map((row, i) => ({
    rowIndex: i,
    name: row[0],
    qty: Number(row[1]),
    price: Number(row[2]),
    category: row[3],
    total: Number(row[4])
  }));
  renderTable();
  updateDashboard();
}

// Render Table
function renderTable() {
  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = "";
  items.forEach((item, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.name}</td>
      <td>${item.qty}</td>
      <td>${item.price}</td>
      <td>${item.category}</td>
      <td>${item.total}</td>
      <td>
        ${isAdmin ? `<button onclick="editItem(${i})">Edit</button>
        <button onclick="deleteItem(${i})">Delete</button>` : ""}
      </td>`;
    tbody.appendChild(tr);
  });
}

// Dashboard
function updateDashboard() {
  document.getElementById("totalItems").textContent = items.length;
  const totalVal = items.reduce((sum, it) => sum + it.total, 0);
  document.getElementById("totalValue").textContent = totalVal.toFixed(2);
}

// Save to Sheet
async function saveToSheet(item, action, row = null) {
  await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({ ...item, action, row })
  });
  await loadData();
  if (isAdmin) loadLogs();
}

// Add Item
document.getElementById("itemForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const newItem = {
    name: document.getElementById("itemName").value,
    qty: Number(document.getElementById("itemQty").value),
    price: Number(document.getElementById("itemPrice").value),
    category: document.getElementById("itemCategory").value
  };
  await saveToSheet(newItem, "add");
  e.target.reset();
});

// Delete Item
async function deleteItem(index) {
  const item = items[index];
  await saveToSheet({}, "delete", item.rowIndex);
}

// Edit Item
async function editItem(index) {
  const item = items[index];
  document.getElementById("itemName").value = item.name;
  document.getElementById("itemQty").value = item.qty;
  document.getElementById("itemPrice").value = item.price;
  document.getElementById("itemCategory").value = item.category;
  await saveToSheet({}, "delete", item.rowIndex);
}

// Search
document.getElementById("searchInput").addEventListener("keyup", function() {
  const filter = this.value.toLowerCase();
  document.querySelectorAll("#tableBody tr").forEach(tr => {
    const txt = tr.textContent.toLowerCase();
    tr.style.display = txt.includes(filter) ? "" : "none";
  });
});

// Sort Table
function sortTable(n) {
  items.sort((a, b) => {
    const vals = [a.name, a.qty, a.price, a.category, a.total];
    const vals2 = [b.name, b.qty, b.price, b.category, b.total];
    return vals[n] > vals2[n] ? 1 : -1;
  });
  renderTable();
}

// Export CSV
function exportTableToCSV() {
  let csv = "Name,Quantity,Price,Category,Total\n";
  items.forEach(it => {
    csv += `${it.name},${it.qty},${it.price},${it.category},${it.total}\n`;
  });
  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "inventory.csv";
  a.click();
}

// Load Logs
async function loadLogs() {
  const res = await fetch(`${API_URL}?method=getLogs`);
  const logs = await res.json();
  renderLogs(logs.slice(1));
}

function renderLogs(logs) {
  const logTable = document.getElementById("logTableBody");
  logTable.innerHTML = "";
  logs.forEach(row => {
    const tr = document.createElement("tr");
    row.forEach(cell => {
      const td = document.createElement("td");
      td.textContent = cell;
      tr.appendChild(td);
    });
    logTable.appendChild(tr);
  });
}
