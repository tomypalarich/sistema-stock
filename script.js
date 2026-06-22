// ================================================================
// DATOS - ahora viven en Firebase Firestore (antes: localStorage)
// ================================================================
let products = [];
let ventas   = [];
let editIndex = -1;
let carrito = [];

// Referencias a las colecciones de Firestore
const productosRef = db.collection("productos");
const ventasRef     = db.collection("ventas");

// Bandera para saber si ya cargamos los datos por primera vez
let productosListos = false;
let ventasListos     = false;

function marcarConectado() {
    let estado = document.getElementById("syncStatus");
    if (estado) estado.innerHTML = '<i class="ti ti-cloud-check"></i> Conectado';
}
function marcarError() {
    let estado = document.getElementById("syncStatus");
    if (estado) estado.innerHTML = '<i class="ti ti-cloud-off"></i> Sin conexion';
}

// Escuchar cambios en tiempo real de la coleccion "productos"
productosRef.orderBy("name").onSnapshot(
    (snapshot) => {
        products = snapshot.docs.map(doc => ({ ...doc.data(), firebaseId: doc.id, id: doc.data().id || doc.id }));
        productosListos = true;
        marcarConectado();
        refreshUI();
    },
    (error) => {
        console.error("Error leyendo productos:", error);
        marcarError();
    }
);

// Escuchar cambios en tiempo real de la coleccion "ventas"
ventasRef.orderBy("fecha").onSnapshot(
    (snapshot) => {
        ventas = snapshot.docs.map(doc => ({ ...doc.data(), firebaseId: doc.id }));
        ventasListos = true;
        marcarConectado();
        if (document.getElementById("tab-historial")?.classList.contains("active")) {
            mostrarTodoHistorial();
        }
    },
    (error) => {
        console.error("Error leyendo ventas:", error);
        marcarError();
    }
);

// ================================================================
// PESTANAS
// ================================================================
function showTab(id, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    btn.classList.add('active');
    if (id === 'tab-historial') mostrarTodoHistorial();
}

// ================================================================
// GUARDAR DATOS EN FIRESTORE
// ================================================================
// Ya no guardamos "todo el array de una vez": cada producto y cada
// venta es un documento separado en Firestore. Estas funciones
// reemplazan los antiguos saveData()/saveVentas() basados en localStorage.

async function guardarProducto(producto) {
    try {
        if (producto.firebaseId) {
            // Ya existe en Firestore: actualizar ese documento
            await productosRef.doc(producto.firebaseId).set(producto);
        } else {
            // Es nuevo: crear documento nuevo
            await productosRef.add(producto);
        }
    } catch (e) {
        console.error("Error guardando producto:", e);
        alert("No se pudo guardar en la base de datos. Revisa tu conexion a internet.");
    }
}

async function borrarProductoFirebase(firebaseId) {
    try {
        await productosRef.doc(firebaseId).delete();
    } catch (e) {
        console.error("Error borrando producto:", e);
        alert("No se pudo eliminar. Revisa tu conexion a internet.");
    }
}

async function guardarVenta(venta) {
    try {
        if (venta.firebaseId) {
            await ventasRef.doc(venta.firebaseId).set(venta);
        } else {
            await ventasRef.add(venta);
        }
    } catch (e) {
        console.error("Error guardando venta:", e);
        alert("No se pudo registrar la venta. Revisa tu conexion a internet.");
    }
}

async function borrarVentaFirebase(firebaseId) {
    try {
        await ventasRef.doc(firebaseId).delete();
    } catch (e) {
        console.error("Error borrando venta:", e);
        alert("No se pudo eliminar la venta. Revisa tu conexion a internet.");
    }
}

// Compatibilidad: estas dos funciones ya no hacen falta porque cada
// cambio se guarda al instante con las funciones de arriba, pero las
// dejamos vacias por si quedo alguna llamada suelta en el codigo.
function saveData()   {}
function saveVentas() {}

