# Google Authentication Fix

## Problem
Users were unable to log into websites (particularly Google) through the Arc browser, receiving the error: "Unable to get profile information from Google"

## Root Cause
The Electron webview was not properly configured to handle third-party authentication flows. Key missing configurations:
1. No user agent string (websites blocked the webview as a bot)
2. Missing `allowpopups` attribute (OAuth popups were blocked)
3. No persistent session partition for non-incognito tabs
4. Missing web preferences for native window handling
5. Web security was disabled in development mode
6. No permission handlers for authentication-related requests

## Changes Made

### 1. WebviewContainer.tsx
- Added `useragent` attribute with a modern Chrome user agent string
- Added `webpreferences="nativeWindowOpen=yes"` to enable proper popup handling
- Added `allowpopups="true"` to allow OAuth popup windows
- Changed partition from `undefined` to `'persist:arc-main'` for non-incognito tabs (enables cookie persistence)
- Updated TypeScript declarations to include new attributes

### 2. main.ts
- Changed `webSecurity` to always be `true` (was disabled in development)
- Added `allowRunningInsecureContent: false` for security
- Added `experimentalFeatures: true` for better compatibility
- Added session permission request handler to allow necessary permissions
- Added webRequest handler to ensure headers are properly forwarded

## How It Works

### User Agent
Websites like Google check the user agent to ensure they're dealing with a real browser. The webview now identifies itself as Chrome 120, which is widely supported.

### Popup Handling
OAuth flows often use popup windows. The `allowpopups` and `nativeWindowOpen` settings enable these popups to work correctly.

### Session Persistence
Non-incognito tabs now use a persistent partition (`persist:arc-main`), which means:
- Cookies are saved between sessions
- Login state persists across app restarts
- Each incognito tab still gets its own isolated partition

### Permissions
The permission handler allows necessary permissions for authentication flows while maintaining security by only allowing specific, safe permissions.

## Testing
After these changes, users should be able to:
1. Navigate to Google or other OAuth-enabled sites
2. Click "Sign in with Google"
3. Complete the authentication flow
4. Successfully log in and access their profile

## Security Notes
- Web security is now always enabled (even in development)
- Only specific, safe permissions are allowed
- Incognito tabs remain isolated with separate partitions
- Third-party cookies work only within the webview context
