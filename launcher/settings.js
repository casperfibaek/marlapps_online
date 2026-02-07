class SettingsManager {
  constructor(themeManager, appLoader) {
    this.themeManager = themeManager;
    this.appLoader = appLoader;
    this.drawer = null;
    this.overlay = null;
    this.isOpen = false;

    this.appStorageMap = {};
    this.storageKeys = ['marlapps-recents', 'marlapps-theme'];
  }

  init() {
    this.drawer = document.getElementById('settingsDrawer');
    this.overlay = document.getElementById('drawerOverlay');

    if (!this.drawer || !this.overlay) {
      console.warn('Settings drawer elements not found');
      return this;
    }

    this.buildStorageMaps();
    this.populateDeleteDropdown();
    this.bindEvents();
    this.updateThemeSelector();
    return this;
  }

  buildStorageMaps() {
    for (const app of this.appLoader.apps) {
      if (app.storageKeys && app.storageKeys.length) {
        this.appStorageMap[app.id] = { name: app.name, keys: app.storageKeys };
        this.storageKeys.push(...app.storageKeys);
      }
    }
  }

  populateDeleteDropdown() {
    const select = document.getElementById('deleteAppSelect');
    if (!select) return;

    // Remove existing options except the placeholder
    while (select.options.length > 1) {
      select.remove(1);
    }

    for (const app of this.appLoader.apps) {
      if (app.storageKeys && app.storageKeys.length) {
        const option = document.createElement('option');
        option.value = app.id;
        option.textContent = app.name;
        select.appendChild(option);
      }
    }
  }

  bindEvents() {
    const closeBtn = document.getElementById('closeSettingsBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    this.overlay.addEventListener('click', () => this.close());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
        e.preventDefault();
      }
    });

    document.querySelectorAll('.theme-option').forEach(btn => {
      btn.addEventListener('click', () => {
        this.themeManager.apply(btn.dataset.theme);
        this.updateThemeSelector();
      });
    });

    const resetThemeBtn = document.getElementById('resetThemeBtn');
    if (resetThemeBtn) {
      resetThemeBtn.addEventListener('click', () => {
        this.themeManager.reset();
        this.updateThemeSelector();
      });
    }

    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportData());
    }

    const importBtn = document.getElementById('importBtn');
    const importInput = document.getElementById('importFileInput');
    if (importBtn && importInput) {
      importBtn.addEventListener('click', () => importInput.click());
      importInput.addEventListener('change', (e) => {
        if (e.target.files[0]) {
          this.importData(e.target.files[0]);
          e.target.value = '';
        }
      });
    }

    const resetDataBtn = document.getElementById('resetDataBtn');
    if (resetDataBtn) {
      resetDataBtn.addEventListener('click', () => this.resetData());
    }

    const deleteAppSelect = document.getElementById('deleteAppSelect');
    const deleteAppBtn = document.getElementById('deleteAppBtn');
    if (deleteAppSelect && deleteAppBtn) {
      deleteAppBtn.addEventListener('click', () => {
        const appId = deleteAppSelect.value;
        if (appId) {
          this.deleteAppData(appId);
        }
      });
    }
  }

  open() {
    this.drawer.classList.add('open');
    this.overlay.classList.add('visible');
    this.drawer.setAttribute('aria-hidden', 'false');
    this.isOpen = true;

    const trigger = document.getElementById('topbarSettingsBtn');
    if (trigger) trigger.setAttribute('aria-expanded', 'true');

    const firstFocusable = this.drawer.querySelector('button, input');
    if (firstFocusable) {
      setTimeout(() => firstFocusable.focus(), 100);
    }
  }

  close() {
    this.drawer.classList.remove('open');
    this.overlay.classList.remove('visible');
    this.drawer.setAttribute('aria-hidden', 'true');
    this.isOpen = false;

    const trigger = document.getElementById('topbarSettingsBtn');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');

    window.dispatchEvent(new CustomEvent('settingsClosed'));
  }

  updateThemeSelector() {
    const currentTheme = this.themeManager.getTheme();
    document.querySelectorAll('.theme-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === currentTheme);
    });
  }

  exportData() {
    const data = {
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      theme: this.themeManager.getTheme(),
      recents: JSON.parse(localStorage.getItem('marlapps-recents') || '[]'),
      appData: {}
    };

    this.storageKeys.forEach(key => {
      if (key === 'marlapps-theme' || key === 'marlapps-recents') return;

      const value = localStorage.getItem(key);
      if (value) {
        try {
          data.appData[key] = JSON.parse(value);
        } catch {
          data.appData[key] = value;
        }
      }
    });

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marlapps-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showNotification('Data exported successfully');
  }

  async importData(file) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.version || !data.exportedAt) {
        throw new Error('Invalid backup file format');
      }

      const changes = [];
      if (data.theme) changes.push(`Theme: ${data.theme}`);
      if (data.recents?.length) changes.push(`Recent apps: ${data.recents.length}`);
      if (data.appData) {
        const appDataCount = Object.keys(data.appData).length;
        if (appDataCount > 0) changes.push(`App data entries: ${appDataCount}`);
      }

      const message = [
        `Import data from ${new Date(data.exportedAt).toLocaleDateString()}?`,
        '',
        'This will overwrite your current data:',
        ...changes.map(c => `• ${c}`),
        '',
        'This action cannot be undone.'
      ].join('\n');

      if (!confirm(message)) return;

      if (data.theme) {
        this.themeManager.apply(data.theme);
      }

      if (data.recents) {
        localStorage.setItem('marlapps-recents', JSON.stringify(data.recents));
      }

      if (data.appData) {
        Object.entries(data.appData).forEach(([key, value]) => {
          const serialized = typeof value === 'string' ? value : JSON.stringify(value);
          localStorage.setItem(key, serialized);
        });
      }

      this.showNotification('Data imported successfully. Reloading...');
      setTimeout(() => location.reload(), 1500);

    } catch (error) {
      console.error('Import failed:', error);
      alert(`Failed to import data: ${error.message}`);
    }
  }

  deleteAppData(appId) {
    const appInfo = this.appStorageMap[appId];
    if (!appInfo) return;

    if (!confirm(`Delete all data for ${appInfo.name}? This cannot be undone.`)) return;

    appInfo.keys.forEach(key => localStorage.removeItem(key));

    const select = document.getElementById('deleteAppSelect');
    if (select) select.value = '';

    this.showNotification(`${appInfo.name} data deleted.`);
  }

  resetData() {
    const message = [
      'Are you sure you want to reset all local data?',
      '',
      'This will permanently delete:',
      '• All app data (todos, notes, habits, etc.)',
      '• Your preferences and settings',
      '• Recent apps history',
      '',
      'This action cannot be undone.'
    ].join('\n');

    if (!confirm(message)) return;
    if (!confirm('This is your last chance. Delete ALL data?')) return;

    this.storageKeys.forEach(key => localStorage.removeItem(key));

    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('marlapps-')) {
        localStorage.removeItem(key);
      }
    });

    this.showNotification('All data has been reset. Reloading...');
    setTimeout(() => location.reload(), 1500);
  }

  showNotification(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('visible'));

    setTimeout(() => {
      toast.classList.remove('visible');
      toast.addEventListener('transitionend', () => toast.remove());
    }, 2500);
  }
}

window.SettingsManager = SettingsManager;
