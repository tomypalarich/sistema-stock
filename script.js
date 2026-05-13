// ================================================================
// DATOS — todo se guarda en localStorage del navegador
// ================================================================
let products = JSON.parse(localStorage.getItem("productos")) || [];
let ventas   = JSON.parse(localStorage.getItem("ventas"))    || [];
let editIndex = -1;

// Carrito temporal (solo existe en memoria mientras se arma la venta)
let carrito = [];

// ================================================================
// PESTAÑAS
// ================================================================
function showTab(id, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    btn.classList.add('active');
    if (id === 'tab-historial') mostrarTodoHistorial();
}

// ================================================================
// GUARDAR DATOS
// ================================================================
function saveData()   { localStorage.setItem("productos", JSON.stringify(products)); }
function saveVentas() { localStorage.setItem("ventas",    JSON.stringify(ventas));   }

// ================================================================
// AGREGAR / ACTUALIZAR PRODUCTO
// ================================================================
function addProduct() {
    let name      = document.getElementById("productName").value.trim();
    let priceSale = parseFloat(document.getElementById("productPriceSale").value);
    let priceCost = parseFloat(document.getElementById("productPriceCost").value);
    let quantity  = parseInt(document.getElementById("productQuantity").value);
    let minStock  = parseInt(document.getElementById("productMinStock").value);
    let category  = document.getElementById("productCategory").value.trim() || "General";

    if (!name || isNaN(priceSale) || isNaN(priceCost) || isNaN(quantity)) {
        alert("Completá todos los campos obligatorios (nombre, precio venta, precio costo y cantidad).");
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
        document.getElementById("formTitle").textContent = "Agregar Producto";
        document.getElementById("btnCancelar").style.display = "none";
    } else {
        products.push(product);
    }

    saveData();
    clearInputs();
    refreshUI();
}

// ================================================================
// LIMPIAR / CANCELAR
// ================================================================
function clearInputs() {
    ["productName","productPriceSale","productPriceCost",
     "productQuantity","productMinStock","productCategory"]
        .forEach(id => document.getElementById(id).value = "");
}
function cancelEdit() {
    editIndex = -1;
    clearInputs();
    document.getElementById("formTitle").textContent = "Agregar Producto";
    document.getElementById("btnCancelar").style.display = "none";
}

// ================================================================
// MOSTRAR PRODUCTOS (tabla tipo Excel)
// ================================================================
function displayProducts(data = products) {
    let tbody = document.getElementById("productList");
    tbody.innerHTML = "";

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:24px; color:var(--text2);">No se encontraron productos 📦</td></tr>`;
        return;
    }

    data.forEach(item => {
        let realIndex = products.indexOf(item);
        let badge = "", tdStock = "";

        if (item.quantity === 0) {
            badge   = `<span class="badge badge-sin">Sin stock</span>`;
            tdStock = `class="sin-stock"`;
        } else if (item.quantity <= item.minStock) {
            badge   = `<span class="badge badge-bajo">⚠ Bajo</span>`;
            tdStock = `class="stock-bajo"`;
        } else {
            badge = `<span class="badge badge-ok">✔ OK</span>`;
        }

        tbody.innerHTML += `
            <tr>
                <td><b>${item.name}</b></td>
                <td>${item.category}</td>
                <td>$${item.priceSale.toLocaleString('es-AR')}</td>
                <td>$${item.priceCost.toLocaleString('es-AR')}</td>
                <td ${tdStock}>${item.quantity} u. <span style="font-size:11px; color:var(--text2);">(mín: ${item.minStock})</span></td>
                <td>${badge}</td>
                <td class="td-acciones">
                    <button onclick="editProduct(${realIndex})">✏ Editar</button>
                    <button onclick="deleteProduct(${realIndex})" class="btn-danger">🗑</button>
                </td>
            </tr>`;
    });
}

// ================================================================
// FORMULARIO COLAPSABLE
// ================================================================
function toggleFormulario() {
    let form = document.getElementById("formContainer");
    form.style.display = form.style.display === "none" ? "block" : "none";
}

