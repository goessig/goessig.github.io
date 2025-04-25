let documentsData = [];
let currentDocumentUrl = '';

// Función principal de inicialización
document.addEventListener('DOMContentLoaded', function() {
    // Verificar si estamos en la página de lista maestra
    if (document.getElementById('tableContainer')) {
        // Cargar datos solo si estamos en la página correcta
        loadDashboardData();
    }

    // Prevenir clic derecho en toda la página
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
    }, false);

    // Prevenir atajos de teclado y selección de texto
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const documentModal = document.getElementById('documentModal');
            const passwordModal = document.getElementById('passwordModal');
            if (documentModal) documentModal.style.display = 'none';
            if (passwordModal) passwordModal.style.display = 'none';
        }

        if ((e.ctrlKey || e.metaKey) && 
            (e.keyCode == 67 || e.keyCode == 86 || 
             e.keyCode == 85 || e.keyCode == 117)) {
            e.preventDefault();
            return false;
        }
    });

    // Prevenir arrastrar y soltar
    document.addEventListener('dragstart', function(e) {
        e.preventDefault();
        return false;
    });

    // Prevenir selección de texto
    document.addEventListener('selectstart', function(e) {
        e.preventDefault();
        return false;
    });
});

function loadDashboardData() {
    const timestamp = new Date().getTime();
    const callbackName = 'callback_' + timestamp;
    const rol = sessionStorage.getItem('rol');

    if (!rol) {
        window.location.href = 'index.html';
        return;
    }

    // Crear la función de callback global
    window[callbackName] = function(response) {
        console.log('Respuesta recibida:', response);
        if (response.status === 'success' && Array.isArray(response.data)) {
            documentsData = response.data;
            console.log('Datos cargados:', documentsData);
            initializePage();
        } else {
            console.error('Error en la respuesta o formato incorrecto:', response);
            document.getElementById('tableContainer').innerHTML = '<p>Error al cargar los datos</p>';
        }
    };

    // Crear y añadir el script
    const script = document.createElement('script');
    script.src = `https://script.google.com/macros/s/AKfycbxyelmWN4-BYIUqnq9c4g7gBCFZjSdbT3Z0mAGs0IU/dev?action=getData&callback=${callbackName}&rol=${rol}`;
    document.body.appendChild(script);
}

function initializePage() {
    console.log('Inicializando página con datos:', documentsData);
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
    
    renderTable(documentsData);
    setupFilters();
}

function renderTable(data) {
    console.log('Renderizando tabla con datos:', data);
    if (!data || data.length === 0) {
        document.getElementById('tableContainer').innerHTML = '<p>No hay datos para mostrar</p>';
        return;
    }

    const headers = [
        'PROCESO', 'NOMBRE DEL DOCUMENTO', 'TIPO', 'CODIGO', 
        'ESTADO', 'LINK'
    ];

    let tableHTML = `
        <table>
            <thead>
                <tr>
                    ${headers.map(header => `
                        <th>
                            <i class="fas ${getHeaderIcon(header)}"></i>
                            ${header === 'LINK' ? 'ACCIONES' : header}
                        </th>
                    `).join('')}
                </tr>
            </thead>
            <tbody>
                ${data.map(row => `
                    <tr>
                        ${headers.map(header => `
                            <td>${formatCell(header, row[header] || '')}</td>
                        `).join('')}
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    document.getElementById('tableContainer').innerHTML = tableHTML;
}

function getHeaderIcon(header) {
    const icons = {
        'PROCESO': 'fa-cogs',
        'NOMBRE DEL DOCUMENTO': 'fa-file-alt',
        'TIPO': 'fa-tag',
        'CODIGO': 'fa-hashtag',
        'ESTADO': 'fa-info-circle',
        'LINK': 'fa-link',
        'default': 'fa-circle'
    };
    return icons[header] || icons.default;
}

function formatCell(header, value) {
    if (header === 'ESTADO') {
        return `<span class="status-badge">${value}</span>`;
    }
    if (header === 'LINK' && value) {
        return `<i class="fas fa-eye view-link" onclick="showDocument('${value}', '${encodeURIComponent(value)}')"></i>`;
    }
    return value;
}

