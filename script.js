// ===== ESTADO =====
let products = JSON.parse(localStorage.getItem("productos")) || [];
let editIndex = -1;
let formOpen = false;

// ===== GUARDAR =====
function saveData() {
    localStorage.setItem("productos", JSON.stringify(products));
}

// ===== TOGGLE FORMULARIO =====
function toggleForm() {
    formOpen = !formOpen;
    const panel = document.getElementById("formPanel");
    const btn = document.getElementById("btnToggleForm");
    if (formOpen) {
        panel.classList.remove("collapsed");
        btn.textContent = "✕ Cerrar formulario";
        btn.classList.add("open");
    } else {
        panel.classList.add("collapsed");
        btn.textContent = "+ Agregar Producto";
        btn.classList.remove("open");
        cancelEdit();
    }
}

// ===== AGREGAR / ACTUALIZAR =====
function addProduct() {
    let name     = document.getElementById("productName").value.trim();
    let priceSale= parseFloat(document.getElementById("productPriceSale").value);
    let priceCost= parseFloat(document.getElementById("productPriceCost").value);
    let quantity = parseInt(document.getElementById("productQuantity").value);
    let minStock = parseInt(document.getElementById("productMinStock").value);
    let category = document.getElementById("productCategory").value.trim() || "General";

    if (!name || isNaN(priceSale) || isNaN(priceCost) || isNaN(quantity)) {
        alert("Completá los campos obligatorios: nombre, precio venta, precio costo y cantidad.");
        return;
    }

    let product = {
        name, priceSale, priceCost, quantity,
        minStock: isNaN(minStock) ? 5 : minStock,
        category,
        id: Date.now()
    };

    if (editIndex >= 0) {
        product.id = products[editIndex].id;
        products[editIndex] = product;
        editIndex = -1;
        document.getElementById("formTitle").textContent = "Nuevo Producto";
        document.getElementById("btnCancelar").style.display = "none";
    } else {
        products.push(product);
    }

    saveData();
    clearInputs();
    refreshUI();

    // cerrar formulario al guardar
    if (formOpen) toggleForm();
}

// ===== LIMPIAR INPUTS =====
function clearInputs() {
    ["productName","productPriceSale","productPriceCost",
     "productQuantity","productMinStock","productCategory"].forEach(id => {
        document.getElementById(id).value = "";
    });
}

// ===== CANCELAR EDICION =====
function cancelEdit() {
    editIndex = -1;
    clearInputs();
    document.getElementById("formTitle").textContent = "Nuevo Producto";
    document.getElementById("btnCancelar").style.display = "none";
}

// ===== MOSTRAR PRODUCTOS (TABLA) =====
function displayProducts(data = products) {
    const tbody = document.getElementById("productList");
    const empty = document.getElementById("emptyState");
    const table = document.getElementById("productTable");

    tbody.innerHTML = "";

    if (data.length === 0) {
        table.style.display = "none";
        empty.style.display = "block";
        return;
    }

    table.style.display = "table";
    empty.style.display = "none";

    data.forEach(item => {
        const realIndex = products.indexOf(item);

        let rowClass = "row-ok";
        let badge = `<span class="badge badge-ok">✔ OK</span>`;

        if (item.quantity === 0) {
            rowClass = "row-sin";
            badge = `<span class="badge badge-sin">✕ Sin stock</span>`;
        } else if (item.quantity <= item.minStock) {
            rowClass = "row-bajo";
            badge = `<span class="badge badge-bajo">⚠ Bajo</span>`;
        }

        tbody.innerHTML += `
            <tr class="${rowClass}">
                <td class="td-name">${item.name}</td>
                <td>${item.category}</td>
                <td class="td-mono">$${item.priceSale.toLocaleString('es-AR')}</td>
                <td class="td-mono">$${item.priceCost.toLocaleString('es-AR')}</td>
                <td class="td-mono">${item.quantity}</td>
                <td class="td-mono">${item.minStock}</td>
                <td>${badge}</td>
                <td>
                    <div class="td-actions">
                        <button class="btn-edit" onclick="editProduct(${realIndex})">Editar</button>
                        <button class="btn-delete" onclick="deleteProduct(${realIndex})">Eliminar</button>
                    </div>
                </td>
            </tr>
        `;
    });
}

