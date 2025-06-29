# Site Cookies Viewer - Chrome Extension

A powerful Chrome extension that displays and manages cookies for the current website while browsing. Built with Manifest V3 for modern Chrome browsers.

## Features

### 🍪 Cookie Display

- View all cookies for the current website in real-time
- Display cookie details including name, value, domain, path, expiration, and security flags
- Distinguish between session and persistent cookies
- Show cookie statistics (total, session, persistent counts)

### 🌐 Comprehensive Domain Detection

- **Smart domain matching**: Automatically detects cookies from root domain, subdomains, and related domains
- **Cross-domain cookies**: Finds cookies from `domain.com`, `www.domain.com`, `api.domain.com`, etc.
- **URL-specific cookies**: Captures cookies specific to the current page URL
- **Error handling**: Gracefully handles domain variations and missing cookies

### �� Search & Filter

- Search cookies by name, value, or domain
- Real-time filtering as you type
- Clear visual indicators for different cookie types

### 📊 Cookie Management

- Export cookies to JSON format for backup or analysis
- Clear all cookies for the current site with confirmation
- Refresh cookie data manually
- Real-time cookie change monitoring

### 🎨 Modern UI

- Beautiful, responsive design with gradient backgrounds
- Smooth animations and hover effects
- Color-coded cookie types and statistics
- Mobile-friendly popup interface

### 🔔 Real-time Monitoring

- Live cookie change notifications
- Badge showing cookie count on extension icon
- Color-coded badges (green/yellow/red based on cookie count)
- Floating info panel on web pages

## Installation

### From Source (Developer Mode)

1. **Clone or download this repository**

   ```bash
   git clone <repository-url>
   cd site-cookies
   ```

2. **Open Chrome and navigate to Extensions**

   - Go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)

3. **Load the extension**

   - Click "Load unpacked"
   - Select the `site-cookies` folder
   - The extension should now appear in your extensions list

4. **Pin the extension**
   - Click the puzzle piece icon in Chrome toolbar
   - Find "Site Cookies Viewer" and click the pin icon

### Using the Extension

1. **Navigate to any website**
2. **Click the extension icon** in your Chrome toolbar
3. **View cookies** - The popup will show all cookies for the current site
4. **Use the features**:
   - 🔄 **Refresh**: Update cookie data
   - 📥 **Export**: Download cookies as JSON
   - 🗑️ **Clear All**: Remove all cookies for the site
   - 🔍 **Search**: Filter cookies by typing in the search box

## File Structure

```
site-cookies/
├── manifest.json          # Extension manifest (Manifest V3)
├── popup.html            # Main popup interface
├── popup.css             # Popup styling
├── popup.js              # Popup functionality
├── background.js         # Background service worker
├── content.js            # Content script for web pages
├── icons/                # Extension icons (SVG format)
│   ├── icon16.svg
│   ├── icon32.svg
│   ├── icon48.svg
│   └── icon128.svg
└── README.md            # This file
```

## Technical Details

### Manifest V3 Features

- **Service Worker**: Background script for cookie monitoring
- **Content Scripts**: Page-level cookie tracking
- **Permissions**: Minimal required permissions for cookie access
- **Host Permissions**: Access to all URLs for cookie reading

### Permissions Used

- `cookies`: Read and manage browser cookies
- `activeTab`: Access current tab information
- `storage`: Store extension data
- `<all_urls>`: Access cookies from all websites

### Browser Compatibility

- Chrome 88+ (Manifest V3 support)
- Edge 88+ (Chromium-based)
- Other Chromium-based browsers

## Development

### Prerequisites

- Modern web browser with Manifest V3 support

### Testing

1. Load the extension in developer mode
2. Navigate to various websites (including subdomains)
3. Test cookie viewing, searching, and management features
4. Check console for any errors

### Customization

- Modify `popup.css` for styling changes
- Update `popup.js` for functionality changes
- Edit `background.js` for background behavior
- Customize `content.js` for page-level features

## Privacy & Security

### Data Handling

- **No data collection**: The extension doesn't collect or transmit any user data
- **Local processing**: All cookie data is processed locally in the browser
- **No tracking**: No analytics or tracking code included
- **Open source**: Full transparency of code and functionality

### Permissions Justification

- `cookies`: Required to read and display cookie information
- `activeTab`: Needed to identify the current website
- `storage`: Used for extension preferences and settings
- `<all_urls>`: Required to access cookies from any website

## Troubleshooting

### Common Issues

**Extension not loading**

- Ensure Developer mode is enabled
- Check for syntax errors in manifest.json
- Verify all required files are present

**Cookies not displaying**

- Check if the website has cookies
- Verify permissions are granted
- Look for console errors
- Try refreshing the extension popup

**Missing cookies from subdomains**

- The extension automatically detects cookies from related domains
- If cookies are still missing, check the browser's cookie settings
- Ensure the website allows cross-domain cookies

### Debug Mode

1. Open Chrome DevTools
2. Go to Extensions page
3. Click "background page" for the extension
4. Check console for errors

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.

## Support

For issues, questions, or contributions:

- Create an issue on GitHub
- Check the troubleshooting section
- Review the code comments for implementation details

---

**Note**: This extension is designed for educational and development purposes. Always respect website privacy policies and terms of service when using cookie-related tools.