// ================================================================
// EDITAR / ELIMINAR
// ================================================================
function editProduct(index) {
    let p = products[index];
    document.getElementById("productName").value      = p.name;
    document.getElementById("productPriceSale").value = p.priceSale;
    document.getElementById("productPriceCost").value = p.priceCost;
    document.getElementById("productQuantity").value  = p.quantity;
    document.getElementById("productMinStock").value  = p.minStock;
    document.getElementById("productCategory").value  = p.category;
    editIndex = index;
    document.getElementById("formTitle").textContent = "Editar Producto";
    document.getElementById("btnCancelar").style.display = "inline-block";
    // Abrir formulario si está cerrado
    document.getElementById("formContainer").style.display = "block";
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
function deleteProduct(index) {
    if (!confirm(`¿Eliminar "${products[index].name}"?`)) return;
    products.splice(index, 1);
    saveData();
    refreshUI();
}

// ================================================================
// BUSCAR / ORDENAR / BORRAR TODO
// ================================================================
function searchProduct() {
    let q = document.getElementById("searchBox").value.toLowerCase();
    displayProducts(products.filter(p =>
        p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)));
}
function sortByName()  { products.sort((a,b) => a.name.localeCompare(b.name, 'es')); saveData(); refreshUI(); }
function sortByPrice() { products.sort((a,b) => a.priceSale - b.priceSale); saveData(); refreshUI(); }
function sortByStock() { products.sort((a,b) => a.quantity - b.quantity);   saveData(); refreshUI(); }
function clearAll() {
    if (!confirm("¿Borrar TODOS los productos?")) return;
    products = []; saveData(); refreshUI();
}

// ================================================================
// DASHBOARD
// ================================================================
function updateDashboard() {
    let total           = products.length;
    let totalStock      = products.reduce((s,p) => s + p.quantity, 0);
    let totalValorVenta = products.reduce((s,p) => s + p.priceSale * p.quantity, 0);
    let totalValorCosto = products.reduce((s,p) => s + p.priceCost * p.quantity, 0);
    let sinStock        = products.filter(p => p.quantity === 0).length;
    let stockBajo       = products.filter(p => p.quantity > 0 && p.quantity <= p.minStock).length;

    document.getElementById("dashboard").innerHTML = `
        <h2>Resumen</h2>
        <p>📦 <b>Productos:</b> ${total}</p>
        <p>🔢 <b>Unidades totales:</b> ${totalStock}</p>
        <p>💰 <b>Valor stock (venta):</b> $${Math.round(totalValorVenta).toLocaleString('es-AR')}</p>
        <p>🏷️ <b>Valor stock (costo):</b> $${Math.round(totalValorCosto).toLocaleString('es-AR')}</p>
        ${sinStock  > 0 ? `<p class="alerta">🚫 <b>Sin stock:</b> ${sinStock}</p>`  : ''}
        ${stockBajo > 0 ? `<p class="alerta">⚠ <b>Stock bajo:</b> ${stockBajo}</p>` : ''}
    `;
}

// ================================================================
// EXPORTAR STOCK A EXCEL
// ================================================================
function exportToExcel() {
    if (products.length === 0) { alert("No hay productos para exportar."); return; }
    let csv = "Nombre;Categoría;Precio Venta;Precio Costo;Stock;Stock Mínimo\n";
    products.forEach(p => {
        csv += `"${p.name}";"${p.category}";${p.priceSale};${p.priceCost};${p.quantity};${p.minStock}\n`;
    });
    descargarCSV(csv, `stock_${fechaHoy()}.csv`);
}

// ================================================================
// SISTEMA DE VENTAS — CARRITO
// ================================================================
function ventaFiltrar() {
    let q = document.getElementById("ventaSearch").value.toLowerCase().trim();
    let sugs = document.getElementById("ventaSugerencias");
    sugs.innerHTML = "";
    if (!q) return;

    let encontrados = products.filter(p =>
        p.quantity > 0 && (p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q))
    ).slice(0, 6);

    if (encontrados.length === 0) {
        sugs.innerHTML = "<p style='color:#888; font-size:13px;'>Sin resultados o sin stock.</p>";
        return;
    }

    encontrados.forEach(p => {
        let div = document.createElement("div");
        div.className = "sugerencia-item";
        div.innerHTML = `<b>${p.name}</b> — $${p.priceSale.toLocaleString('es-AR')} <span style="color:#888;">(stock: ${p.quantity})</span>`;
        div.onclick = () => agregarAlCarrito(p);
        sugs.appendChild(div);
    });
}

function agregarAlCarrito(producto) {
    let existente = carrito.find(c => c.id === producto.id);
    if (existente) {
        existente.cantidad++;
    } else {
        carrito.push({ id: producto.id, nombre: producto.name, precio: producto.priceSale, cantidad: 1 });
    }
    document.getElementById("ventaSearch").value = "";
    document.getElementById("ventaSugerencias").innerHTML = "";
    renderCarrito();
}

