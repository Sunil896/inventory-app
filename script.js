const API_URL = "https://script.google.com/macros/s/AKfycbwTGSgFAXuOrRXt402rIca6b15Iwh9pw1M9StsZnnofBfzuVLxbmB64vjZHKhm3lDqY/exec";
let currentUser = null;
let isAdmin = false;

async function handleCredentialResponse(response) {
  const data = jwt_decode(response.credential);
  currentUser = data.email;

  // Fetch role from Admins sheet
  const roleRes = await fetch(`${API_URL}?email=${currentUser}&method=getRole`);
  const role = await roleRes.text();
  isAdmin = role === "Admin";

  document.getElementById("loginSection").style.display = "none";
  document.getElementById("appSection").style.display = "block";

  if (!isAdmin) {
    document.getElementById("adminControls").style.display = "none";
  }

  loadData();
}

async function loadData() {
  const res = await fetch(API_URL);
  const data = await res.json();

  const tbody = document.getElementById("inventoryTable");
  tbody.innerHTML = "";
  data.slice(1).forEach(row => {
    let tr = document.createElement("tr");
    row.forEach(cell => {
      let td = document.createElement("td");
      td.textContent = cell;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

async function addItem() {
  const name = document.getElementById("name").value;
  const category = document.getElementById("category").value;
  const stock = document.getElementById("stock").value;

  if (!name || !category || !stock) {
    alert("Please fill all fields!");
    return;
  }

  await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({ action: "add", name, category, stock }),
    headers: { "Content-Type": "application/json" }
  });

  document.getElementById("name").value = "";
  document.getElementById("category").value = "";
  document.getElementById("stock").value = "";

  loadData();
}