function setupFilters() {
    const searchInput = document.getElementById('searchInput');
    const processSelect = document.getElementById('processFilter');
    const statusSelect = document.getElementById('statusFilter');

    if (!searchInput || !processSelect || !statusSelect) {
        console.log('Elementos de filtro no encontrados');
        return;
    }

    const rol = sessionStorage.getItem('rol');
    
    // Configurar filtros de proceso
    const processes = [...new Set(documentsData.map(item => item['PROCESO']))];
    processSelect.innerHTML = '<option value="">Todos los procesos</option>';
    
    processes.forEach(process => {
        if (rol === 'administrador' || process === rol) {
            const option = document.createElement('option');
            option.value = process;
            option.textContent = process;
            processSelect.appendChild(option);
        }
    });

    if (rol !== 'administrador') {
        processSelect.value = rol;
        processSelect.disabled = true;
    }

    // Configurar filtros de estado
    const statuses = [...new Set(documentsData.map(item => item['ESTADO']))];
    statusSelect.innerHTML = '<option value="">Todos los estados</option>';
    
    statuses.forEach(status => {
        const option = document.createElement('option');
        option.value = status;
        option.textContent = status;
        statusSelect.appendChild(option);
    });

    // Configurar eventos
    searchInput.addEventListener('input', filterData);
    processSelect.addEventListener('change', filterData);
    statusSelect.addEventListener('change', filterData);
}

function filterData() {
    const searchInput = document.getElementById('searchInput');
    const processSelect = document.getElementById('processFilter');
    const statusSelect = document.getElementById('statusFilter');
    const rol = sessionStorage.getItem('rol');

    if (!searchInput || !processSelect || !statusSelect) return;

    const searchTerm = searchInput.value.toLowerCase();
    const processFilter = processSelect.value;
    const statusFilter = statusSelect.value;

    console.log('Filtrando con rol:', rol); // Para depuración

    const filteredData = documentsData.filter(item => {
        const matchesSearch = Object.values(item).some(value => 
            value.toString().toLowerCase().includes(searchTerm)
        );
        const matchesProcess = !processFilter || item['PROCESO'] === processFilter;
        const matchesStatus = !statusFilter || item['ESTADO'] === statusFilter;
        const matchesRol = rol.toLowerCase() === 'administrador' ? true : item['PROCESO'] === rol;

        return matchesSearch && matchesProcess && matchesStatus && matchesRol;
    });

    console.log('Datos filtrados:', filteredData); // Para depuración
    renderTable(filteredData);
}

function showDocument(url, title) {
    // Acceder a los elementos del documento padre (dashboard)
    const modal = window.parent.document.getElementById('documentModal');
    const viewer = window.parent.document.getElementById('documentViewer');
    const docTitle = window.parent.document.getElementById('documentTitle');
    const downloadBtn = window.parent.document.getElementById('downloadBtn');
    const folderSearch = window.parent.document.getElementById('folderSearch');
    
    if (!modal || !viewer || !docTitle) return;

    if (url.includes('/drive/folders/') || url.includes('/folders/')) {
        const folderId = extractGoogleDriveFolderId(url);
        if (folderId) {
            viewer.src = `https://drive.google.com/embeddedfolderview?id=${folderId}#list`;
            downloadBtn.style.display = 'none';
            viewer.classList.add('folder-view');
            folderSearch.style.display = 'block';
        }
    } else {
        const fileId = extractGoogleDriveFileId(url);
        if (fileId) {
            viewer.src = `https://drive.google.com/file/d/${fileId}/preview`;
            downloadBtn.style.display = 'block';
            viewer.classList.remove('folder-view');
            folderSearch.style.display = 'none';
        }
    }
    
    docTitle.textContent = decodeURIComponent(title);
    modal.style.display = 'block';
    setTimeout(() => modal.classList.add('show'), 10);
}

function showSecondaryDocument(url, title) {
    const modal = document.getElementById('secondaryModal');
    const viewer = document.getElementById('secondaryViewer');
    const docTitle = document.getElementById('secondaryTitle');
    
    const fileId = extractGoogleDriveFileId(url);
    if (fileId) {
        // Mostrar el modal secundario
        modal.style.display = 'block';
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);

        // Configurar el visor
        viewer.src = `https://drive.google.com/file/d/${fileId}/preview?embedded=true&rm=minimal&chrome=false&hl=es`;
        docTitle.textContent = title;
        
        // Configurar el cierre
        const closeBtn = modal.querySelector('.close-modal');
        closeBtn.onclick = () => {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
                viewer.src = 'about:blank';
            }, 300);
        };

        // Cerrar al hacer clic fuera del modal
        modal.onclick = function(event) {
            if (event.target === modal) {
                modal.classList.remove('show');
                setTimeout(() => {
                    modal.style.display = 'none';
                    viewer.src = 'about:blank';
                }, 300);
            }
        };
    }
}