// ================================================================
// AGREGAR / ACTUALIZAR PRODUCTO
// ================================================================
async function addProduct() {
    let name      = document.getElementById("productName").value.trim();
    let priceSale = parseFloat(document.getElementById("productPriceSale").value);
    let priceCost = parseFloat(document.getElementById("productPriceCost").value);
    let quantity  = parseInt(document.getElementById("productQuantity").value);
    let minStock  = parseInt(document.getElementById("productMinStock").value);
    let category  = document.getElementById("productCategory").value.trim() || "General";

    if (!name || isNaN(priceSale) || isNaN(priceCost) || isNaN(quantity)) {
        alert("Completa todos los campos obligatorios.");
        return;
    }

    let product = {
        name, priceSale, priceCost, quantity,
        minStock: isNaN(minStock) ? 5 : minStock,
        category,
        id: Date.now()
    };

    if (editIndex >= 0) {
        // Mantener el mismo id y el firebaseId del producto que se esta editando
        product.id = products[editIndex].id;
        product.firebaseId = products[editIndex].firebaseId;
        editIndex = -1;
        document.getElementById("formTitle").textContent = "Agregar producto";
        document.getElementById("btnCancelar").style.display = "none";
    }

    await guardarProducto(product);
    // No hace falta llamar a refreshUI() aca: el listener en tiempo real
    // de Firestore se encarga de refrescar la tabla solo.
    clearInputs();
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
    document.getElementById("formTitle").textContent = "Agregar producto";
    document.getElementById("btnCancelar").style.display = "none";
}
function toggleFormulario() {
    let form = document.getElementById("formContainer");
    form.style.display = form.style.display === "none" ? "block" : "none";
}

// ================================================================
// MOSTRAR PRODUCTOS
// ================================================================
function displayProducts(data = products) {
    let tbody = document.getElementById("productList");
    tbody.innerHTML = "";

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:28px; color:#6b7a99;">No se encontraron productos</td></tr>`;
        return;
    }

    data.forEach(item => {
        let realIndex = products.indexOf(item);
        let badge = "", tdStock = "";

        if (item.quantity === 0) {
            badge   = `<span class="badge badge-sin"><i class="ti ti-ban"></i> Sin stock</span>`;
            tdStock = `class="sin-stock"`;
        } else if (item.quantity <= item.minStock) {
            badge   = `<span class="badge badge-bajo"><i class="ti ti-alert-triangle"></i> Stock bajo</span>`;
            tdStock = `class="stock-bajo"`;
        } else {
            badge = `<span class="badge badge-ok"><i class="ti ti-circle-check"></i> En stock</span>`;
        }

        tbody.innerHTML += `
            <tr>
                <td><span style="font-weight:500;">${item.name}</span></td>
                <td class="muted">${item.category}</td>
                <td>$${item.priceSale.toLocaleString('es-AR')}</td>
                <td class="muted">$${item.priceCost.toLocaleString('es-AR')}</td>
                <td ${tdStock}>${item.quantity} u. <span style="font-size:11px; color:#a0abbf;">(min: ${item.minStock})</span></td>
                <td>${badge}</td>
                <td class="td-acciones">
                    <button class="btn" onclick="editProduct(${realIndex})"><i class="ti ti-edit"></i> Editar</button>
                    <button class="btn btn-danger-outline" onclick="deleteProduct(${realIndex})"><i class="ti ti-trash"></i></button>
                </td>
            </tr>`;
    });
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
    document.getElementById("formTitle").textContent = "Editar producto";
    document.getElementById("btnCancelar").style.display = "inline-flex";
    document.getElementById("formContainer").style.display = "block";
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
async function deleteProduct(index) {
    if (!confirm(`Eliminar "${products[index].name}"?`)) return;
    await borrarProductoFirebase(products[index].firebaseId);
}

// ================================================================
// BUSCAR / ORDENAR / BORRAR TODO
// ================================================================
function searchProduct() {
    let q = document.getElementById("searchBox").value.toLowerCase();
    displayProducts(products.filter(p =>
        p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)));
}
function sortByName()  { products.sort((a,b) => a.name.localeCompare(b.name, 'es')); displayProducts(); }
function sortByPrice() { products.sort((a,b) => a.priceSale - b.priceSale); displayProducts(); }
function sortByStock() { products.sort((a,b) => a.quantity - b.quantity); displayProducts(); }
async function clearAll() {
    if (!confirm("Borrar TODOS los productos? Esta accion no se puede deshacer.")) return;
    let lote = db.batch();
    products.forEach(p => lote.delete(productosRef.doc(p.firebaseId)));
    try {
        await lote.commit();
    } catch (e) {
        console.error("Error borrando todo:", e);
        alert("No se pudo borrar todo. Revisa tu conexion.");
    }
}

