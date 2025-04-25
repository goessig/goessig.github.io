let capacitacionesData = [];
let filteredData = [];

function loadCapacitacionData() {
    // Verificar sesión y permisos
    const usuario = sessionStorage.getItem('usuario');
    const rol = sessionStorage.getItem('rol');

    if (!usuario || !rol) {
        window.location.href = 'index.html';
        return;
    }

    // Solo permitir acceso a administradores (hacer la comparación case-insensitive)
    if (rol.toLowerCase() !== 'administrador') {
        document.body.innerHTML = `
            <div class="error-container">
                <i class="fas fa-exclamation-circle"></i>
                <h2>Acceso Denegado</h2>
                <p>No tienes permisos para ver esta sección.</p>
            </div>
        `;
        return;
    }

    const timestamp = new Date().getTime();
    const callbackName = 'callback_' + timestamp;

    // Crear la función de callback global
    window[callbackName] = function(response) {
        if (response.status === 'success') {
            capacitacionesData = response.data;
            console.log('Datos cargados:', capacitacionesData);
            renderTable();
            initializeSearch(); // Inicializar el buscador una sola vez
        }
    };

    // Crear y añadir el script
    const script = document.createElement('script');
    script.src = `https://script.google.com/macros/s/AKfycbxyelmWN4-BYIUqnq9c4g7gBCFZjSdbT3Z0mAGs0IU/dev?action=getCapacitacion&callback=${callbackName}`;
    document.body.appendChild(script);
}

function initializeSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            renderTable(e.target.value);
        }, 300));
        searchInput.focus();
    }
}