function renderCarrito() {
    let lista    = document.getElementById("carritoLista");
    let totalDiv = document.getElementById("carritoTotal");
    lista.innerHTML = "";

    if (carrito.length === 0) {
        lista.innerHTML = "<p style='color:#888; font-size:13px;'>El carrito está vacío.</p>";
        totalDiv.innerHTML = "";
        return;
    }

    let total = 0;
    carrito.forEach((item, i) => {
        let subtotal = item.precio * item.cantidad;
        total += subtotal;
        let fila = document.createElement("div");
        fila.className = "carrito-fila";
        fila.innerHTML = `
            <span style="flex:1;">${item.nombre}</span>
            <span>$${item.precio.toLocaleString('es-AR')} x</span>
            <input type="number" min="1" value="${item.cantidad}" onchange="cambiarCantidad(${i}, this.value)">
            <span>= $${subtotal.toLocaleString('es-AR')}</span>
            <button class="btn-quitar" onclick="quitarDelCarrito(${i})">✕</button>
        `;
        lista.appendChild(fila);
    });

    totalDiv.innerHTML = `<hr><b>TOTAL: $${total.toLocaleString('es-AR')}</b>`;
}

function cambiarCantidad(index, valor) {
    let cant = parseInt(valor);
    if (isNaN(cant) || cant < 1) cant = 1;
    let prod = products.find(p => p.id === carrito[index].id);
    if (prod && cant > prod.quantity) {
        alert(`Stock disponible: ${prod.quantity} unidades.`);
        cant = prod.quantity;
    }
    carrito[index].cantidad = cant;
    renderCarrito();
}

function quitarDelCarrito(index) {
    carrito.splice(index, 1);
    renderCarrito();
}

function limpiarCarrito() {
    carrito = [];
    renderCarrito();
}

function confirmarVenta() {
    if (carrito.length === 0) { alert("El carrito está vacío."); return; }

    for (let item of carrito) {
        let prod = products.find(p => p.id === item.id);
        if (!prod || prod.quantity < item.cantidad) {
            alert(`Stock insuficiente para "${item.nombre}". Disponible: ${prod ? prod.quantity : 0}`);
            return;
        }
    }

    let medioPago = document.querySelector('input[name="medioPago"]:checked').value;
    let total     = carrito.reduce((s,c) => s + c.precio * c.cantidad, 0);
    let ahora     = new Date();

    let venta = {
        id: Date.now(),
        fecha: ahora.toISOString(),
        fechaLegible: ahora.toLocaleDateString('es-AR') + ' ' + ahora.toLocaleTimeString('es-AR', {hour:'2-digit', minute:'2-digit'}),
        medioPago,
        total,
        items: carrito.map(c => ({ nombre: c.nombre, precio: c.precio, cantidad: c.cantidad }))
    };
    ventas.push(venta);
    saveVentas();

    // Descontar stock
    carrito.forEach(item => {
        let prod = products.find(p => p.id === item.id);
        if (prod) prod.quantity -= item.cantidad;
    });
    saveData();

    carrito = [];
    renderCarrito();
    refreshUI();
    alert(`✅ Venta registrada!\nTotal: $${total.toLocaleString('es-AR')}\nPago: ${medioPago}`);
}

// ================================================================
// HISTORIAL
// ================================================================
function mostrarTodoHistorial() {
    document.getElementById("filtroDesde").value = "";
    document.getElementById("filtroHasta").value = "";
    renderHistorial(ventas);
    renderResumenVentas(ventas);
}

function filtrarHistorial() {
    let desde = document.getElementById("filtroDesde").value;
    let hasta = document.getElementById("filtroHasta").value;
    let filtradas = ventas.filter(v => {
        let fecha = v.fecha.substring(0,10);
        if (desde && fecha < desde) return false;
        if (hasta && fecha > hasta) return false;
        return true;
    });
    renderHistorial(filtradas);
    renderResumenVentas(filtradas);
}

