// Cargar productos desde localStorage o array vacío
let products = JSON.parse(localStorage.getItem("productos")) || [];
let editIndex = -1;

// ---------------- GUARDAR ----------------
function saveData() {
    localStorage.setItem("productos", JSON.stringify(products));
}

// ---------------- AGREGAR / ACTUALIZAR ----------------
function addProduct() {
    let name = document.getElementById("productName").value.trim();
    let priceSale = parseFloat(document.getElementById("productPriceSale").value);
    let priceCost = parseFloat(document.getElementById("productPriceCost").value);
    let quantity = parseInt(document.getElementById("productQuantity").value);
    let minStock = parseInt(document.getElementById("productMinStock").value);
    let category = document.getElementById("productCategory").value.trim() || "General";

    if (!name || isNaN(priceSale) || isNaN(priceCost) || isNaN(quantity)) {
        alert("Por favor completá todos los campos obligatorios (nombre, precio venta, precio costo y cantidad).");
        return;
    }

    let product = {
        name,
        priceSale,
        priceCost,
        quantity,
        minStock: isNaN(minStock) ? 5 : minStock,
        category,
        id: Date.now()
    };

    if (editIndex >= 0) {
        product.id = products[editIndex].id;
        products[editIndex] = product;
        editIndex = -1;
        document.getElementById("formTitle").textContent = "Agregar Producto";
        document.getElementById("btnCancelar").style.display = "none";
    } else {
        products.push(product);
    }

    saveData();
    clearInputs();
    refreshUI();
}

// ---------------- LIMPIAR INPUTS ----------------
function clearInputs() {
    document.getElementById("productName").value = "";
    document.getElementById("productPriceSale").value = "";
    document.getElementById("productPriceCost").value = "";
    document.getElementById("productQuantity").value = "";
    document.getElementById("productMinStock").value = "";
    document.getElementById("productCategory").value = "";
}

// ---------------- CANCELAR EDICION ----------------
function cancelEdit() {
    editIndex = -1;
    clearInputs();
    document.getElementById("formTitle").textContent = "Agregar Producto";
    document.getElementById("btnCancelar").style.display = "none";
}

// ---------------- MOSTRAR PRODUCTOS ----------------
function displayProducts(data = products) {
    let list = document.getElementById("productList");
    list.innerHTML = "";

    if (data.length === 0) {
        list.innerHTML = "<p style='color:#888; margin-top:20px;'>No se encontraron productos 📦</p>";
        return;
    }

    data.forEach((item, index) => {
        let realIndex = products.indexOf(item);

        let estadoClass = "";
        let badge = "";
        if (item.quantity === 0) {
            estadoClass = "sin-stock";
            badge = `<span class="badge badge-sin">Sin stock</span>`;
        } else if (item.quantity <= item.minStock) {
            estadoClass = "stock-bajo";
            badge = `<span class="badge badge-bajo">⚠ Stock bajo</span>`;
        } else {
            badge = `<span class="badge badge-ok">✔ En stock</span>`;
        }

        list.innerHTML += `
            <div class="producto-card ${estadoClass}">
                <h3>${item.name}</h3>
                <p><b>Categoría:</b> ${item.category}</p>
                <p><b>Precio de venta:</b> $${item.priceSale.toLocaleString('es-AR')}</p>
                <p><b>Precio de costo:</b> $${item.priceCost.toLocaleString('es-AR')}</p>
                <p><b>Stock:</b> ${item.quantity} unidades (mínimo: ${item.minStock})</p>
                ${badge}
                <div style="margin-top:10px;">
                    <button onclick="editProduct(${realIndex})">Editar</button>
                    <button onclick="deleteProduct(${realIndex})" style="background: linear-gradient(135deg, #e74c3c, #c0392b);">Eliminar</button>
                </div>
            </div>
        `;
    });
}