// ================================================================
// DASHBOARD
// ================================================================
function updateDashboard() {
    let total           = products.length;
    let totalStock      = products.reduce((s,p) => s + p.quantity, 0);
    let totalValorVenta = products.reduce((s,p) => s + p.priceSale * p.quantity, 0);
    let sinStock        = products.filter(p => p.quantity === 0).length;
    let stockBajo       = products.filter(p => p.quantity > 0 && p.quantity <= p.minStock).length;

    document.getElementById("dashboard").innerHTML = `
        <div class="stat-card"><div class="label">Total productos</div><div class="value">${total}</div></div>
        <div class="stat-card"><div class="label">Unidades en stock</div><div class="value">${totalStock}</div></div>
        <div class="stat-card"><div class="label">Valor stock (venta)</div><div class="value" style="font-size:17px;">$${Math.round(totalValorVenta).toLocaleString('es-AR')}</div></div>
        <div class="stat-card"><div class="label">Sin stock</div><div class="value ${sinStock > 0 ? 'danger' : ''}">${sinStock}</div></div>
        ${stockBajo > 0 ? `<div class="stat-card"><div class="label">Stock bajo</div><div class="value danger">${stockBajo}</div></div>` : ''}
    `;
}

// ================================================================
// EXPORTAR STOCK A EXCEL
// ================================================================
function exportToExcel() {
    if (products.length === 0) { alert("No hay productos para exportar."); return; }
    let csv = "Nombre;Categoria;Precio Venta;Precio Costo;Stock;Stock Minimo\n";
    products.forEach(p => {
        csv += `"${p.name}";"${p.category}";${p.priceSale};${p.priceCost};${p.quantity};${p.minStock}\n`;
    });
    descargarCSV(csv, `stock_${fechaHoy()}.csv`);
}

// ================================================================
// IMPORTAR DESDE EXCEL/CSV
// ================================================================
function importarExcel() {
    document.getElementById("inputImportar").click();
}

