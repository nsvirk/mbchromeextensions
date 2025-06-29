// Content script for Site Cookies Viewer
class CookieContentScript {
  constructor() {
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
    let lastCookieCount = document.cookie.split(";").length;

    // Check for cookie changes periodically
    setInterval(() => {
      const currentCookieCount = document.cookie.split(";").length;
      if (currentCookieCount !== lastCookieCount) {
        this.onCookieCountChanged(currentCookieCount, lastCookieCount);
        lastCookieCount = currentCookieCount;
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

    // You could add visual indicators here if needed
    this.showCookieChangeIndicator(cookie, removed);
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
    // Create a temporary visual indicator for cookie changes
    const indicator = document.createElement("div");
    indicator.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${removed ? "#dc3545" : "#28a745"};
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            z-index: 10000;
            animation: slideInRight 0.3s ease;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

    indicator.textContent = `${removed ? "❌" : "✅"} Cookie ${
      removed ? "removed" : "added"
    }: ${cookie.name}`;

    document.body.appendChild(indicator);

    // Remove after 3 seconds
    setTimeout(() => {
      indicator.style.animation = "slideOutRight 0.3s ease";
      setTimeout(() => {
        if (indicator.parentNode) {
          indicator.parentNode.removeChild(indicator);
        }
      }, 300);
    }, 3000);
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
