// Popup script for Site Cookies Viewer
class CookieViewer {
  constructor() {
    this.currentUrl = "";
    this.cookies = [];
    this.filteredCookies = [];
    this.init();
  }

  async init() {
    this.setupEventListeners();
    await this.loadCurrentTab();
    await this.loadCookies();
  }

  setupEventListeners() {
    document
      .getElementById("refresh-btn")
      .addEventListener("click", () => this.loadCookies());
    document
      .getElementById("export-btn")
      .addEventListener("click", () => this.exportCookies());
    document
      .getElementById("clear-btn")
      .addEventListener("click", () => this.clearAllCookies());

    const searchInput = document.getElementById("search-input");
    searchInput.addEventListener("input", (e) =>
      this.filterCookies(e.target.value)
    );
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.loadCookies();
      }
    });
  }

  async loadCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      this.currentUrl = tab.url;
      const domain = new URL(this.currentUrl).hostname;
      document.getElementById("current-site").textContent = domain;
    } catch (error) {
      console.error("Error loading current tab:", error);
      document.getElementById("current-site").textContent = "Unknown site";
    }
  }

  async loadCookies() {
    this.showLoading(true);

    try {
      const domain = new URL(this.currentUrl).hostname;

      // Get all possible domain variations
      const domainVariations = this.getDomainVariations(domain);

      // Collect cookies from all domain variations
      const allCookies = [];
      for (const domainVar of domainVariations) {
        try {
          const cookies = await chrome.cookies.getAll({ domain: domainVar });
          allCookies.push(...cookies);
        } catch (error) {
          console.log(`Could not get cookies for domain: ${domainVar}`, error);
        }
      }

      // Also get cookies without domain restriction for the current URL
      try {
        const urlCookies = await chrome.cookies.getAll({
          url: this.currentUrl,
        });
        allCookies.push(...urlCookies);
      } catch (error) {
        console.log("Could not get URL-specific cookies:", error);
      }

      // Deduplicate cookies
      this.cookies = this.deduplicateCookies(allCookies);
      this.filteredCookies = [...this.cookies];

      this.updateStats();
      this.renderCookies();
      this.updateLastUpdated();
    } catch (error) {
      console.error("Error loading cookies:", error);
      this.showError("Failed to load cookies");
    } finally {
      this.showLoading(false);
    }
  }

  getDomainVariations(domain) {
    const variations = [];

    // Add the exact domain
    variations.push(domain);

    // Add with dot prefix (for subdomain matching)
    variations.push(`.${domain}`);

    // Extract root domain (remove www. prefix)
    const rootDomain = domain.replace(/^www\./, "");
    if (rootDomain !== domain) {
      variations.push(rootDomain);
      variations.push(`.${rootDomain}`);
    }

    // Add common subdomain patterns
    const subdomains = ["www", "api", "app", "admin", "blog", "shop", "store"];
    for (const subdomain of subdomains) {
      variations.push(`${subdomain}.${rootDomain}`);
    }

    // Remove duplicates
    return [...new Set(variations)];
  }

  deduplicateCookies(cookies) {
    const seen = new Set();
    return cookies.filter((cookie) => {
      const key = `${cookie.name}-${cookie.domain}-${cookie.path}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  filterCookies(searchTerm) {
    if (!searchTerm.trim()) {
      this.filteredCookies = [...this.cookies];
    } else {
      const term = searchTerm.toLowerCase();
      this.filteredCookies = this.cookies.filter(
        (cookie) =>
          cookie.name.toLowerCase().includes(term) ||
          cookie.value.toLowerCase().includes(term) ||
          cookie.domain.toLowerCase().includes(term)
      );
    }
    this.renderCookies();
  }

  renderCookies() {
    const container = document.getElementById("cookies-list");
    const noCookies = document.getElementById("no-cookies");

    if (this.filteredCookies.length === 0) {
      container.innerHTML = "";
      noCookies.classList.remove("hidden");
      return;
    }

    noCookies.classList.add("hidden");

    container.innerHTML = this.filteredCookies
      .map((cookie) => this.createCookieElement(cookie))
      .join("");
  }

  createCookieElement(cookie) {
    const isSession = !cookie.expirationDate;
    const expirationDate = cookie.expirationDate
      ? new Date(cookie.expirationDate * 1000)
      : null;
    const isSecure = cookie.secure ? "Secure" : "";
    const isHttpOnly = cookie.httpOnly ? "HttpOnly" : "";

    return `
            <div class="cookie-item">
                <div class="cookie-header">
                    <span class="cookie-name">${this.escapeHtml(
                      cookie.name
                    )}</span>
                    <span class="cookie-type ${
                      isSession ? "session" : "persistent"
                    }">
                        ${isSession ? "Session" : "Persistent"}
                    </span>
                </div>
                <div class="cookie-value">${this.escapeHtml(cookie.value)}</div>
                <div class="cookie-meta">
                    <span>Domain: ${this.escapeHtml(cookie.domain)}</span>
                    <span>Path: ${this.escapeHtml(cookie.path)}</span>
                    ${
                      expirationDate
                        ? `<span>Expires: ${expirationDate.toLocaleDateString()}</span>`
                        : ""
                    }
                    ${isSecure ? `<span>${isSecure}</span>` : ""}
                    ${isHttpOnly ? `<span>${isHttpOnly}</span>` : ""}
                </div>
            </div>
        `;
  }

  updateStats() {
    const total = this.cookies.length;
    const session = this.cookies.filter((c) => !c.expirationDate).length;
    const persistent = total - session;

    document.getElementById("total-cookies").textContent = total;
    document.getElementById("session-cookies").textContent = session;
    document.getElementById("persistent-cookies").textContent = persistent;
  }

  updateLastUpdated() {
    const now = new Date();
    document.getElementById(
      "last-updated"
    ).textContent = `Last updated: ${now.toLocaleTimeString()}`;
  }

  async exportCookies() {
    try {
      const data = {
        url: this.currentUrl,
        domain: new URL(this.currentUrl).hostname,
        timestamp: new Date().toISOString(),
        cookies: this.cookies,
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `cookies_${
        new URL(this.currentUrl).hostname
      }_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showNotification("Cookies exported successfully!");
    } catch (error) {
      console.error("Error exporting cookies:", error);
      this.showError("Failed to export cookies");
    }
  }

  async clearAllCookies() {
    if (
      !confirm(
        "Are you sure you want to clear all cookies for this site? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const domain = new URL(this.currentUrl).hostname;

      // Get all possible domain variations
      const domainVariations = this.getDomainVariations(domain);

      // Collect all cookies from all domain variations
      const allCookies = [];
      for (const domainVar of domainVariations) {
        try {
          const cookies = await chrome.cookies.getAll({ domain: domainVar });
          allCookies.push(...cookies);
        } catch (error) {
          console.log(`Could not get cookies for domain: ${domainVar}`, error);
        }
      }

      // Also get URL-specific cookies
      try {
        const urlCookies = await chrome.cookies.getAll({
          url: this.currentUrl,
        });
        allCookies.push(...urlCookies);
      } catch (error) {
        console.log("Could not get URL-specific cookies:", error);
      }

      // Remove duplicates before clearing
      const uniqueCookies = this.deduplicateCookies(allCookies);

      // Clear all cookies
      let clearedCount = 0;
      for (const cookie of uniqueCookies) {
        try {
          const url = `${cookie.secure ? "https" : "http"}://${cookie.domain}${
            cookie.path
          }`;
          const removed = await chrome.cookies.remove({
            url: url,
            name: cookie.name,
            storeId: cookie.storeId,
          });
          if (removed) clearedCount++;
        } catch (error) {
          console.log(`Could not remove cookie: ${cookie.name}`, error);
        }
      }

      this.showNotification(`Cleared ${clearedCount} cookies!`);
      await this.loadCookies();
    } catch (error) {
      console.error("Error clearing cookies:", error);
      this.showError("Failed to clear cookies");
    }
  }

  showLoading(show) {
    const loading = document.getElementById("loading");
    const cookiesList = document.getElementById("cookies-list");
    const noCookies = document.getElementById("no-cookies");

    if (show) {
      loading.classList.remove("hidden");
      cookiesList.innerHTML = "";
      noCookies.classList.add("hidden");
    } else {
      loading.classList.add("hidden");
    }
  }

  showError(message) {
    const container = document.getElementById("cookies-list");
    container.innerHTML = `<div style="color: #dc3545; text-align: center; padding: 20px;">${message}</div>`;
  }

  showNotification(message) {
    // Create a temporary notification
    const notification = document.createElement("div");
    notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            font-size: 14px;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = "slideOut 0.3s ease";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 2000);
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

// Add CSS animations for notifications
const style = document.createElement("style");
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Initialize the cookie viewer when the popup loads
document.addEventListener("DOMContentLoaded", () => {
  new CookieViewer();
});
