// Content script for Site Cookies Viewer
class CookieContentScript {
  constructor() {
    this.activeNotifications = new Set();
    this.notificationQueue = [];
    this.isProcessingQueue = false;
    this.lastCookieCount = 0;
    this.notificationCooldown = 2000; // 2 seconds between notifications
    this.lastNotificationTime = 0;
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.injectCookieInfo();
  }

  setupEventListeners() {
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
    });

    // Monitor for cookie changes via DOM events
    this.setupCookieMonitoring();
  }

  setupCookieMonitoring() {
    // Monitor for cookie changes by watching document.cookie
    this.lastCookieCount = document.cookie
      .split(";")
      .filter((c) => c.trim()).length;

    // Check for cookie changes periodically
    setInterval(() => {
      const currentCookieCount = document.cookie
        .split(";")
        .filter((c) => c.trim()).length;
      if (currentCookieCount !== this.lastCookieCount) {
        this.onCookieCountChanged(currentCookieCount, this.lastCookieCount);
        this.lastCookieCount = currentCookieCount;
      }
    }, 1000);

    // Also monitor for storage events (localStorage, sessionStorage)
    window.addEventListener("storage", (event) => {
      this.onStorageChanged(event);
    });
  }

  handleMessage(request, sender, sendResponse) {
    switch (request.action) {
      case "cookieChanged":
        this.onCookieChanged(request.cookie, request.removed, request.cause);
        break;

      case "getPageInfo":
        sendResponse({
          url: window.location.href,
          domain: window.location.hostname,
          title: document.title,
          cookieCount: document.cookie.split(";").filter((c) => c.trim())
            .length,
        });
        break;

      default:
        // Unknown message, ignore
        break;
    }
  }

  onCookieChanged(cookie, removed, cause) {
    // Log cookie changes for debugging
    console.log("Cookie changed on page:", {
      name: cookie.name,
      domain: cookie.domain,
      removed,
      cause,
      page: window.location.href,
    });

    // Only show notification for explicit cookie changes, not automatic ones
    if (cause === "explicit" || cause === "overwrite") {
      this.showCookieChangeIndicator(cookie, removed);
    }
  }

  onCookieCountChanged(currentCount, previousCount) {
    const difference = currentCount - previousCount;
    const action = difference > 0 ? "added" : "removed";
    const count = Math.abs(difference);

    console.log(`${count} cookie(s) ${action} on ${window.location.hostname}`);

    // Notify background script about the change
    chrome.runtime.sendMessage({
      action: "cookieCountChanged",
      domain: window.location.hostname,
      currentCount,
      previousCount,
      difference,
    });
  }

  onStorageChanged(event) {
    // Monitor localStorage and sessionStorage changes
    console.log("Storage changed:", {
      key: event.key,
      oldValue: event.oldValue,
      newValue: event.newValue,
      storageArea:
        event.storageArea === localStorage ? "localStorage" : "sessionStorage",
    });
  }

  showCookieChangeIndicator(cookie, removed) {
    // Check cooldown to prevent spam
    const now = Date.now();
    if (now - this.lastNotificationTime < this.notificationCooldown) {
      return;
    }
    this.lastNotificationTime = now;

    // Create a unique ID for this notification
    const notificationId = `cookie-notification-${Date.now()}-${Math.random()}`;

    // Check if we already have too many notifications
    if (this.activeNotifications.size >= 3) {
      // Remove the oldest notification
      const oldestId = Array.from(this.activeNotifications)[0];
      this.removeNotification(oldestId);
    }

    // Create a temporary visual indicator for cookie changes
    const indicator = document.createElement("div");
    indicator.id = notificationId;
    indicator.style.cssText = `
            position: fixed;
            top: ${20 + this.activeNotifications.size * 50}px;
            right: 20px;
            background: ${removed ? "#dc3545" : "#28a745"};
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            z-index: 10000;
            animation: slideInRight 0.3s ease;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 300px;
            word-wrap: break-word;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;

    indicator.textContent = `${removed ? "❌" : "✅"} Cookie ${
      removed ? "removed" : "added"
    }: ${cookie.name}`;

    // Add close button
    const closeBtn = document.createElement("span");
    closeBtn.textContent = " ×";
    closeBtn.style.cssText = `
            float: right;
            cursor: pointer;
            font-weight: bold;
            margin-left: 8px;
        `;
    closeBtn.onclick = () => this.removeNotification(notificationId);
    indicator.appendChild(closeBtn);

    document.body.appendChild(indicator);
    this.activeNotifications.add(notificationId);

    // Remove after 4 seconds
    setTimeout(() => {
      this.removeNotification(notificationId);
    }, 4000);
  }

  removeNotification(notificationId) {
    const indicator = document.getElementById(notificationId);
    if (indicator) {
      indicator.style.animation = "slideOutRight 0.3s ease";
      setTimeout(() => {
        if (indicator.parentNode) {
          indicator.parentNode.removeChild(indicator);
        }
        this.activeNotifications.delete(notificationId);
      }, 300);
    }
  }

  injectCookieInfo() {
    // Add a small info panel to the page (optional)
    if (
      window.location.hostname !== "chrome://" &&
      !window.location.hostname.includes("chrome-extension://")
    ) {
      this.createCookieInfoPanel();
    }
  }

  createCookieInfoPanel() {
    // Create a floating info panel that shows basic cookie info
    const panel = document.createElement("div");
    panel.id = "site-cookies-info-panel";
    panel.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 11px;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            cursor: pointer;
            transition: opacity 0.3s ease;
            opacity: 0.7;
        `;

    panel.innerHTML = `
            <div>🍪 <span id="cookie-count">${
              document.cookie.split(";").filter((c) => c.trim()).length
            }</span> cookies</div>
        `;

    // Update cookie count periodically
    setInterval(() => {
      const count = document.cookie.split(";").filter((c) => c.trim()).length;
      const countElement = panel.querySelector("#cookie-count");
      if (countElement) {
        countElement.textContent = count;
      }
    }, 2000);

    // Show/hide on hover
    panel.addEventListener("mouseenter", () => {
      panel.style.opacity = "1";
    });

    panel.addEventListener("mouseleave", () => {
      panel.style.opacity = "0.7";
    });

    // Click to open extension popup
    panel.addEventListener("click", () => {
      chrome.runtime.sendMessage({ action: "openPopup" });
    });

    document.body.appendChild(panel);

    // Add CSS animations
    const style = document.createElement("style");
    style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
    document.head.appendChild(style);
  }

  // Utility function to get all cookies from the current page
  getAllCookies() {
    const cookies = document.cookie.split(";");
    const cookieData = [];

    cookies.forEach((cookie) => {
      const [name, value] = cookie.trim().split("=");
      if (name && value) {
        cookieData.push({
          name: name.trim(),
          value: value.trim(),
          domain: window.location.hostname,
          path: window.location.pathname,
        });
      }
    });

    return cookieData;
  }

  // Utility function to set a cookie
  setCookie(name, value, options = {}) {
    let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(
      value
    )}`;

    if (options.expires) {
      cookieString += `; expires=${options.expires.toUTCString()}`;
    }

    if (options.path) {
      cookieString += `; path=${options.path}`;
    }

    if (options.domain) {
      cookieString += `; domain=${options.domain}`;
    }

    if (options.secure) {
      cookieString += "; secure";
    }

    if (options.sameSite) {
      cookieString += `; samesite=${options.sameSite}`;
    }

    document.cookie = cookieString;
  }

  // Utility function to delete a cookie
  deleteCookie(name, options = {}) {
    this.setCookie(name, "", {
      ...options,
      expires: new Date(0),
    });
  }
}

// Initialize the content script
new CookieContentScript();
