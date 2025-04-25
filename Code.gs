function doGet(e) {
  if (e.parameter.action === 'login') {
    return handleLogin(e);
  }
  
  const action = e.parameter.action;
  
  if (action === 'getData') {
    return getData(e);  // Retornar directamente el resultado de getData
  } else if (action === 'getRiesgos') {
    const result = getRiesgosData();
    return ContentService.createTextOutput(e.parameter.callback + '(' + JSON.stringify({
      status: 'success',
      data: result
    }) + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  } else if (action === 'getCapacitacion') {
    const result = getCapacitacionData();
    return ContentService.createTextOutput(e.parameter.callback + '(' + JSON.stringify({
      status: 'success',
      data: result
    }) + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
}

function handleLogin(e) {
  const { usuario, password, callback } = e.parameter;
  const spreadsheet = SpreadsheetApp.openById('1h4WX3H15HqrNsr3mNET0_eLkfC2aoSDmJ6_apBmcATE');
  const sheet = spreadsheet.getSheetByName('usuarios');
  const data = sheet.getDataRange().getValues();
  
  // Buscar usuario
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === usuario && data[i][1] === password) {
      const response = {
        status: 'success',
        data: {
          usuario: usuario,
          rol: data[i][2]
        }
      };
      
      return ContentService.createTextOutput(
        callback + '(' + JSON.stringify(response) + ')'
      ).setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
  }
  
  const response = {
    status: 'error',
    message: 'Usuario o contraseña incorrectos'
  };
  
  return ContentService.createTextOutput(
    callback + '(' + JSON.stringify(response) + ')'
  ).setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function getData(e) {
  const callback = e.parameter.callback;
  const rol = e.parameter.rol;
  
  const spreadsheetId = '1h4WX3H15HqrNsr3mNET0_eLkfC2aoSDmJ6_apBmcATE';
  const sheetName = 'lista';
  
  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(sheetName);
  const dataRange = sheet.getRange(10, 1, sheet.getLastRow() - 9, 15);
  const data = dataRange.getValues();
  
  const headers = [
    'PROCESO', 'NOMBRE DEL DOCUMENTO', 'TIPO', 'CODIGO', 
    'ESTADO', 'LINK'
  ];
  
  let filteredData = data
    .filter(row => row[0]) // Filtrar filas vacías
    .map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        if (header === 'LINK') {
          obj[header] = row[14] || ''; // La columna LINK está en la posición 14
        } else {
          obj[header] = row[index] || '';
        }
      });
      return obj;
    });

  // Solo filtrar si NO es administrador
  if (rol && rol !== 'administrador' && rol.toLowerCase() !== 'administrador') {
    filteredData = filteredData.filter(row => row.PROCESO === rol);
  }

  Logger.log('Rol recibido: ' + rol);
  Logger.log('Datos filtrados: ' + JSON.stringify(filteredData));

  const response = {
    status: 'success',
    data: filteredData
  };

  return ContentService.createTextOutput(
    callback + '(' + JSON.stringify(response) + ')'
  ).setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function getRiesgosData() {
  const spreadsheetId = '1h4WX3H15HqrNsr3mNET0_eLkfC2aoSDmJ6_apBmcATE';
  const sheetName = 'riesgos';
  
  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(sheetName);
  
  // Mantener los 25 encabezados para el popup
  const headerRange = sheet.getRange(9, 1, 1, 25);
  const headers = headerRange.getValues()[0];
  
  // Mantener los 25 campos de datos
  const dataRange = sheet.getRange(10, 1, sheet.getLastRow() - 9, 25);
  const data = dataRange.getValues();
  
  const response = {
    status: 'success',
    headers: headers,
    data: data.map(row => {
      const obj = {};
      for (let i = 0; i < row.length; i++) {
        const columnLetter = String.fromCharCode(65 + i);
        obj[columnLetter] = row[i] || '';
      }
      return obj;
    }).filter(row => Object.values(row).some(value => value !== ''))
  };

  return response;
}

function getCapacitacionData() {
  const spreadsheetId = '1h4WX3H15HqrNsr3mNET0_eLkfC2aoSDmJ6_apBmcATE';
  const sheetName = 'capacitacion';
  
  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(sheetName);
  const lastRow = sheet.getLastRow();
  const data = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
  
  // Solo devolver los datos crudos
  return data
    .filter(row => row[0]) // Filtrar filas vacías
    .map(row => ({
      nombre: row[0],
      dni: row[1],
      cargo: row[2],
      fechaIngreso: Utilities.formatDate(new Date(row[3]), 'GMT', 'dd/MM/yyyy'),
      tema: row[6],        // Columna G - Tema de capacitación
      fechaCapacitacion: Utilities.formatDate(new Date(row[7]), 'GMT', 'dd/MM/yyyy')  // Columna H - Fecha de capacitación
    }));
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
} 