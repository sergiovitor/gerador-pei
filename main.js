const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  // 1. Handler para abrir ficheiros Excel
  ipcMain.handle('abrir-excel', async () => {
    return await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Ficheiros Excel', extensions: ['xlsx', 'xls'] }]
    });
  });

  // 2. Handler para selecionar pasta de destino
  ipcMain.handle('selecionar-pasta', async () => {
    return await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    });
  });

  // 3. Handler para gerar PDF silencioso (Texto 100% copiável)
  ipcMain.handle('gerar-pdf-silencioso', async (event, { htmlContent, nomeFicheiro, pastaDestino }) => {
    let tempWindow = null;
    try {
      tempWindow = new BrowserWindow({
        show: false,
        webPreferences: { 
          nodeIntegration: false, // Segurança: desativado na janela temporária
          contextIsolation: true
        }
      });

      // Carrega o HTML completo (com CSS) para renderização fiel
      await tempWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
      
      // Aguarda a renderização das fontes e estilos
      await new Promise(resolve => setTimeout(resolve, 800));

      const pdfBuffer = await tempWindow.webContents.printToPDF({
        printBackground: true,
        marginsType: 0,
        pageSize: 'A4'
      });

      tempWindow.close();
      tempWindow = null;

      const caminhoCompleto = path.join(pastaDestino, `${nomeFicheiro}.pdf`);
      fs.writeFileSync(caminhoCompleto, pdfBuffer);

      return { sucesso: true, caminho: caminhoCompleto };
      
    } catch (erro) {
      console.error("Erro ao gerar PDF:", erro);
      if (tempWindow && !tempWindow.isDestroyed()) tempWindow.close();
      return { sucesso: false, erro: erro.message };
    }
  });

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