// ===== EDITAR =====
function editProduct(index) {
    const p = products[index];
    document.getElementById("productName").value      = p.name;
    document.getElementById("productPriceSale").value = p.priceSale;
    document.getElementById("productPriceCost").value = p.priceCost;
    document.getElementById("productQuantity").value  = p.quantity;
    document.getElementById("productMinStock").value  = p.minStock;
    document.getElementById("productCategory").value  = p.category;
    editIndex = index;
    document.getElementById("formTitle").textContent = "Editar Producto";
    document.getElementById("btnCancelar").style.display = "inline-block";

    // abrir formulario si está cerrado
    if (!formOpen) toggleForm();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== ELIMINAR =====
function deleteProduct(index) {
    if (!confirm(`¿Eliminar "${products[index].name}"?`)) return;
    products.splice(index, 1);
    saveData();
    refreshUI();
}

// ===== BUSCAR =====
function searchProduct() {
    const q = document.getElementById("searchBox").value.toLowerCase();
    const filtered = products.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
    displayProducts(filtered);
}

// ===== ORDENAR =====
function sortByName() {
    products.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    saveData(); refreshUI();
}
function sortByPrice() {
    products.sort((a, b) => a.priceSale - b.priceSale);
    saveData(); refreshUI();
}
function sortByStock() {
    products.sort((a, b) => a.quantity - b.quantity);
    saveData(); refreshUI();
}

// ===== BORRAR TODO =====
function clearAll() {
    if (!confirm("¿Borrar TODOS los productos?")) return;
    products = [];
    saveData();
    refreshUI();
}

// ===== DASHBOARD =====
function updateDashboard() {
    const total          = products.length;
    const totalStock     = products.reduce((s, p) => s + p.quantity, 0);
    const valorVenta     = products.reduce((s, p) => s + (p.priceSale * p.quantity), 0);
    const valorCosto     = products.reduce((s, p) => s + (p.priceCost * p.quantity), 0);
    const sinStock       = products.filter(p => p.quantity === 0).length;
    const stockBajo      = products.filter(p => p.quantity > 0 && p.quantity <= p.minStock).length;

    const dash = document.getElementById("dashboard");

    let alertas = "";
    if (sinStock > 0)
        alertas += `<div class="dash-card alerta"><div class="dash-label">Sin stock</div><div class="dash-value">${sinStock}</div></div>`;
    if (stockBajo > 0)
        alertas += `<div class="dash-card alerta"><div class="dash-label">Stock bajo</div><div class="dash-value">${stockBajo}</div></div>`;

    dash.innerHTML = `
        <div class="dash-card"><div class="dash-label">Productos</div><div class="dash-value">${total}</div></div>
        <div class="dash-card"><div class="dash-label">Unidades totales</div><div class="dash-value">${totalStock}</div></div>
        <div class="dash-card"><div class="dash-label">Valor stock (venta)</div><div class="dash-value">$${Math.round(valorVenta).toLocaleString('es-AR')}</div></div>
        <div class="dash-card"><div class="dash-label">Valor stock (costo)</div><div class="dash-value">$${Math.round(valorCosto).toLocaleString('es-AR')}</div></div>
        ${alertas}
    `;
}

// ===== EXPORTAR CSV =====
function exportToExcel() {
    if (products.length === 0) { alert("No hay productos para exportar."); return; }

    let csv = "Nombre;Categoría;Precio Venta;Precio Costo;Stock;Stock Mínimo\n";
    products.forEach(p => {
        csv += `"${p.name}";"${p.category}";${p.priceSale};${p.priceCost};${p.quantity};${p.minStock}\n`;
    });

    const bom  = "\uFEFF";
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href  = url;
    const fecha = new Date().toLocaleDateString('es-AR').replace(/\//g, '-');
    link.download = `stock_${fecha}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

// ===== IMPORTAR CSV =====
function importCSV(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result
            // quitar BOM si existe
            .replace(/^\uFEFF/, "");

        const lines = text.split(/\r?\n/).filter(l => l.trim() !== "");

        // saltar encabezado (primera línea)
        const dataLines = lines.slice(1);

        let importados = 0;
        let errores    = 0;

        dataLines.forEach((line, i) => {
            // separar por ; o ,
            const sep = line.includes(";") ? ";" : ",";
            const cols = line.split(sep).map(c => c.replace(/^"|"$/g, "").trim());

            // cols: [Nombre, Categoría, PrecioVenta, PrecioCosto, Stock, StockMin]
            const name      = cols[0] || "";
            const category  = cols[1] || "General";
            const priceSale = parseFloat(cols[2]);
            const priceCost = parseFloat(cols[3]);
            const quantity  = parseInt(cols[4]);
            const minStock  = parseInt(cols[5]);

            if (!name || isNaN(priceSale) || isNaN(quantity)) {
                errores++;
                return;
            }

            // si ya existe el producto por nombre, actualizar; si no, agregar
            const existing = products.findIndex(p => p.name.toLowerCase() === name.toLowerCase());
            const product = {
                name, category, priceSale, priceCost,
                quantity,
                minStock: isNaN(minStock) ? 5 : minStock,
                id: Date.now() + i
            };

            if (existing >= 0) {
                product.id = products[existing].id;
                products[existing] = product;
            } else {
                products.push(product);
            }
            importados++;
        });

        saveData();
        refreshUI();

        let msg = `✔ Se importaron ${importados} producto(s).`;
        if (errores > 0) msg += `\n⚠ ${errores} fila(s) tenían datos inválidos y fueron ignoradas.`;
        alert(msg);
    };
    reader.readAsText(file, "UTF-8");

    // resetear el input para poder importar el mismo archivo de nuevo
    event.target.value = "";
}

// ===== REFRESCAR UI =====
function refreshUI() {
    displayProducts();
    updateDashboard();
}

// ===== INIT =====
window.onload = function () {
    refreshUI();
};
