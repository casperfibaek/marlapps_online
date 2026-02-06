/**
 * Main Launcher - Orchestrates all modules and renders UI
 */

class Launcher {
  constructor() {
    this.themeManager = new ThemeManager();
    this.appLoader = new AppLoader();
    this.searchManager = null;
    this.settingsManager = null;

    // State
    this.currentCategory = 'all';
    this.currentSort = 'recent';
    this.currentApp = null;
  }

  /**
   * Initialize the launcher
   */
  async init() {
    // Initialize theme first for immediate visual
    this.themeManager.init();

    // Load apps from registry
    await this.appLoader.init();

    // Initialize other managers
    this.searchManager = new SearchManager(this.appLoader, this);
    this.searchManager.init();

    this.settingsManager = new SettingsManager(this.themeManager, this.appLoader);
    this.settingsManager.init();

    // Bind UI events
    this.bindEvents();

    // Initial render
    this.renderRecents();
    this.renderApps();

    // Mark as loaded
    document.body.classList.add('loaded');

    console.log('MarlApps Launcher initialized');
  }

  /**
   * Bind all UI events
   */
  bindEvents() {
    // Event delegation for app grid
    const appGrid = document.getElementById('appGrid');
    if (appGrid) {
      appGrid.addEventListener('click', (e) => {
        const card = e.target.closest('.app-card[data-app-id]');
        if (card) {
          this.openApp(card.dataset.appId);
        }
      });
    }

    // Event delegation for recents
    const recentsScroller = document.getElementById('recentsScroller');
    if (recentsScroller) {
      recentsScroller.addEventListener('click', (e) => {
        const tile = e.target.closest('.recent-tile[data-app-id]');
        if (tile) {
          this.openApp(tile.dataset.appId);
        }
      });
    }

    // Home button (MarlApps logo)
    const homeBtn = document.getElementById('homeBtn');
    if (homeBtn) {
      homeBtn.addEventListener('click', () => {
        if (this.currentApp) {
          this.closeApp();
        }
        // Always show all apps when clicking home
        this.setCategory('all');
        this.closeMobileOverlays();
      });
    }

    // Topbar search button (mobile)
    const topbarSearchBtn = document.getElementById('topbarSearchBtn');
    if (topbarSearchBtn) {
      topbarSearchBtn.addEventListener('click', () => {
        this.openMobileSearch();
      });
    }

    // Topbar categories button (mobile)
    const topbarCategoriesBtn = document.getElementById('topbarCategoriesBtn');
    if (topbarCategoriesBtn) {
      topbarCategoriesBtn.addEventListener('click', () => {
        this.openMobileCategoriesSheet();
      });
    }

    // Sidebar navigation
    document.querySelectorAll('.nav-item[data-category]').forEach(item => {
      item.addEventListener('click', () => {
        this.setCategory(item.dataset.category);
      });
    });

    // Sort control
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.currentSort = e.target.value;
        this.renderApps();
      });
    }

    // Toolbar categories button - cycle through categories
    const toolbarCategoriesBtn = document.getElementById('toolbarCategoriesBtn');
    if (toolbarCategoriesBtn) {
      toolbarCategoriesBtn.addEventListener('click', () => {
        const categories = ['all', 'focus', 'planning', 'notes', 'personal', 'tools'];
        const currentIndex = categories.indexOf(this.currentCategory);
        const nextIndex = (currentIndex + 1) % categories.length;
        this.setCategory(categories[nextIndex]);
        // Update the label
        const label = document.getElementById('toolbarCategoryLabel');
        if (label) {
          label.textContent = categories[nextIndex] === 'all'
            ? 'All'
            : categories[nextIndex].charAt(0).toUpperCase() + categories[nextIndex].slice(1);
        }
      });
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      // Ctrl+L to open search (mobile overlay or focus desktop search)
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault();
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
          this.openMobileSearch();
        }
        // Desktop search is handled by search.js
        return;
      }

      if (e.key === 'Escape') {
        // Close mobile search overlay if open
        const mobileSearchOverlay = document.getElementById('mobileSearchOverlay');
        if (mobileSearchOverlay && !mobileSearchOverlay.classList.contains('hidden')) {
          this.closeMobileSearch();
          e.preventDefault();
          return;
        }

        // Close mobile categories sheet if open
        const mobileCategoriesSheet = document.getElementById('mobileCategoriesSheet');
        if (mobileCategoriesSheet && !mobileCategoriesSheet.classList.contains('hidden')) {
          this.closeMobileCategoriesSheet();
          e.preventDefault();
          return;
        }

        // Close app (if not in settings)
        if (this.currentApp && !this.settingsManager.isOpen) {
          this.closeApp();
          e.preventDefault();
          return;
        }

        // Reset to 'all apps' if a specific category is selected
        if (this.currentCategory !== 'all' && !this.settingsManager.isOpen) {
          this.setCategory('all');
          e.preventDefault();
          return;
        }
      }
    });

    // Propagate theme changes to open app iframe
    window.addEventListener('themechange', () => {
      const iframe = document.querySelector('.app-iframe');
      if (iframe) {
        this.syncThemeToIframe(iframe);
      }
    });

    // Topbar settings button
    const topbarSettingsBtn = document.getElementById('topbarSettingsBtn');
    if (topbarSettingsBtn) {
      topbarSettingsBtn.addEventListener('click', () => {
        if (this.settingsManager) {
          this.settingsManager.open();
        }
      });
    }

    // Mobile navigation
    this.bindMobileEvents();
  }

  /**
   * Bind mobile-specific events
   */
  bindMobileEvents() {
    // Mobile nav buttons
    const mobileNavHome = document.getElementById('mobileNavHome');
    const mobileNavSearch = document.getElementById('mobileNavSearch');
    const mobileNavCategories = document.getElementById('mobileNavCategories');
    const mobileNavSettings = document.getElementById('mobileNavSettings');

    if (mobileNavHome) {
      mobileNavHome.addEventListener('click', () => {
        if (this.currentApp) {
          this.closeApp();
        }
        this.closeMobileOverlays();
        this.setMobileNavActive('home');
      });
    }

    if (mobileNavSearch) {
      mobileNavSearch.addEventListener('click', () => {
        this.openMobileSearch();
        this.setMobileNavActive('search');
      });
    }

    if (mobileNavCategories) {
      mobileNavCategories.addEventListener('click', () => {
        this.openMobileCategoriesSheet();
        this.setMobileNavActive('categories');
      });
    }

    if (mobileNavSettings) {
      mobileNavSettings.addEventListener('click', () => {
        if (this.settingsManager) {
          this.settingsManager.open();
        }
        this.setMobileNavActive('settings');
      });
    }

    // Mobile search
    const mobileSearchCancel = document.getElementById('mobileSearchCancel');
    const mobileSearchInput = document.getElementById('mobileSearchInput');

    if (mobileSearchCancel) {
      mobileSearchCancel.addEventListener('click', () => {
        this.closeMobileSearch();
      });
    }

    if (mobileSearchInput) {
      let debounceTimer;
      mobileSearchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => this.handleMobileSearch(), 150);
      });
    }

    // Mobile categories sheet
    const mobileCategoriesClose = document.getElementById('mobileCategoriesClose');
    if (mobileCategoriesClose) {
      mobileCategoriesClose.addEventListener('click', () => {
        this.closeMobileCategoriesSheet();
      });
    }

    // Mobile category buttons
    document.querySelectorAll('.mobile-category-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setCategory(btn.dataset.category);
        this.updateMobileCategoryActive(btn.dataset.category);
        this.closeMobileCategoriesSheet();
        this.setMobileNavActive('home');
      });
    });

    // Reset mobile nav when settings closes
    window.addEventListener('settingsClosed', () => {
      this.setMobileNavActive('home');
    });
  }

  /**
   * Set mobile nav button active state
   */
  setMobileNavActive(nav) {
    document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.nav === nav);
    });
  }

  /**
   * Open mobile search overlay
   */
  openMobileSearch() {
    const overlay = document.getElementById('mobileSearchOverlay');
    const input = document.getElementById('mobileSearchInput');
    if (overlay) {
      overlay.classList.remove('hidden');
      if (input) {
        input.focus();
        input.value = '';
      }
    }
  }

  /**
   * Close mobile search overlay
   */
  closeMobileSearch() {
    const overlay = document.getElementById('mobileSearchOverlay');
    const results = document.getElementById('mobileSearchResults');
    if (overlay) {
      overlay.classList.add('hidden');
    }
    if (results) {
      results.innerHTML = '';
    }
    this.setMobileNavActive('home');
  }

  /**
   * Handle mobile search input
   */
  handleMobileSearch() {
    const input = document.getElementById('mobileSearchInput');
    const results = document.getElementById('mobileSearchResults');
    if (!input || !results) return;

    const query = input.value.trim();
    if (!query) {
      results.innerHTML = '';
      return;
    }

    const apps = this.appLoader.searchApps(query);
    if (apps.length === 0) {
      results.innerHTML = '<p class="no-results" role="status">No apps found</p>';
      return;
    }

    const cardsHtml = apps.map(app => `
      <div class="app-card" data-app-id="${app.id}" tabindex="0" role="listitem" aria-label="Open ${this.escapeHtml(app.name)}">
        <img class="app-icon" src="${this.appLoader.getAppIconUrl(app)}" alt="" loading="lazy">
        <div class="app-info">
          <span class="app-name">${this.escapeHtml(app.name)}</span>
          <span class="app-description">${this.escapeHtml(app.description)}</span>
        </div>
      </div>
    `).join('');
    results.innerHTML = `<div class="search-results-list">${cardsHtml}</div>`;

    // Bind click events to search results
    results.querySelectorAll('.app-card').forEach(card => {
      card.addEventListener('click', () => {
        this.openApp(card.dataset.appId);
        this.closeMobileSearch();
      });
    });
  }

  /**
   * Open mobile categories sheet
   */
  openMobileCategoriesSheet() {
    const sheet = document.getElementById('mobileCategoriesSheet');
    if (sheet) {
      sheet.classList.remove('hidden');
    }
    // Add backdrop
    this.showMobileBackdrop(() => this.closeMobileCategoriesSheet());
  }

  /**
   * Close mobile categories sheet
   */
  closeMobileCategoriesSheet() {
    const sheet = document.getElementById('mobileCategoriesSheet');
    if (sheet) {
      sheet.classList.add('hidden');
    }
    this.hideMobileBackdrop();
    this.setMobileNavActive('home');
  }

  /**
   * Update mobile category button active state
   */
  updateMobileCategoryActive(category) {
    document.querySelectorAll('.mobile-category-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.category === category);
    });
  }

  /**
   * Show mobile backdrop
   */
  showMobileBackdrop(onClose) {
    let backdrop = document.querySelector('.mobile-sheet-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'mobile-sheet-backdrop';
      document.body.appendChild(backdrop);
    }
    backdrop.classList.remove('hidden');
    backdrop.onclick = onClose;
  }

  /**
   * Hide mobile backdrop
   */
  hideMobileBackdrop() {
    const backdrop = document.querySelector('.mobile-sheet-backdrop');
    if (backdrop) {
      backdrop.classList.add('hidden');
    }
  }

  /**
   * Close all mobile overlays
   */
  closeMobileOverlays() {
    this.closeMobileSearch();
    this.closeMobileCategoriesSheet();
  }

  /**
   * Set active category
   */
  setCategory(category) {
    this.currentCategory = category;

    // Update nav UI and ARIA state
    document.querySelectorAll('.nav-item[data-category]').forEach(item => {
      const isActive = item.dataset.category === category;
      item.classList.toggle('active', isActive);
      item.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    // Update toolbar title
    const title = document.querySelector('.toolbar-title');
    if (title) {
      title.textContent = category === 'all'
        ? 'All apps'
        : category.charAt(0).toUpperCase() + category.slice(1);
    }

    // Update toolbar categories button label
    const catLabel = document.getElementById('toolbarCategoryLabel');
    if (catLabel) {
      catLabel.textContent = category === 'all'
        ? 'All'
        : category.charAt(0).toUpperCase() + category.slice(1);
    }

    // Clear search and re-render
    if (this.searchManager) {
      this.searchManager.clear();
    }
    this.renderApps();
  }

  /**
   * Sort apps array
   */
  sortApps(apps) {
    const sorted = [...apps];

    switch (this.currentSort) {
      case 'alpha':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;

      case 'category':
        sorted.sort((a, b) => {
          const catA = a.categories?.[0] || 'zzz';
          const catB = b.categories?.[0] || 'zzz';
          return catA.localeCompare(catB);
        });
        break;

      case 'recent':
      default:
        const recents = this.appLoader.recents;
        sorted.sort((a, b) => {
          const aRecent = recents.find(r => r.id === a.id)?.timestamp || 0;
          const bRecent = recents.find(r => r.id === b.id)?.timestamp || 0;
          if (bRecent !== aRecent) return bRecent - aRecent;
          return a.order - b.order;
        });
        break;
    }

    return sorted;
  }

  /**
   * Render recents section
   */
  renderRecents() {
    const container = document.getElementById('recentsScroller');
    if (!container) return;

    const recents = this.appLoader.getRecentApps(5);

    if (recents.length === 0) {
      container.innerHTML = '<p class="no-recents">No recent apps. Open an app to see it here.</p>';
      return;
    }

    container.innerHTML = recents.map(app => `
      <div class="recent-tile" data-app-id="${app.id}" tabindex="0" role="listitem" aria-label="Open ${this.escapeHtml(app.name)}">
        <img class="recent-icon" src="${this.appLoader.getAppIconUrl(app)}" alt="" loading="lazy">
        <div class="recent-info">
          <span class="recent-name">${this.escapeHtml(app.name)}</span>
          <span class="recent-meta">Last opened ${this.formatRelativeTime(app.lastOpened)}</span>
        </div>
      </div>
    `).join('');
  }

  /**
   * Render app grid
   */
  renderApps(apps = null) {
    const container = document.getElementById('appGrid');
    if (!container) return;

    // Get apps based on category if not provided
    if (!apps) {
      apps = this.appLoader.getAppsByCategory(this.currentCategory);
    }

    // Sort apps
    apps = this.sortApps(apps);

    // Render cards
    const currentTheme = this.themeManager.getTheme();
    const themeLabel = currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1);
    const cardsHtml = apps.map(app => `
      <div class="app-card" data-app-id="${app.id}" tabindex="0" role="listitem" aria-label="Open ${this.escapeHtml(app.name)}">
        <img class="app-icon" src="${this.appLoader.getAppIconUrl(app)}" alt="" loading="lazy">
        <div class="app-info">
          <span class="app-name">${this.escapeHtml(app.name)}</span>
          <span class="app-description">${this.escapeHtml(app.description)}</span>
        </div>
        <span class="app-theme-badge">${themeLabel}</span>
      </div>
    `).join('');

    container.innerHTML = cardsHtml;
  }

  /**
   * Open an app
   */
  openApp(appId) {
    const app = this.appLoader.getAppById(appId);
    if (!app) {
      console.warn(`App not found: ${appId}`);
      return;
    }

    // Record the open
    this.appLoader.recordAppOpen(appId);
    this.currentApp = app;

    // Get elements
    const workspace = document.getElementById('appWorkspace');
    const content = document.getElementById('workspaceContent');
    const mainContent = document.getElementById('mainContent');

    if (!workspace || !content || !mainContent) return;

    // Load app in iframe
    content.innerHTML = `
      <iframe
        src="${this.appLoader.getAppEntryUrl(app)}"
        class="app-iframe"
        title="${this.escapeHtml(app.name)}"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
      ></iframe>
    `;

    // Fade in iframe when loaded to prevent theme flicker, and sync theme
    const iframe = content.querySelector('.app-iframe');
    if (iframe) {
      iframe.addEventListener('load', () => {
        // Sync theme to iframe
        this.syncThemeToIframe(iframe);
        iframe.classList.add('loaded');
      });
    }

    // Show workspace, hide main
    mainContent.classList.add('hidden');
    workspace.classList.remove('hidden');

    // Add app-open class to body (hides search)
    document.body.classList.add('app-open');

    // Update document title
    document.title = `${app.name} - MarlApps`;
  }

  /**
   * Close current app
   */
  closeApp() {
    const workspace = document.getElementById('appWorkspace');
    const content = document.getElementById('workspaceContent');
    const mainContent = document.getElementById('mainContent');

    if (!workspace || !content || !mainContent) return;

    // Hide workspace, show main
    workspace.classList.add('hidden');
    mainContent.classList.remove('hidden');

    // Remove app-open class from body (shows search)
    document.body.classList.remove('app-open');

    // Clear iframe
    content.innerHTML = '';

    // Reset state
    this.currentApp = null;

    // Reset document title
    document.title = 'MarlApps';

    // Refresh recents
    this.renderRecents();
  }

  /**
   * Sync current theme to an iframe's document
   */
  syncThemeToIframe(iframe) {
    const theme = this.themeManager.getTheme();

    // Method 1: Direct DOM access (same-origin iframes)
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.documentElement.setAttribute('data-theme', theme);
      }
    } catch (e) {
      // Cross-origin or sandbox restriction - fall through to postMessage
    }

    // Method 2: postMessage (apps listen for this)
    try {
      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'theme-change', theme }, '*');
      }
    } catch (e) {
      // Ignore
    }
  }

  /**
   * Format relative time
   */
  formatRelativeTime(timestamp) {
    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return new Date(timestamp).toLocaleDateString();
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.launcher = new Launcher();
  window.launcher.init();
});
