// Background service worker for Site Cookies Viewer
class CookieBackgroundService {
  constructor() {
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupCookieMonitoring();
  }

  setupEventListeners() {
    // Listen for extension installation
    chrome.runtime.onInstalled.addListener((details) => {
      if (details.reason === "install") {
        console.log("Site Cookies Viewer extension installed");
        this.showWelcomeNotification();
      } else if (details.reason === "update") {
        console.log("Site Cookies Viewer extension updated");
      }
    });

    // Listen for messages from popup or content scripts
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep the message channel open for async responses
    });

    // Listen for tab updates to track cookie changes
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === "complete" && tab.url) {
        this.onTabUpdated(tab);
      }
    });
  }

  setupCookieMonitoring() {
    // Monitor cookie changes
    chrome.cookies.onChanged.addListener((changeInfo) => {
      this.onCookieChanged(changeInfo);
    });
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case "getCookies":
          const cookies = await this.getCookiesForDomain(request.domain);
          sendResponse({ success: true, cookies });
          break;

        case "clearCookies":
          const result = await this.clearCookiesForDomain(request.domain);
          sendResponse({ success: true, result });
          break;

        case "getTabInfo":
          const tabInfo = await this.getCurrentTabInfo();
          sendResponse({ success: true, tabInfo });
          break;

        default:
          sendResponse({ success: false, error: "Unknown action" });
      }
    } catch (error) {
      console.error("Error handling message:", error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async getCookiesForDomain(domain) {
    try {
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
          url: `https://${domain}`,
        });
        allCookies.push(...urlCookies);
      } catch (error) {
        console.log("Could not get URL-specific cookies:", error);
      }

      // Deduplicate and return
      return this.deduplicateCookies(allCookies);
    } catch (error) {
      console.error("Error getting cookies for domain:", error);
      return [];
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

  async clearCookiesForDomain(domain) {
    try {
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
          url: `https://${domain}`,
        });
        allCookies.push(...urlCookies);
      } catch (error) {
        console.log("Could not get URL-specific cookies:", error);
      }

      // Remove duplicates before clearing
      const uniqueCookies = this.deduplicateCookies(allCookies);

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

      return { clearedCount, totalCount: uniqueCookies.length };
    } catch (error) {
      console.error("Error clearing cookies for domain:", error);
      throw error;
    }
  }

  async getCurrentTabInfo() {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      return {
        url: tab.url,
        title: tab.title,
        domain: tab.url ? new URL(tab.url).hostname : null,
      };
    } catch (error) {
      console.error("Error getting current tab info:", error);
      return null;
    }
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

  onCookieChanged(changeInfo) {
    const { cookie, removed, cause } = changeInfo;

    // Log cookie changes for debugging
    console.log("Cookie changed:", {
      name: cookie.name,
      domain: cookie.domain,
      removed,
      cause,
    });

    // Notify content scripts about cookie changes
    this.notifyContentScripts({
      action: "cookieChanged",
      cookie,
      removed,
      cause,
    });
  }

  onTabUpdated(tab) {
    // Update badge with cookie count for the current site
    this.updateBadge(tab);
  }

  async updateBadge(tab) {
    try {
      if (
        !tab.url ||
        tab.url.startsWith("chrome://") ||
        tab.url.startsWith("chrome-extension://")
      ) {
        chrome.action.setBadgeText({ text: "", tabId: tab.id });
        return;
      }

      const domain = new URL(tab.url).hostname;
      const cookies = await this.getCookiesForDomain(domain);

      const count = cookies.length;
      const badgeText = count > 0 ? count.toString() : "";

      chrome.action.setBadgeText({
        text: badgeText,
        tabId: tab.id,
      });

      // Set badge color based on cookie count
      let badgeColor = "#28a745"; // Green for low count
      if (count > 10) badgeColor = "#ffc107"; // Yellow for medium count
      if (count > 20) badgeColor = "#dc3545"; // Red for high count

      chrome.action.setBadgeBackgroundColor({
        color: badgeColor,
        tabId: tab.id,
      });
    } catch (error) {
      console.error("Error updating badge:", error);
    }
  }

  notifyContentScripts(message) {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (
          tab.url &&
          !tab.url.startsWith("chrome://") &&
          !tab.url.startsWith("chrome-extension://")
        ) {
          chrome.tabs.sendMessage(tab.id, message).catch(() => {
            // Ignore errors for tabs without content scripts
          });
        }
      });
    });
  }

  showWelcomeNotification() {
    // Simply show welcome message in console to avoid notification API issues
    this.showConsoleWelcome();
  }

  showConsoleWelcome() {
    // Fallback: show welcome message in console
    console.log(
      "%c🍪 Site Cookies Viewer",
      "color: #8B4513; font-size: 16px; font-weight: bold;"
    );
    console.log(
      "%cExtension installed successfully!",
      "color: #28a745; font-size: 14px;"
    );
    console.log(
      "%cClick the extension icon to view cookies for any website.",
      "color: #6c757d; font-size: 12px;"
    );
  }
}

// Initialize the background service
new CookieBackgroundService();