function filterFolderContent(searchTerm) {
    searchTerm = searchTerm.toLowerCase();
    const iframe = document.getElementById('documentViewer');
    
    // Esperar a que el iframe esté completamente cargado
    if (!iframe.contentWindow || !iframe.contentWindow.document.body) {
        setTimeout(() => filterFolderContent(searchTerm), 500);
        return;
    }

    try {
        const iframeDoc = iframe.contentWindow.document;
        
        // Buscar en la lista de archivos
        const items = iframeDoc.querySelectorAll('.flip-entry-list-item, .flip-entry');
        
        items.forEach(item => {
            const nameElement = item.querySelector('.flip-entry-title, .flip-entry-name');
            const itemText = nameElement ? nameElement.textContent.toLowerCase() : '';
            
            if (itemText.includes(searchTerm)) {
                item.style.display = '';
                let parent = item.parentElement;
                while (parent && !parent.classList.contains('flip-entry-list')) {
                    parent.style.display = '';
                    parent = parent.parentElement;
                }
            } else {
                item.style.display = 'none';
            }
        });
    } catch (error) {
        console.error('Error al filtrar:', error);
    }
}

function extractGoogleDriveFileId(url) {
    // Mejorado para manejar más formatos de URL de Google Drive
    const patterns = [
        /\/file\/d\/([a-zA-Z0-9_-]+)/,      // Formato /file/d/{fileId}
        /id=([a-zA-Z0-9_-]+)/,              // Formato id={fileId}
        /\/d\/([a-zA-Z0-9_-]+)/,            // Formato /d/{fileId}
        /open\?id=([a-zA-Z0-9_-]+)/         // Formato open?id={fileId}
    ];

    for (let pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }
    return null;
}

function extractGoogleDriveFolderId(url) {
    // Patrones para URLs de carpetas de Google Drive
    const patterns = [
        /\/folders\/([a-zA-Z0-9_-]+)/,    // Formato /folders/{folderId}
        /drive\/folders\/([a-zA-Z0-9_-]+)/, // Formato drive/folders/{folderId}
        /id=([a-zA-Z0-9_-]+)/             // Formato id={folderId}
    ];

    // Limpiar la URL de parámetros adicionales
    const cleanUrl = url.split('?')[0];

    for (let pattern of patterns) {
        const match = cleanUrl.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }
    return null;
}

function showPasswordPrompt() {
    document.getElementById('passwordModal').style.display = 'block';
    document.getElementById('passwordInput').value = '';
}

function validatePassword() {
    const password = document.getElementById('passwordInput').value;
    if (password === 'lucielle') {
        document.getElementById('passwordModal').style.display = 'none';
        
        // Crear un enlace temporal para la descarga
        const downloadLink = document.createElement('a');
        downloadLink.href = currentDocumentUrl;
        downloadLink.download = ''; // Esto fuerza la descarga en lugar de abrir
        downloadLink.style.display = 'none';
        document.body.appendChild(downloadLink);
        
        // Iniciar la descarga y limpiar
        downloadLink.click();
        setTimeout(() => {
            document.body.removeChild(downloadLink);
        }, 100);
    } else {
        alert('Contraseña incorrecta');
    }
}

// Agregar al final del archivo
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        document.getElementById('documentModal').style.display = 'none';
        document.getElementById('passwordModal').style.display = 'none';
    }
});

// Mover los event listeners específicos de la carpeta a una función separada
function initializeFolderSearch() {
    const folderSearch = document.getElementById('folderSearch');
    const documentViewer = document.getElementById('documentViewer');

    if (folderSearch) {
        let searchTimeout;
        folderSearch.addEventListener('input', function(e) {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                filterFolderContent(e.target.value);
            }, 300);
        });

        // Agregar el listener para cuando el iframe se carga
        if (documentViewer) {
            documentViewer.addEventListener('load', function() {
                const searchTerm = folderSearch.value;
                if (searchTerm) {
                    filterFolderContent(searchTerm);
                }
            });
        }
    }
}

// Llamar a esta función cuando se muestra una carpeta
function showFolder(url, title) {
    const modal = document.getElementById('documentModal');
    const viewer = document.getElementById('documentViewer');
    const folderSearch = document.getElementById('folderSearch');
    
    if (!modal || !viewer || !folderSearch) return;

    document.getElementById('documentTitle').textContent = title;
    viewer.src = url;
    viewer.classList.add('folder-view');
    folderSearch.style.display = 'block';
    
    // Mostrar el modal
    modal.style.display = 'block';
    setTimeout(() => modal.classList.add('show'), 10);

    // Inicializar la búsqueda en carpetas
    initializeFolderSearch();

    // Configurar el cierre con el botón X
    const closeBtn = modal.querySelector('.close-modal');
    if (closeBtn) {
        closeBtn.onclick = () => {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
                viewer.src = 'about:blank';
            }, 300);
        };
    }

    // Configurar el cierre al hacer clic fuera del modal
    modal.onclick = function(event) {
        if (event.target === modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
                viewer.src = 'about:blank';
            }, 300);
        }
    };
} 