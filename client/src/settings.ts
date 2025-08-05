import { App, PluginSettingTab, Setting, Notice } from "obsidian";
import ObsidianPlugin from "../main";
import { isValidUrl, DEFAULT_SETTINGS, ServerHealthResponse } from "./types";
import http from "./http";

export class ObsidianSettingTab extends PluginSettingTab {
  plugin: ObsidianPlugin;

  constructor(app: App, plugin: ObsidianPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    // Title
    containerEl.createEl("h2", { text: "Obsidian Publishing System" });

    // Description
    containerEl.createEl("p", {
      text: "Configure your publishing server settings. Changes are saved automatically."
    });

    // Server URL Setting
    new Setting(containerEl)
      .setName("Server URL")
      .setDesc("The base URL of your publishing server (must use HTTPS, except for localhost)")
      .addText(text => text
        .setPlaceholder("https://your-server.com")
        .setValue(this.plugin.getServerUrl())
        .onChange(async (value) => {
          const trimmedValue = value.trim();
          
          if (!trimmedValue) {
            new Notice("Server URL cannot be empty");
            return;
          }

          if (!isValidUrl(trimmedValue)) {
            new Notice("Invalid URL format. Use HTTPS for production or HTTP for localhost only.");
            return;
          }

          // Update the setting
          await this.plugin.updateServerUrl(trimmedValue);
          new Notice("Server URL updated");
        }));

    // Authentication Token Setting
    new Setting(containerEl)
      .setName("Authentication Token")
      .setDesc("Optional authentication token for private servers")
      .addText(text => text
        .setPlaceholder("Enter token (optional)")
        .setValue(this.plugin.getAuthToken() || "")
        .onChange(async (value) => {
          await this.plugin.updateAuthToken(value.trim() || undefined);
        }));

    // Connection Test Section
    const connectionDiv = containerEl.createEl("div", { cls: "obsidian-connection-test" });
    connectionDiv.createEl("h3", { text: "Connection Test" });

    const statusEl = connectionDiv.createEl("p", { 
      text: "Click test to verify server connection",
      cls: "obsidian-connection-status"
    });

    new Setting(connectionDiv)
      .setName("Test Connection")
      .setDesc("Verify that the server is reachable and responding")
      .addButton(button => button
        .setButtonText("Test Connection")
        .onClick(async () => {
          button.setDisabled(true);
          button.setButtonText("Testing...");
          statusEl.setText("Testing connection...");
          statusEl.removeClass("obsidian-status-success", "obsidian-status-error");

          try {
            await this.testConnection();
            statusEl.setText("✓ Connection successful");
            statusEl.addClass("obsidian-status-success");
            new Notice("Connection test passed");
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : "Connection failed";
            statusEl.setText(`✗ ${errorMsg}`);
            statusEl.addClass("obsidian-status-error");
            new Notice(`Connection test failed: ${errorMsg}`);
          } finally {
            button.setDisabled(false);
            button.setButtonText("Test Connection");
          }
        }));

    // Reset to Default Section
    containerEl.createEl("hr");
    
    new Setting(containerEl)
      .setName("Reset to Default")
      .setDesc("Restore the original server settings")
      .addButton(button => button
        .setButtonText("Reset to Default")
        .setWarning()
        .onClick(async () => {
          await this.plugin.resetToDefaultSettings();
          new Notice("Settings reset to default");
          this.display(); // Refresh the UI
        }));
  }

  private async testConnection(): Promise<void> {
    const serverUrl = this.plugin.getServerUrl();
    const authToken = this.plugin.getAuthToken();
    
    try {
      // Test the /health endpoint
      const healthUrl = `${serverUrl}/health`;
      const response = await http("GET", healthUrl, undefined, authToken);
      
      // Validate response format
      if (typeof response === 'object' && response.status) {
        return; // Success
      } else {
        throw new Error("Invalid health check response format");
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Server unreachable: ${error.message}`);
      } else {
        throw new Error("Server unreachable: Unknown error");
      }
    }
  }
}