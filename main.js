const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { spawn, exec } = require('child_process');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 650,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#28282b',
      symbolColor: '#ffffff',
      height: 40
    },
    backgroundColor: '#28282b',
    show: false
  });

  mainWindow.loadFile('src/index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle('get-channels', async (event, configPath) => {
  try {
    const files = await fs.readdir(configPath);
    const channels = {};

    for (const file of files) {
      if (file.startsWith('settings-') && file.endsWith('.json')) {
        const channelName = file.slice(9, -5);
        const filePath = path.join(configPath, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const stats = await fs.stat(filePath);
        const config = JSON.parse(content);
        config.mtime = stats.mtime.getTime();
        channels[channelName] = config;
      }
    }

    return { success: true, channels };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-active-channel', async (event, configPath) => {
  try {
    const settingsPath = path.join(configPath, 'settings.json');
    const content = await fs.readFile(settingsPath, 'utf-8');
    const currentConfig = JSON.parse(content);
    return { success: true, config: currentConfig };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-channel', async (event, configPath, channelName, data) => {
  try {
    const env = {
      ANTHROPIC_AUTH_TOKEN: data.token,
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1'
    };

    if (data.url) {
      env.ANTHROPIC_BASE_URL = data.url;
    }

    const config = {
      env,
      permissions: {
        allow: [],
        deny: []
      }
    };

    if (data.model) {
      config.model = data.model;
    }

    config.alwaysThinkingEnabled = true;

    if (data.oldName && data.oldName !== channelName) {
      const oldFilePath = path.join(configPath, `settings-${data.oldName}.json`);
      try {
        await fs.unlink(oldFilePath);
      } catch (error) {
        console.error('删除旧文件失败:', error);
      }
    }

    const filePath = path.join(configPath, `settings-${channelName}.json`);
    await fs.writeFile(filePath, JSON.stringify(config, null, 2), 'utf-8');

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-channel', async (event, configPath, channelName) => {
  try {
    const sourcePath = path.join(configPath, `settings-${channelName}.json`);
    const targetPath = path.join(configPath, `settings-${channelName}.json.del`);
    await fs.rename(sourcePath, targetPath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('switch-channel', async (event, configPath, channelName) => {
  try {
    const sourcePath = path.join(configPath, `settings-${channelName}.json`);
    const targetPath = path.join(configPath, 'settings.json');
    await fs.copyFile(sourcePath, targetPath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });

  if (result.canceled) {
    return { success: false };
  } else {
    return { success: true, path: result.filePaths[0] };
  }
});

ipcMain.handle('launch-claude', async (event, terminal, terminalDir) => {
  try {
    if (terminal === 'wt') {
      const isInstalled = await checkWindowsTerminalInstalled();
      if (!isInstalled) {
        return {
          success: false,
          error: 'Windows Terminal 未安装。请从 Microsoft Store 安装 Windows Terminal，或选择其他终端。'
        };
      }
    }

    let args;

    if (terminal === 'wt') {
      args = ['-d', terminalDir, 'pwsh', '-NoExit', '-Command', 'claude'];
    } else if (terminal === 'powershell' || terminal === 'pwsh') {
      const command = `Set-Location -Path '${terminalDir.replace(/'/g, "''")}'; claude`;
      args = ['-NoExit', '-Command', command];
    } else if (terminal === 'cmd') {
      args = ['/K', `cd /d "${terminalDir}" && claude`];
    } else {
      const command = `Set-Location -Path '${terminalDir.replace(/'/g, "''")}'; claude`;
      args = ['-Command', command];
    }

    spawn(terminal, args, {
      detached: true,
      stdio: 'ignore',
      shell: true
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

function checkWindowsTerminalInstalled() {
  return new Promise((resolve) => {
    exec('where wt', (error, stdout, stderr) => {
      resolve(!error && stdout.trim().length > 0);
    });
  });
}

ipcMain.handle('check-terminal-available', async (event, terminal) => {
  try {
    if (terminal === 'wt') {
      const isInstalled = await checkWindowsTerminalInstalled();
      return { success: true, available: isInstalled };
    }
    return { success: true, available: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('set-titlebar-theme', async (event, theme) => {
  try {
    if (mainWindow) {
      if (theme === 'light') {
        mainWindow.setTitleBarOverlay({
          color: '#dcdce0',
          symbolColor: '#000000',
          height: 40
        });
      } else {
        mainWindow.setTitleBarOverlay({
          color: '#28282b',
          symbolColor: '#ffffff',
          height: 40
        });
      }
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ==================== Droid 渠道管理 ====================

ipcMain.handle('get-current-factory-api-key', async () => {
  try {
    // 优先从当前进程环境变量获取
    let key = process.env.FACTORY_API_KEY || '';
    
    // 如果为空，尝试从注册表读取
    if (!key && process.platform === 'win32') {
      try {
        const { execSync } = require('child_process');
        const result = execSync(
          `powershell -Command "[Environment]::GetEnvironmentVariable('FACTORY_API_KEY', 'User')"`,
          { encoding: 'utf-8', windowsHide: true }
        ).trim();
        if (result) {
          key = result;
          process.env.FACTORY_API_KEY = key;
        }
      } catch (e) {
        // 忽略错误
      }
    }
    
    return { success: true, data: key };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-droid-channels', async (event, configPath) => {
  try {
    const keyFilePath = path.join(configPath, 'key.txt');
    
    try {
      await fs.access(keyFilePath);
    } catch {
      return { success: true, data: [] };
    }
    
    const content = await fs.readFile(keyFilePath, 'utf-8');
    const channels = content
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const lineClean = line.trim().replace(/\[active\]$/, '').trim();
        const spaceIndex = lineClean.indexOf(' ');
        if (spaceIndex > 0) {
          return {
            name: lineClean.substring(0, spaceIndex).trim(),
            api_key: lineClean.substring(spaceIndex + 1).trim()
          };
        }
        return null;
      })
      .filter(Boolean);
    
    return { success: true, data: channels };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('switch-droid-channel', async (event, apiKey) => {
  try {
    // 设置当前进程环境变量
    process.env.FACTORY_API_KEY = apiKey;
    
    // 设置用户级别环境变量（写入注册表）
    if (process.platform === 'win32') {
      const { execSync } = require('child_process');
      const escapedKey = apiKey.replace(/'/g, "''");
      execSync(
        `powershell -Command "[Environment]::SetEnvironmentVariable('FACTORY_API_KEY', '${escapedKey}', 'User')"`,
        { windowsHide: true }
      );
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-droid-channel', async (event, configPath, name, apiKey, oldName) => {
  try {
    const keyFilePath = path.join(configPath, 'key.txt');
    let channels = [];
    
    try {
      const content = await fs.readFile(keyFilePath, 'utf-8');
      channels = content
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          const lineClean = line.trim().replace(/\[active\]$/, '').trim();
          const spaceIndex = lineClean.indexOf(' ');
          if (spaceIndex > 0) {
            return {
              name: lineClean.substring(0, spaceIndex).trim(),
              api_key: lineClean.substring(spaceIndex + 1).trim()
            };
          }
          return null;
        })
        .filter(Boolean);
    } catch {
      // 文件不存在
    }
    
    if (oldName) {
      // 编辑模式：在原位置更新
      const pos = channels.findIndex(c => c.name === oldName);
      if (pos >= 0) {
        if (oldName !== name && channels.some(c => c.name === name)) {
          return { success: false, error: '渠道名称已存在' };
        }
        channels[pos] = { name, api_key: apiKey };
      } else {
        return { success: false, error: '渠道不存在' };
      }
    } else {
      // 新增模式
      if (channels.some(c => c.name === name)) {
        return { success: false, error: '渠道名称已存在' };
      }
      channels.unshift({ name, api_key: apiKey });
    }
    
    const newContent = channels.map(c => `${c.name} ${c.api_key}`).join('\n');
    await fs.writeFile(keyFilePath, newContent, 'utf-8');
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-droid-channel', async (event, configPath, name) => {
  try {
    const keyFilePath = path.join(configPath, 'key.txt');
    const content = await fs.readFile(keyFilePath, 'utf-8');
    
    const newLines = content
      .split('\n')
      .filter(line => {
        const lineClean = line.trim().replace(/\[active\]$/, '').trim();
        const spaceIndex = lineClean.indexOf(' ');
        if (spaceIndex > 0) {
          return lineClean.substring(0, spaceIndex).trim() !== name;
        }
        return true;
      });
    
    await fs.writeFile(keyFilePath, newLines.join('\n'), 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('launch-droid', async (event, terminal, terminalDir) => {
  try {
    if (terminal === 'wt') {
      const isInstalled = await checkWindowsTerminalInstalled();
      if (!isInstalled) {
        return {
          success: false,
          error: 'Windows Terminal 未安装。请从 Microsoft Store 安装 Windows Terminal，或选择其他终端。'
        };
      }
    }

    let args;
    const escapedDir = terminalDir.replace(/'/g, "''");

    if (terminal === 'wt') {
      args = ['-d', terminalDir, 'pwsh', '-NoExit', '-Command', 'droid'];
    } else if (terminal === 'powershell' || terminal === 'pwsh') {
      args = ['-NoExit', '-Command', `Set-Location '${escapedDir}'; droid`];
    } else if (terminal === 'cmd') {
      args = ['/K', 'droid'];
    } else {
      args = ['-NoExit', '-Command', `Set-Location '${escapedDir}'; droid`];
    }

    spawn(terminal, args, {
      detached: true,
      stdio: 'ignore',
      shell: true,
      cwd: terminalDir
    });
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