function procesarImportacion(event) {
    let file = event.target.files[0];
    if (!file) return;

    let reader = new FileReader();
    reader.onload = async function(e) {
        let texto = e.target.result;
        // Detectar separador: punto y coma o coma
        let separador = texto.includes(';') ? ';' : ',';
        let lineas = texto.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        if (lineas.length < 2) {
            alert("El archivo no tiene datos suficientes.");
            return;
        }

        // Leer encabezados (primera fila)
        let headers = lineas[0].split(separador).map(h => h.replace(/"/g, '').trim().toLowerCase());

        // Mapear columnas flexiblemente
        let iNombre    = headers.findIndex(h => h.includes('nombre') || h.includes('product') || h.includes('descripcion'));
        let iCategoria = headers.findIndex(h => h.includes('categ'));
        let iVenta     = headers.findIndex(h => h.includes('venta') || h.includes('precio') || h.includes('price'));
        let iCosto     = headers.findIndex(h => h.includes('costo') || h.includes('cost'));
        let iStock     = headers.findIndex(h => h.includes('stock') && !h.includes('min'));
        let iMinStock  = headers.findIndex(h => h.includes('min'));

        if (iNombre === -1 || iVenta === -1) {
            alert("No se encontraron las columnas requeridas.\nEl archivo debe tener al menos: Nombre y Precio Venta.");
            return;
        }

        let importados = 0;
        let errores = 0;
        let lote = db.batch();
        let operacionesEnLote = 0;

        for (let i = 1; i < lineas.length; i++) {
            // Parsear respetando comillas
            let cols = parsearCSVLinea(lineas[i], separador);

            let nombre = cols[iNombre] ? cols[iNombre].replace(/"/g, '').trim() : '';
            if (!nombre) continue;

            let priceSale = iVenta    >= 0 ? parseFloat(cols[iVenta]?.replace(/[^0-9.,-]/g, '').replace(',', '.'))  : 0;
            let priceCost = iCosto    >= 0 ? parseFloat(cols[iCosto]?.replace(/[^0-9.,-]/g, '').replace(',', '.'))  : 0;
            let quantity  = iStock    >= 0 ? parseInt(cols[iStock])   : 0;
            let minStock  = iMinStock >= 0 ? parseInt(cols[iMinStock]) : 5;
            let category  = iCategoria >= 0 ? cols[iCategoria]?.replace(/"/g, '').trim() : 'General';

            if (isNaN(priceSale)) { errores++; continue; }

            // Si ya existe el producto (mismo nombre), actualiza; si no, agrega
            let existente = products.find(p => p.name.toLowerCase() === nombre.toLowerCase());
            if (existente) {
                let actualizado = {
                    ...existente,
                    priceSale: priceSale || existente.priceSale,
                    priceCost: isNaN(priceCost) ? existente.priceCost : priceCost,
                    quantity:  isNaN(quantity)  ? existente.quantity  : quantity,
                    minStock:  isNaN(minStock)  ? existente.minStock  : minStock,
                    category:  category || existente.category
                };
                delete actualizado.firebaseId;
                lote.set(productosRef.doc(existente.firebaseId), actualizado);
            } else {
                let nuevoDoc = productosRef.doc(); // genera un ID nuevo
                lote.set(nuevoDoc, {
                    id: Date.now() + i,
                    name: nombre,
                    priceSale: priceSale || 0,
                    priceCost: isNaN(priceCost) ? 0 : priceCost,
                    quantity:  isNaN(quantity)  ? 0 : quantity,
                    minStock:  isNaN(minStock)  ? 5 : minStock,
                    category:  category || 'General'
                });
            }
            importados++;
            operacionesEnLote++;

            // Firestore permite maximo 500 operaciones por lote
            if (operacionesEnLote >= 450) {
                await lote.commit();
                lote = db.batch();
                operacionesEnLote = 0;
            }
        }

        try {
            if (operacionesEnLote > 0) await lote.commit();
            event.target.value = "";
            let msg = `Importacion completada.\n${importados} producto${importados !== 1 ? 's' : ''} importado${importados !== 1 ? 's' : ''}.`;
            if (errores > 0) msg += `\n${errores} fila${errores !== 1 ? 's' : ''} con error ignorada${errores !== 1 ? 's' : ''}.`;
            alert(msg);
        } catch (err) {
            console.error("Error importando:", err);
            alert("Hubo un error guardando los datos en la base. Revisa tu conexion e intenta de nuevo.");
        }
    };
    reader.readAsText(file, 'UTF-8');
}

function parsearCSVLinea(linea, sep) {
    let cols = [];
    let actual = '';
    let enComillas = false;
    for (let c of linea) {
        if (c === '"') { enComillas = !enComillas; }
        else if (c === sep && !enComillas) { cols.push(actual); actual = ''; }
        else { actual += c; }
    }
    cols.push(actual);
    return cols;
}

// ================================================================
// SISTEMA DE VENTAS - CARRITO
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
        sugs.innerHTML = "<p style='color:#aab4c8; font-size:13px; padding:8px 0;'>Sin resultados o sin stock.</p>";
        return;
    }

    encontrados.forEach(p => {
        let div = document.createElement("div");
        div.className = "sugerencia-item";
        div.innerHTML = `<span><b>${p.name}</b> <span class="muted">${p.category}</span></span><span>$${p.priceSale.toLocaleString('es-AR')} <span class="muted">(${p.quantity} u.)</span></span>`;
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
    if (!lista) return;
    lista.innerHTML = "";

    if (carrito.length === 0) {
        lista.innerHTML = "<p style='color:#aab4c8; font-size:13px; padding:8px 0;'>El carrito esta vacio.</p>";
        totalDiv.innerHTML = "";
        actualizarPagoMixto(0);
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
            <span class="muted">$${item.precio.toLocaleString('es-AR')} x</span>
            <input type="number" min="1" value="${item.cantidad}" onchange="cambiarCantidad(${i}, this.value)">
            <span style="font-weight:500; min-width:80px; text-align:right;">$${subtotal.toLocaleString('es-AR')}</span>
            <button class="btn btn-danger-outline btn-quitar" onclick="quitarDelCarrito(${i})"><i class="ti ti-x"></i></button>
        `;
        lista.appendChild(fila);
    });

    totalDiv.innerHTML = `<div class="carrito-total-line">Total: <span>$${total.toLocaleString('es-AR')}</span></div>`;
    actualizarPagoMixto(total);
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

// ================================================================
// PAGO MIXTO
// ================================================================
function actualizarPagoMixto(total) {
    let tipo = document.querySelector('input[name="medioPago"]:checked');
    if (!tipo || tipo.value !== 'mixto') return;
    let efec = parseFloat(document.getElementById("pagoEfectivo")?.value) || 0;
    let trans = total - efec;
    let spanTrans = document.getElementById("pagoTransferenciaAuto");
    if (spanTrans) spanTrans.textContent = '$' + Math.max(0, trans).toLocaleString('es-AR');
}

function onMedioPagoChange() {
    let tipo = document.querySelector('input[name="medioPago"]:checked').value;
    let mixtoPanel = document.getElementById("pagoMixtoPanel");
    mixtoPanel.style.display = tipo === 'mixto' ? 'block' : 'none';
    if (tipo === 'mixto') {
        let total = carrito.reduce((s,c) => s + c.precio * c.cantidad, 0);
        actualizarPagoMixto(total);
    }
}

function onEfectivoInput() {
    let total = carrito.reduce((s,c) => s + c.precio * c.cantidad, 0);
    actualizarPagoMixto(total);
}

async function confirmarVenta() {
    if (carrito.length === 0) { alert("El carrito esta vacio."); return; }

    for (let item of carrito) {
        let prod = products.find(p => p.id === item.id);
        if (!prod || prod.quantity < item.cantidad) {
            alert(`Stock insuficiente para "${item.nombre}". Disponible: ${prod ? prod.quantity : 0}`);
            return;
        }
    }

    let total = carrito.reduce((s,c) => s + c.precio * c.cantidad, 0);
    let tipo  = document.querySelector('input[name="medioPago"]:checked').value;
    let medioPago, pagoDetalle;

    if (tipo === 'mixto') {
        let efec  = parseFloat(document.getElementById("pagoEfectivo").value) || 0;
        let trans = total - efec;
        if (efec < 0 || trans < 0 || efec > total) {
            alert("Los montos del pago mixto no son validos.");
            return;
        }
        medioPago   = 'mixto';
        pagoDetalle = { efectivo: efec, transferencia: trans };
    } else {
        medioPago   = tipo;
        pagoDetalle = null;
    }

    let ahora = new Date();
    let venta = {
        id: Date.now(),
        fecha: ahora.toISOString(),
        fechaLegible: ahora.toLocaleDateString('es-AR') + ' ' + ahora.toLocaleTimeString('es-AR', {hour:'2-digit', minute:'2-digit'}),
        medioPago,
        pagoDetalle,
        total,
        items: carrito.map(c => ({ nombre: c.nombre, precio: c.precio, cantidad: c.cantidad }))
    };

    // Guardar la venta y descontar el stock en un solo lote
    // (asi se hace todo junto o no se hace nada si falla la conexion)
    try {
        let lote = db.batch();
        lote.set(ventasRef.doc(), venta);
        carrito.forEach(item => {
            let prod = products.find(p => p.id === item.id);
            if (prod) {
                lote.update(productosRef.doc(prod.firebaseId), {
                    quantity: prod.quantity - item.cantidad
                });
            }
        });
        await lote.commit();
    } catch (e) {
        console.error("Error registrando la venta:", e);
        alert("No se pudo registrar la venta. Revisa tu conexion a internet e intenta de nuevo.");
        return;
    }

    carrito = [];
    renderCarrito();
    document.getElementById("pagoEfectivo") && (document.getElementById("pagoEfectivo").value = "");
    document.getElementById("pagoMixtoPanel").style.display = "none";
    document.querySelector('input[name="medioPago"][value="efectivo"]').checked = true;

    let msgPago = tipo === 'mixto'
        ? `Efectivo: $${pagoDetalle.efectivo.toLocaleString('es-AR')} / Transferencia: $${pagoDetalle.transferencia.toLocaleString('es-AR')}`
        : tipo;
    alert(`Venta registrada!\nTotal: $${total.toLocaleString('es-AR')}\nPago: ${msgPago}`);
}

// ================================================================
// HISTORIAL
// ================================================================
function mostrarTodoHistorial() {
    let desde = document.getElementById("filtroDesde");
    let hasta = document.getElementById("filtroHasta");
    if (desde) desde.value = "";
    if (hasta) hasta.value = "";
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
        contenedor.innerHTML = "<p style='color:#aab4c8; text-align:center; margin-top:20px;'>No hay ventas registradas.</p>";
        return;
    }

    [...data].reverse().forEach(v => {
        let tagClass, tagTexto;
        if (v.medioPago === 'mixto') {
            tagClass = 'tag-mixto';
            tagTexto = `<i class="ti ti-arrows-exchange"></i> Mixto`;
        } else if (v.medioPago === 'efectivo') {
            tagClass = 'tag-efectivo';
            tagTexto = `<i class="ti ti-cash"></i> Efectivo`;
        } else {
            tagClass = 'tag-transferencia';
            tagTexto = `<i class="ti ti-transfer"></i> Transferencia`;
        }

        let detalleHTML = '';
        if (v.medioPago === 'mixto' && v.pagoDetalle) {
            detalleHTML = `<div class="venta-mixto-detalle">
                <span><i class="ti ti-cash"></i> Efectivo: $${v.pagoDetalle.efectivo.toLocaleString('es-AR')}</span>
                <span><i class="ti ti-transfer"></i> Transf.: $${v.pagoDetalle.transferencia.toLocaleString('es-AR')}</span>
            </div>`;
        }

        let itemsHTML = v.items.map(i =>
            `<li>${i.nombre} x ${i.cantidad} = $${(i.precio * i.cantidad).toLocaleString('es-AR')}</li>`
        ).join('');

        let ventaIndex = ventas.indexOf(v);

        contenedor.innerHTML += `
            <div class="venta-card ${v.medioPago}">
                <div class="venta-card-header">
                    <div>
                        <span class="venta-fecha">${v.fechaLegible}</span>
                        <span class="tag-pago ${tagClass}">${tagTexto}</span>
                    </div>
                    <div class="venta-acciones">
                        <button class="btn btn-sm" onclick="editarVenta(${ventaIndex})"><i class="ti ti-edit"></i> Editar</button>
                        <button class="btn btn-danger-outline btn-sm" onclick="eliminarVenta(${ventaIndex})"><i class="ti ti-trash"></i></button>
                    </div>
                </div>
                <ul class="venta-items">${itemsHTML}</ul>
                ${detalleHTML}
                <div class="venta-total">Total: $${v.total.toLocaleString('es-AR')}</div>
            </div>`;
    });
}

// ================================================================
// EDITAR / ELIMINAR VENTAS
// ================================================================
async function eliminarVenta(index) {
    let v = ventas[index];
    if (!confirm(`Eliminar la venta del ${v.fechaLegible} por $${v.total.toLocaleString('es-AR')}?`)) return;

    try {
        let lote = db.batch();
        lote.delete(ventasRef.doc(v.firebaseId));
        // Devolver el stock de cada producto vendido
        v.items.forEach(item => {
            let prod = products.find(p => p.name === item.nombre);
            if (prod) {
                lote.update(productosRef.doc(prod.firebaseId), {
                    quantity: prod.quantity + item.cantidad
                });
            }
        });
        await lote.commit();
    } catch (e) {
        console.error("Error eliminando venta:", e);
        alert("No se pudo eliminar la venta. Revisa tu conexion.");
        return;
    }

    renderHistorial(ventas);
    renderResumenVentas(ventas);
}

function editarVenta(index) {
    let v = ventas[index];
    let total = v.total;

    // Opciones de medio de pago
    let opcionesPago = ['efectivo', 'transferencia', 'mixto'];
    let optHTML = opcionesPago.map(op =>
        `<option value="${op}" ${v.medioPago === op ? 'selected' : ''}>${op.charAt(0).toUpperCase() + op.slice(1)}</option>`
    ).join('');

    let mixtoHTML = v.medioPago === 'mixto' && v.pagoDetalle ? `
        <div id="editMixtoPanel" style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap;">
            <div class="form-field" style="flex:1;">
                <label>Efectivo ($)</label>
                <input type="number" id="editEfectivo" value="${v.pagoDetalle.efectivo}" min="0" max="${total}" oninput="onEditMixtoInput(${total})">
            </div>
            <div class="form-field" style="flex:1;">
                <label>Transferencia ($)</label>
                <input type="number" id="editTransferencia" value="${v.pagoDetalle.transferencia}" readonly style="background:#f8fafc;">
            </div>
        </div>` : `<div id="editMixtoPanel" style="display:none; margin-top:10px;">
            <div style="display:flex; gap:10px; flex-wrap:wrap;">
                <div class="form-field" style="flex:1;"><label>Efectivo ($)</label><input type="number" id="editEfectivo" value="0" min="0" max="${total}" oninput="onEditMixtoInput(${total})"></div>
                <div class="form-field" style="flex:1;"><label>Transferencia ($)</label><input type="number" id="editTransferencia" value="${total}" readonly style="background:#f8fafc;"></div>
            </div>
        </div>`;

    // Crear modal
    let modal = document.createElement('div');
    modal.id = 'editModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-box">
            <div class="modal-header">
                <span>Editar venta - ${v.fechaLegible}</span>
                <button class="btn-close" onclick="cerrarModal()"><i class="ti ti-x"></i></button>
            </div>
            <div class="modal-body">
                <div class="form-field" style="margin-bottom:12px;">
                    <label>Medio de pago</label>
                    <select id="editMedioPago" class="select-input" onchange="onEditPagoChange(${total})">${optHTML}</select>
                </div>
                ${mixtoHTML}
                <p style="font-size:12px; color:#7a8aaa; margin-top:12px;">
                    <i class="ti ti-info-circle"></i> Solo se puede editar el medio de pago. Para cambiar productos, elimina la venta y registrala de nuevo.
                </p>
            </div>
            <div class="modal-footer">
                <button class="btn" onclick="cerrarModal()">Cancelar</button>
                <button class="btn btn-primary" onclick="guardarEdicionVenta(${index}, ${total})"><i class="ti ti-device-floppy"></i> Guardar</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
}

function onEditPagoChange(total) {
    let tipo = document.getElementById("editMedioPago").value;
    let panel = document.getElementById("editMixtoPanel");
    panel.style.display = tipo === 'mixto' ? 'flex' : 'none';
    if (tipo === 'mixto') {
        document.getElementById("editEfectivo").value = 0;
        document.getElementById("editTransferencia").value = total;
    }
}

function onEditMixtoInput(total) {
    let efec = parseFloat(document.getElementById("editEfectivo").value) || 0;
    document.getElementById("editTransferencia").value = Math.max(0, total - efec);
}

async function guardarEdicionVenta(index, total) {
    let tipo = document.getElementById("editMedioPago").value;
    let pagoDetalle = null;

    if (tipo === 'mixto') {
        let efec  = parseFloat(document.getElementById("editEfectivo").value) || 0;
        let trans = parseFloat(document.getElementById("editTransferencia").value) || 0;
        if (efec < 0 || trans < 0 || Math.round(efec + trans) !== Math.round(total)) {
            alert("Los montos no suman el total de la venta.");
            return;
        }
        pagoDetalle = { efectivo: efec, transferencia: trans };
    }

    let v = ventas[index];
    try {
        await ventasRef.doc(v.firebaseId).update({
            medioPago: tipo,
            pagoDetalle: pagoDetalle
        });
    } catch (e) {
        console.error("Error guardando edicion de venta:", e);
        alert("No se pudo guardar el cambio. Revisa tu conexion.");
        return;
    }

    cerrarModal();
    renderHistorial(ventas);
    renderResumenVentas(ventas);
}

function cerrarModal() {
    let m = document.getElementById("editModal");
    if (m) m.remove();
}

// ================================================================
// RESUMEN VENTAS
// ================================================================
function renderResumenVentas(data) {
    let ahora = new Date();
    let diaSemana = ahora.getDay() === 0 ? 6 : ahora.getDay() - 1;
    let inicioSemana = new Date(ahora);
    inicioSemana.setDate(ahora.getDate() - diaSemana);
    inicioSemana.setHours(0,0,0,0);
    let inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

    let vSemana = data.filter(v => new Date(v.fecha) >= inicioSemana);
    let vMes    = data.filter(v => new Date(v.fecha) >= inicioMes);

    function sumarPorMedio(arr, medio) {
        return arr.reduce((s,v) => {
            if (v.medioPago === medio) return s + v.total;
            if (v.medioPago === 'mixto' && v.pagoDetalle) {
                return s + (medio === 'efectivo' ? v.pagoDetalle.efectivo : v.pagoDetalle.transferencia);
            }
            return s;
        }, 0);
    }

    let totalSemana = vSemana.reduce((s,v) => s + v.total, 0);
    let efecSemana  = sumarPorMedio(vSemana, 'efectivo');
    let transSemana = sumarPorMedio(vSemana, 'transferencia');

    let totalMes = vMes.reduce((s,v) => s + v.total, 0);
    let efecMes  = sumarPorMedio(vMes, 'efectivo');
    let transMes = sumarPorMedio(vMes, 'transferencia');

    let nombreMes = ahora.toLocaleDateString('es-AR', { month: 'long' });
    nombreMes = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);

    document.getElementById("resumenVentas").innerHTML = `
        <div class="resumen-card">
            <div class="rc-label">Esta semana</div>
            <div class="rc-valor">$${Math.round(totalSemana).toLocaleString('es-AR')}</div>
            <div class="rc-sub">${vSemana.length} venta${vSemana.length !== 1 ? 's' : ''}</div>
            <div class="rc-sub" style="margin-top:6px;"><i class="ti ti-cash"></i> $${Math.round(efecSemana).toLocaleString('es-AR')}</div>
            <div class="rc-sub"><i class="ti ti-transfer"></i> $${Math.round(transSemana).toLocaleString('es-AR')}</div>
        </div>
        <div class="resumen-card">
            <div class="rc-label">${nombreMes}</div>
            <div class="rc-valor">$${Math.round(totalMes).toLocaleString('es-AR')}</div>
            <div class="rc-sub">${vMes.length} venta${vMes.length !== 1 ? 's' : ''}</div>
            <div class="rc-sub" style="margin-top:6px;"><i class="ti ti-cash"></i> $${Math.round(efecMes).toLocaleString('es-AR')}</div>
            <div class="rc-sub"><i class="ti ti-transfer"></i> $${Math.round(transMes).toLocaleString('es-AR')}</div>
        </div>
    `;
}

// ================================================================
// EXPORTAR HISTORIAL
// ================================================================
function exportarHistorialExcel() {
    if (ventas.length === 0) { alert("No hay ventas para exportar."); return; }
    let csv = "Fecha;Medio de Pago;Efectivo;Transferencia;Productos;Total\n";
    ventas.forEach(v => {
        let efec  = v.medioPago === 'efectivo' ? v.total : (v.pagoDetalle ? v.pagoDetalle.efectivo : 0);
        let trans = v.medioPago === 'transferencia' ? v.total : (v.pagoDetalle ? v.pagoDetalle.transferencia : 0);
        let items = v.items.map(i => `${i.nombre} x${i.cantidad}`).join(' | ');
        csv += `"${v.fechaLegible}";"${v.medioPago}";${efec};${trans};"${items}";${v.total}\n`;
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
// ================================================================
// INICIO
// ================================================================
// Ya no hace falta llamar a refreshUI() aca: los listeners en tiempo
// real de Firestore (mas arriba en el archivo) se disparan solos en
// cuanto cargan los datos, incluso la primera vez.
window.onload = function () {
    if (document.getElementById("carritoLista")) renderCarrito();
};
