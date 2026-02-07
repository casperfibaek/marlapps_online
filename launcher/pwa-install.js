class PWAInstallManager {
  constructor() {
    this.deferredPrompt = null;
    this.banner = null;
    this.installBtn = null;
    this.dismissBtn = null;
    this.isInstalled = false;
    this.checkInstallStatus();
  }

  init() {
    this.banner = document.getElementById('pwaInstallBanner');
    this.installBtn = document.getElementById('pwaInstallBtn');
    this.dismissBtn = document.getElementById('pwaInstallDismiss');

    if (!this.banner || !this.installBtn || !this.dismissBtn) {
      console.warn('PWA Install: Banner elements not found');
      return;
    }

    this.bindEvents();
  }

  checkInstallStatus() {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.isInstalled = true;
      return;
    }

    if (window.navigator.standalone === true) {
      this.isInstalled = true;
      return;
    }

    if (localStorage.getItem('pwa-installed') === 'true') {
      this.isInstalled = true;
      return;
    }

    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedTime < sevenDays) {
        return;
      }
    }
  }

  bindEvents() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;

      if (!this.isInstalled) {
        this.showBanner();
      }
    });

    window.addEventListener('appinstalled', () => {
      this.isInstalled = true;
      this.hideBanner();
      this.deferredPrompt = null;
      localStorage.setItem('pwa-installed', 'true');
      localStorage.removeItem('pwa-install-dismissed');
    });

    this.installBtn.addEventListener('click', () => this.promptInstall());
    this.dismissBtn.addEventListener('click', () => this.dismissBanner());
  }

  showBanner() {
    if (this.banner && this.deferredPrompt) {
      this.banner.classList.remove('hidden');
      this.banner.classList.add('show');
    }
  }

  hideBanner() {
    if (this.banner) {
      this.banner.classList.remove('show');
      this.banner.classList.add('hidden');
    }
  }

  dismissBanner() {
    this.hideBanner();
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  }

  async promptInstall() {
    if (!this.deferredPrompt) {
      console.warn('PWA: No deferred prompt available');
      return;
    }

    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;

    this.deferredPrompt = null;
    this.hideBanner();

    if (outcome === 'dismissed') {
      localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.pwaInstallManager = new PWAInstallManager();
  window.pwaInstallManager.init();
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').then(reg => {
      window.__swRegistration = reg;
    }).catch(() => {});
  });
}