function renderTable(searchTerm = '') {
    // Primero agrupar por nombre para mostrar personas únicas
    const personasUnicas = {};
    capacitacionesData.forEach(item => {
        if (!personasUnicas[item.nombre]) {
            personasUnicas[item.nombre] = {
                nombre: item.nombre,
                dni: item.dni,
                cargo: item.cargo,
                totalCapacitaciones: 0
            };
        }
        if (item.tema) {
            personasUnicas[item.nombre].totalCapacitaciones++;
        }
    });

    // Filtrar personas según el término de búsqueda
    filteredData = Object.values(personasUnicas);
    if (searchTerm) {
        const searchTermLower = searchTerm.toLowerCase();
        filteredData = filteredData.filter(persona => 
            persona.nombre.toLowerCase().includes(searchTermLower) ||
            persona.dni.toLowerCase().includes(searchTermLower) ||
            persona.cargo.toLowerCase().includes(searchTermLower)
        );
    }

    let html = `
        <div class="search-container">
            <input type="text" 
                   id="searchInput" 
                   placeholder="Buscar por nombre, DNI o cargo..." 
                   class="search-input"
                   value="${searchTerm}">
        </div>
        <table class="datatable">
            <thead>
                <tr>
                    <th>Nombre</th>
                    <th>DNI</th>
                    <th>Cargo</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
    `;

    filteredData.forEach(persona => {
        html += `
            <tr>
                <td>${persona.nombre}</td>
                <td>${persona.dni}</td>
                <td>${persona.cargo}</td>
                <td>
                    <button class="btn-ver" onclick="mostrarCapacitaciones('${persona.nombre}')">
                        <i class="fas fa-graduation-cap"></i> Ver Capacitaciones (${persona.totalCapacitaciones})
                    </button>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    document.getElementById('tableContainer').innerHTML = html;

    // Mantener el foco en el input si ya existía un término de búsqueda
    if (searchTerm) {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.focus();
            // Mover el cursor al final del texto
            const len = searchInput.value.length;
            searchInput.setSelectionRange(len, len);
        }
    }
}

function mostrarCapacitaciones(nombre) {
    const modal = document.getElementById('capacitacionesModal');
    const grid = document.getElementById('capacitacionesGrid');
    const title = document.getElementById('modalTitle').querySelector('span');
    
    // Obtener la fecha de ingreso de la persona
    const persona = capacitacionesData.find(item => item.nombre === nombre);
    const fechaIngreso = parseFecha(persona.fechaIngreso);
    
    console.log('Fecha de ingreso:', fechaIngreso);

    // Obtener TODAS las capacitaciones (columna G) y sus fechas (columna H)
    const todasLasCapacitaciones = capacitacionesData.filter(item => item.tema);
    console.log('Total capacitaciones disponibles:', todasLasCapacitaciones);

    // Filtrar las capacitaciones cuya fecha sea posterior a la fecha de ingreso
    const capacitacionesValidas = todasLasCapacitaciones.filter(cap => {
        const fechaCapacitacion = parseFecha(cap.fechaCapacitacion);
        const esValida = fechaCapacitacion >= fechaIngreso;
        
        console.log('Evaluando capacitación:', {
            tema: cap.tema,
            fechaCap: cap.fechaCapacitacion,
            fechaIng: persona.fechaIngreso,
            esValida: esValida
        });
        
        return esValida;
    });

    title.textContent = `Capacitaciones de ${nombre}`;
    
    if (capacitacionesValidas.length === 0) {
        grid.innerHTML = '<p>No hay capacitaciones posteriores a la fecha de ingreso</p>';
        modal.style.display = 'block';
        return;
    }

    let gridHTML = '';
    capacitacionesValidas.forEach(cap => {
        // Escapar caracteres especiales para el onclick
        const nombreEscapado = nombre.replace(/'/g, "\\'");
        const temaEscapado = cap.tema.replace(/'/g, "\\'");
        
        gridHTML += `
            <div class="capacitacion-card" 
                 data-nombre="${encodeURIComponent(nombre)}"
                 data-tema="${encodeURIComponent(cap.tema)}"
                 data-fecha="${encodeURIComponent(cap.fechaCapacitacion)}"
                 onclick="mostrarDiplomaSeguro(this)">
                <h3>${cap.tema}</h3>
                <p>Fecha: ${cap.fechaCapacitacion}</p>
            </div>
        `;
    });
    
    grid.innerHTML = gridHTML;
    modal.style.display = 'block';
    setTimeout(() => modal.classList.add('show'), 10);
}

function mostrarDiplomaSeguro(element) {
    const nombre = decodeURIComponent(element.dataset.nombre);
    const tema = decodeURIComponent(element.dataset.tema);
    const fecha = decodeURIComponent(element.dataset.fecha);
    mostrarDiploma(nombre, tema, fecha);
}

function mostrarDiploma(nombre, tema, fecha) {
    const modal = document.getElementById('diplomaModal');
    const content = document.getElementById('diplomaContent');

    const html = `
        <div class="diploma">
            <div class="diploma-header">
                <h1>Grupo de Operaciones Especiales y Seguridad SAC</h1>
            </div>
            <div class="diploma-body">
                <h2>Certificado de Capacitación</h2>
                <p>Se certifica que</p>
                <p class="diploma-nombre">${nombre}</p>
                <p>ha completado satisfactoriamente la capacitación en</p>
                <p class="diploma-nombre">${tema}</p>
                <p>el día ${fecha}</p>
            </div>
            <div id="qrcode"></div>
        </div>
    `;

    content.innerHTML = html;
    
    new QRCode(document.getElementById("qrcode"), {
        text: JSON.stringify({ nombre, tema, fecha }),
        width: 128,
        height: 128
    });

    modal.style.display = 'block';
    setTimeout(() => modal.classList.add('show'), 10);
}

function parseFecha(fechaStr) {
    if (!fechaStr) return null;
    const [dia, mes, anio] = fechaStr.split('/').map(num => parseInt(num, 10));
    return new Date(anio, mes - 1, dia);
}

// Cerrar modales
document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.onclick = function() {
        const modal = this.closest('.modal');
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
});

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('show');
        setTimeout(() => {
            event.target.style.display = 'none';
        }, 300);
    }
}

// Cargar datos cuando se carga la página
document.addEventListener('DOMContentLoaded', loadCapacitacionData);

// Función de debounce para evitar muchas actualizaciones
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