function renderHistorial(data) {
    let contenedor = document.getElementById("historialLista");
    contenedor.innerHTML = "";

    if (data.length === 0) {
        contenedor.innerHTML = "<p style='color:#888; text-align:center; margin-top:20px;'>No hay ventas registradas.</p>";
        return;
    }

    [...data].reverse().forEach(v => {
        let tagClass = v.medioPago === "efectivo" ? "tag-efectivo" : "tag-transferencia";
        let tagIcon  = v.medioPago === "efectivo" ? "💵 Efectivo"  : "📲 Transferencia";
        let itemsHTML = v.items.map(i =>
            `<li>${i.nombre} × ${i.cantidad} = $${(i.precio * i.cantidad).toLocaleString('es-AR')}</li>`
        ).join('');

        contenedor.innerHTML += `
            <div class="venta-card">
                <h4>${v.fechaLegible} <span class="tag-pago ${tagClass}">${tagIcon}</span></h4>
                <ul style="margin:6px 0 6px 16px; font-size:13px;">${itemsHTML}</ul>
                <b>Total: $${v.total.toLocaleString('es-AR')}</b>
            </div>`;
    });
}

function renderResumenVentas(data) {
    let ahora = new Date();

    // Inicio de semana (lunes)
    let diaSemana = ahora.getDay() === 0 ? 6 : ahora.getDay() - 1;
    let inicioSemana = new Date(ahora);
    inicioSemana.setDate(ahora.getDate() - diaSemana);
    inicioSemana.setHours(0,0,0,0);

    // Inicio de mes
    let inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

    let ventasSemana = data.filter(v => new Date(v.fecha) >= inicioSemana);
    let ventasMes    = data.filter(v => new Date(v.fecha) >= inicioMes);

    let totalSemana    = ventasSemana.reduce((s,v) => s + v.total, 0);
    let efectivoSemana = ventasSemana.filter(v => v.medioPago === "efectivo").reduce((s,v) => s + v.total, 0);
    let transferSemana = ventasSemana.filter(v => v.medioPago === "transferencia").reduce((s,v) => s + v.total, 0);

    let totalMes    = ventasMes.reduce((s,v) => s + v.total, 0);
    let efectivoMes = ventasMes.filter(v => v.medioPago === "efectivo").reduce((s,v) => s + v.total, 0);
    let transferMes = ventasMes.filter(v => v.medioPago === "transferencia").reduce((s,v) => s + v.total, 0);

    let nombreMes = ahora.toLocaleDateString('es-AR', { month: 'long' });
    nombreMes = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);

    document.getElementById("resumenVentas").innerHTML = `
        <div class="resumen-card">
            <div class="rc-label">📅 Esta semana</div>
            <div class="rc-valor">$${Math.round(totalSemana).toLocaleString('es-AR')}</div>
            <div class="rc-sub">${ventasSemana.length} venta${ventasSemana.length !== 1 ? 's' : ''}</div>
            <div class="rc-sub" style="margin-top:6px;">💵 $${Math.round(efectivoSemana).toLocaleString('es-AR')}</div>
            <div class="rc-sub">📲 $${Math.round(transferSemana).toLocaleString('es-AR')}</div>
        </div>
        <div class="resumen-card">
            <div class="rc-label">🗓 ${nombreMes}</div>
            <div class="rc-valor">$${Math.round(totalMes).toLocaleString('es-AR')}</div>
            <div class="rc-sub">${ventasMes.length} venta${ventasMes.length !== 1 ? 's' : ''}</div>
            <div class="rc-sub" style="margin-top:6px;">💵 $${Math.round(efectivoMes).toLocaleString('es-AR')}</div>
            <div class="rc-sub">📲 $${Math.round(transferMes).toLocaleString('es-AR')}</div>
        </div>
    `;
}

// ================================================================
// EXPORTAR HISTORIAL A EXCEL
// ================================================================
function exportarHistorialExcel() {
    if (ventas.length === 0) { alert("No hay ventas para exportar."); return; }
    let csv = "Fecha;Medio de Pago;Productos;Total\n";
    ventas.forEach(v => {
        let itemsTexto = v.items.map(i => `${i.nombre} x${i.cantidad}`).join(' | ');
        csv += `"${v.fechaLegible}";"${v.medioPago}";"${itemsTexto}";${v.total}\n`;
    });
    descargarCSV(csv, `ventas_${fechaHoy()}.csv`);
}

// ================================================================
// UTILIDADES
// ================================================================
function descargarCSV(csv, nombre) {
    let bom  = "\uFEFF";
    let blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    let url  = URL.createObjectURL(blob);
    let a    = document.createElement("a");
    a.href = url; a.download = nombre; a.click();
    URL.revokeObjectURL(url);
}
function fechaHoy() {
    return new Date().toLocaleDateString('es-AR').replace(/\//g, '-');
}

// ================================================================
// REFRESCAR / INICIO
// ================================================================
function refreshUI() {
    displayProducts();
    updateDashboard();
}
window.onload = function () {
    refreshUI();
    renderCarrito();
};
