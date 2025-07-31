# Obsidian Publishing System: Client Deployment Guide

Welcome to the official client deployment guide for the Obsidian Publishing System plugin. This document provides a comprehensive overview of the plugin's installation, configuration, usage, and development.

## Table of Contents
1. [System Requirements](#1-system-requirements)
2. [Installation Methods](#2-installation-methods)
3. [Configuration Management](#3-configuration-management)
4. [Complete User Guide](#4-complete-user-guide)
5. [Development Environment & Build Process](#5-development-environment--build-process)
6. [Advanced Configuration](#6-advanced-configuration)
7. [Security Best Practices](#7-security-best-practices)
8. [Automation & CI/CD](#8-automation--ci-cd)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. System Requirements

### For End-Users
- **Obsidian**: The latest version of the Obsidian desktop application.
- **Obsidian Publishing Server**: Access to a running instance of the corresponding Express.js server.
- **Credentials**: You must have the **Server URL** and a valid **Authentication Token** (UUID secret) provided by your server administrator.

### For Developers
- **Node.js**: Version 18.x or later.
- **npm** or **yarn**: For package management.
- **Git**: For version control.
- **Obsidian Desktop App**: A dedicated vault for testing the plugin is highly recommended.

---

## 2. Installation Methods

Choose the installation method that best suits your needs.

### Method 1: Manual Installation (Standard Users)
This is the most straightforward way to install the plugin.

1. Navigate to the **Releases** page of the plugin's GitHub repository.
2. Download the three build artifacts from the latest release: `main.js`, `manifest.json`, and `styles.css`.
3. In your Obsidian vault, go to the `.obsidian/plugins/` directory. Create it if it doesn't exist.
4. Create a new folder inside `plugins` named `obsidian-publishing-system`.
5. Place the three downloaded files inside this new folder.
6. Restart Obsidian or reload the app by pressing `Ctrl+R` (or `Cmd+R` on macOS).
7. Go to **Settings** > **Community Plugins**, find "Obsidian Publishing System," and enable it.

### Method 2: Using BRAT (Beta Testers & Developers)
For those who want to stay on the cutting edge or test beta versions.

1. Install the **Obsidian42 - BRAT** plugin from the in-app Community Plugins browser.
2. Enable BRAT and open its settings.
3. Click **Add Beta plugin** and enter the GitHub repository URL for this plugin.
4. BRAT will automatically install the plugin. You can then enable it under **Community Plugins**.

### Method 3: Development Setup
For developers who intend to contribute or create custom builds.

1. Clone the repository to your local machine:
   ```bash
   git clone <repository_url>
   cd obsidian-publishing-system
   ```
2. Install the required dependencies:
   ```bash
   npm install
   ```
3. Run the initial build to generate the plugin files:
   ```bash
   npm run build
   ```
4. Symlink the project directory into your Obsidian vault's plugins folder. This allows the hot-reload development script to work seamlessly.
   ```bash
   # Example for macOS/Linux
   ln -s "$(pwd)" "/path/to/your/vault/.obsidian/plugins/obsidian-publishing-system"
   ```
5. Reload Obsidian and enable the plugin.

---

## 3. Configuration Management

Proper configuration is key to connecting the plugin with your self-hosted server.

### Initial Server Setup
1. After installing and enabling the plugin, go to **Settings** > **Plugin Options** > **Obsidian Publishing System**.
2. You will see two fields:
   - **Server URL**: Enter the full base URL of your Express.js publishing server. It **must** use `https` (e.g., `https://publish.yourdomain.com`).
   - **Authentication Token**: Paste the UUID secret provided by your server administrator. This token is used as a Bearer token for all API requests.
3. Your settings are saved automatically.

### How Configuration is Stored
- Your server URL and authentication token are stored locally in your vault at `.obsidian/plugins/obsidian-publishing-system/data.json`.
- **Never commit `data.json` to a public repository**, as it contains your secret token.
- The plugin also maintains a local cache of metadata for published files within this `data.json` file to track their published state and public URLs.

---

## 4. Complete User Guide

The plugin integrates directly into the Obsidian UI via the command palette and context menus.

### Publishing a Note
- **Via Context Menu**: Right-click on a file in the file explorer and select **Publish to Web**.
- **Via Command Palette**: With a note open, press `Ctrl+P` (or `Cmd+P`) to open the command palette, search for "Publish current note," and execute it.

The plugin will send the note's content to the server, which will save it and return a public URL.

### Updating a Published Note
To update a note that is already published, simply perform the publish action again. The plugin will send the updated content to the server, overwriting the previous version.

### Un-publishing a Note
- **Via Context Menu**: Right-click on a published file and select **Un-publish from Web**.
- **Via Command Palette**: Open the command palette and execute **Un-publish current note**.

This sends a request to the server to delete the note.

### Copying the Public URL
Once a note is published, you can easily get its public link.
- **Via Context Menu**: Right-click on the published file and select **Copy Public URL**. The URL will be copied to your clipboard.

---

## 5. Development Environment & Build Process

### Technical Architecture
- **Language**: TypeScript
- **Bundler**: `esbuild` is used for fast and efficient bundling of the TypeScript code into a single `main.js` file.
- **Framework**: The plugin is built on the official **Obsidian Plugin API**.

### Build Workflow
The `package.json` file contains two primary scripts for building the plugin:

- **Production Build**: Creates an optimized build for release.
  ```bash
  npm run build
  ```
- **Development Build**: Starts `esbuild` in watch mode for hot-reloading. Any changes to the source code will trigger an automatic rebuild of `main.js`. For this to work, you must have the plugin enabled in Obsidian.
  ```bash
  npm run dev
  ```

### Debugging and Testing
- **Developer Console**: The primary tool for debugging is the Obsidian Developer Console. Open it with `Ctrl+Shift+I` (or `Cmd+Option+I` on macOS). All `console.log` statements from the plugin will appear here.
- **Manual Testing**: The most effective way to test is to set up a dedicated Obsidian vault. Use the development installation method and perform all user actions (publish, update, un-publish, copy URL) to verify functionality against a test server instance.

---

## 6. Advanced Configuration

### Managing Multiple Servers
The plugin UI is designed to connect to one server at a time. To work with multiple servers, you can use one of these strategies:
- **Multiple Vaults**: Use a separate Obsidian vault for each server you need to connect to. This is the cleanest approach.
- **Manual `data.json` Swapping**: For advanced users, you could maintain different `data.json` files and swap them out as needed, but this is error-prone.

### Custom Builds
You can customize the build process by editing `esbuild.config.mjs`. For example, you could add new plugins for `esbuild` or change the output directory if you are not using a symlink.

### Data Migration
The plugin's client-side data is minimal. To migrate your setup to a new machine or vault:
1. Install the plugin in the new location.
2. Copy the `data.json` file from your old vault's plugin directory (`.obsidian/plugins/obsidian-publishing-system/`) to the new one.
3. Reload Obsidian. The new plugin instance will now be configured with your server URL and token.

---

## 7. Security Best Practices

### HTTPS and CORS
- **Enforce HTTPS**: The plugin should only communicate with servers over `https`. The Express.js server **must** be configured with a valid SSL certificate. This prevents your authentication token and note content from being intercepted in transit.
- **CORS Policy**: The server's CORS (Cross-Origin Resource Sharing) policy must be strictly configured to only accept requests from the Obsidian application origin: `app://obsidian.md`.

### Authentication Token
- **Treat it as a Password**: Your authentication token grants full access to publish and un-publish notes on the server. Keep it confidential.
- **Do Not Hardcode**: Never hardcode the token in any scripts or commit it to version control. Always use the plugin's settings UI to configure it.

### Data Protection
- **Be Mindful of What You Publish**: Remember that any note you publish will be publicly accessible on the internet if your server is public. Do not publish sensitive information.

---

## 8. Automation & CI/CD

You can automate the release process using GitHub Actions. This ensures that every new release is built consistently and includes all necessary artifacts.

Create a file at `.github/workflows/release.yml` with the following content:

```yaml
name: Release Obsidian Plugin

on:
  push:
    tags:
      - '*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Build plugin
        run: npm run build

      - name: Create Release
        id: create_release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
          draft: false
          prerelease: false

      - name: Upload Release Assets
        uses: actions/upload-release-asset@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          upload_url: ${{ steps.create_release.outputs.upload_url }}
          asset_path: ./main.js
          asset_name: main.js
          asset_content_type: application/javascript

      - name: Upload Manifest
        uses: actions/upload-release-asset@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          upload_url: ${{ steps.create_release.outputs.upload_url }}
          asset_path: ./manifest.json
          asset_name: manifest.json
          asset_content_type: application/json

      - name: Upload Styles
        uses: actions/upload-release-asset@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          upload_url: ${{ steps.create_release.outputs.upload_url }}
          asset_path: ./styles.css
          asset_name: styles.css
          asset_content_type: text/css
```
This workflow triggers on any tag push (e.g., `v1.0.1`), builds the plugin, and attaches `main.js`, `manifest.json`, and `styles.css` to a new GitHub Release.

---

## 9. Troubleshooting

### Issue: Plugin fails to load or appears broken.
- **Solution**: Open the Developer Console (`Ctrl+Shift+I`). Errors during plugin loading will be displayed there. Ensure `main.js` and `manifest.json` are present in the correct plugin directory and that the JSON in `manifest.json` is valid.

### Issue: "Failed to fetch" or network errors in the console.
- **Solution 1 (URL)**: Verify the **Server URL** in the plugin settings is correct, includes `https://`, and is accessible from your computer (e.g., by opening it in a browser).
- **Solution 2 (CORS)**: This is a common server-side issue. The server's CORS policy must explicitly allow the `app://obsidian.md` origin. Check the server logs for CORS errors.
- **Solution 3 (HTTPS)**: The server must have a valid, trusted SSL certificate. Self-signed certificates will likely cause the connection to fail.

### Issue: "Authentication Failed" or `401 Unauthorized` / `403 Forbidden` errors.
- **Solution**: Your **Authentication Token** is incorrect or has expired. Re-enter the token from your server administrator into the plugin settings and ensure there are no typos or extra spaces.

### Issue: Hot reload (`npm run dev`) isn't working.
- **Solution**: Confirm that your project folder is correctly symlinked into your vault's `.obsidian/plugins` directory. If not using a symlink, the `esbuild.config.mjs` file must be updated to point its output directly to your vault's plugin folder. Also, ensure Obsidian has the necessary file permissions to read the updated files.

---

This comprehensive guide covers everything you need to successfully deploy, configure, and use the Obsidian Publishing System plugin. For additional support, please refer to the project's GitHub repository or contact your system administrator.