// ---------------- EDITAR ----------------
function editProduct(index) {
    let p = products[index];
    document.getElementById("productName").value = p.name;
    document.getElementById("productPriceSale").value = p.priceSale;
    document.getElementById("productPriceCost").value = p.priceCost;
    document.getElementById("productQuantity").value = p.quantity;
    document.getElementById("productMinStock").value = p.minStock;
    document.getElementById("productCategory").value = p.category;
    editIndex = index;
    document.getElementById("formTitle").textContent = "Editar Producto";
    document.getElementById("btnCancelar").style.display = "inline-block";
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---------------- ELIMINAR ----------------
function deleteProduct(index) {
    if (!confirm(`¿Eliminar "${products[index].name}"?`)) return;
    products.splice(index, 1);
    saveData();
    refreshUI();
}

// ---------------- BUSCAR ----------------
function searchProduct() {
    let query = document.getElementById("searchBox").value.toLowerCase();
    let filtered = products.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
    );
    displayProducts(filtered);
}

// ---------------- ORDENAR POR PRECIO ----------------
function sortByPrice() {
    products.sort((a, b) => a.priceSale - b.priceSale);
    saveData();
    refreshUI();
}

// ---------------- ORDENAR POR STOCK ----------------
function sortByStock() {
    products.sort((a, b) => a.quantity - b.quantity);
    saveData();
    refreshUI();
}

// ---------------- BORRAR TODO ----------------
function clearAll() {
    if (!confirm("¿Seguro que querés borrar TODOS los productos?")) return;
    products = [];
    saveData();
    refreshUI();
}

// ---------------- DASHBOARD ----------------
function updateDashboard() {
    let total = products.length;
    let totalStock = products.reduce((s, p) => s + p.quantity, 0);
    let totalValorVenta = products.reduce((s, p) => s + (p.priceSale * p.quantity), 0);
    let totalValorCosto = products.reduce((s, p) => s + (p.priceCost * p.quantity), 0);
    let sinStock = products.filter(p => p.quantity === 0).length;
    let stockBajo = products.filter(p => p.quantity > 0 && p.quantity <= p.minStock).length;

    let dashboard = document.getElementById("dashboard");
    if (dashboard) {
        dashboard.innerHTML = `
            <h2>Resumen</h2>
            <p>📦 <b>Productos:</b> ${total}</p>
            <p>🔢 <b>Unidades totales:</b> ${totalStock}</p>
            <p>💰 <b>Valor stock (venta):</b> $${Math.round(totalValorVenta).toLocaleString('es-AR')}</p>
            <p>🏷️ <b>Valor stock (costo):</b> $${Math.round(totalValorCosto).toLocaleString('es-AR')}</p>
            ${sinStock > 0 ? `<p class="alerta">🚫 <b>Sin stock:</b> ${sinStock}</p>` : ''}
            ${stockBajo > 0 ? `<p class="alerta">⚠ <b>Stock bajo:</b> ${stockBajo}</p>` : ''}
        `;
    }
}

// ---------------- EXPORTAR A EXCEL ----------------
function exportToExcel() {
    if (products.length === 0) {
        alert("No hay productos para exportar.");
        return;
    }

    // Crear contenido CSV con separador de punto y coma (compatible con Excel en español)
    let csv = "Nombre;Categoría;Precio Venta;Precio Costo;Stock;Stock Mínimo\n";
    products.forEach(p => {
        csv += `"${p.name}";"${p.category}";${p.priceSale};${p.priceCost};${p.quantity};${p.minStock}\n`;
    });

    // Agregar BOM para que Excel reconozca UTF-8 con tildes y ñ
    let bom = "\uFEFF";
    let blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    let url = URL.createObjectURL(blob);

    let link = document.createElement("a");
    link.href = url;
    let fecha = new Date().toLocaleDateString('es-AR').replace(/\//g, '-');
    link.download = `stock_${fecha}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

// ---------------- REFRESCAR UI ----------------
function refreshUI() {
    displayProducts();
    updateDashboard();
}

// ---------------- CARGAR AL INICIO ----------------
window.onload = function () {
    refreshUI();
};
