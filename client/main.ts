import { Notice, Plugin, TFile } from "obsidian";
import type { ObsidianClient } from "./src/obsidian";
import { createClient } from "./src/obsidian";
import { getText } from "./src/text";
import { PublishedPostsModal } from "./src/modals";
import { ObsidianSettingTab } from "./src/settings";
import { PluginData, DEFAULT_SETTINGS, isValidUrl } from "./src/types";
import { migratePluginData, validatePluginData } from "./src/migration";

export default class ObsidianPlugin extends Plugin {
	obsidianClient: ObsidianClient;

	async onload() {
		this.obsidianClient = await createClient(
			async () => {
				const loadedData = await this.loadData();
				const migratedData = migratePluginData(loadedData);
				
				// Validate the migrated data
				if (!validatePluginData(migratedData)) {
					console.error('Invalid plugin data detected, resetting to defaults');
					new Notice('Plugin data was corrupted and has been reset to defaults');
					return {
						posts: {},
						settings: { ...DEFAULT_SETTINGS }
					} as PluginData;
				}
				
				// Save migrated data back if it was changed
				if (JSON.stringify(loadedData) !== JSON.stringify(migratedData)) {
					await this.saveData(migratedData);
					console.log('Plugin data migrated to new format');
				}
				
				return migratedData;
			},
			async (data) => await this.saveData(data)
		);

		this.addObsiusCommands();
		this.registerFileMenuEvent();
		this.registerVaultEvents();
		
		// Add settings tab
		this.addSettingTab(new ObsidianSettingTab(this.app, this));
	}

	onunload() {}

	// Settings management methods
	getServerUrl(): string {
		return this.obsidianClient.getServerUrl();
	}

	getAuthToken(): string | undefined {
		return this.obsidianClient.getAuthToken();
	}

	async updateServerUrl(newUrl: string): Promise<void> {
		if (!isValidUrl(newUrl)) {
			throw new Error("Invalid URL format");
		}

		const data = this.obsidianClient.data();
		if (!data.settings) {
			data.settings = { ...DEFAULT_SETTINGS };
		}
		data.settings.serverUrl = newUrl;
		await this.saveData(data);
	}

	async updateAuthToken(newToken: string | undefined): Promise<void> {
		const data = this.obsidianClient.data();
		if (!data.settings) {
			data.settings = { ...DEFAULT_SETTINGS };
		}
		data.settings.authToken = newToken;
		await this.saveData(data);
	}

	async resetToDefaultSettings(): Promise<void> {
		const data = this.obsidianClient.data();
		data.settings = { ...DEFAULT_SETTINGS };
		await this.saveData(data);
	}

	addObsiusCommands() {
		this.addCommand({
			id: "obsidian.action.listPosts",
			name: getText("actions.listPosts.name"),
			callback: () => this.showPublishedPosts(),
		});
		this.addCommand({
			id: "obsidian.action.create",
			name: getText("actions.create.name"),
			editorCheckCallback: (checking, _, view) => {
				if (!(view.file instanceof TFile)) {
					return false;
				}
				if (checking) {
					return !this.obsidianClient.getUrl(view.file);
				}
				this.publishFile(view.file);
			},
		});
		this.addCommand({
			id: "obsidian.action.update",
			name: getText("actions.update.name"),
			editorCheckCallback: (checking, _, view) => {
				if (!(view.file instanceof TFile)) {
					return false;
				}
				if (checking) {
					return !!this.obsidianClient.getUrl(view.file);
				}
				this.updateFile(view.file);
			},
		});
		this.addCommand({
			id: "obsidian.action.copyUrl",
			name: getText("actions.copyUrl.name"),
			editorCheckCallback: (checking, _, view) => {
				if (!(view.file instanceof TFile)) {
					return false;
				}
				if (checking) {
					return !!this.obsidianClient.getUrl(view.file);
				}
				this.copyUrl(view.file);
			},
		});
		this.addCommand({
			id: "obsidian.action.remove",
			name: getText("actions.remove.name"),
			editorCheckCallback: (checking, _, view) => {
				if (!(view.file instanceof TFile)) {
					return false;
				}
				if (checking) {
					return !!this.obsidianClient.getUrl(view.file);
				}
				this.deleteFile(view.file);
			},
		});
	}

	registerFileMenuEvent() {
		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				if (file instanceof TFile) {
					menu.addSeparator();
					if (!this.obsidianClient.getUrl(file)) {
						menu.addItem((item) =>
							item
								.setTitle(getText("actions.create.name"))
								.setIcon("up-chevron-glyph")
								.onClick(() => this.publishFile(file))
						);
					} else {
						menu.addItem((item) =>
							item
								.setTitle(getText("actions.update.name"))
								.setIcon("double-up-arrow-glyph")
								.onClick(() => this.updateFile(file))
						)
							.addItem((item) =>
								item
									.setTitle(getText("actions.copyUrl.name"))
									.setIcon("link")
									.onClick(() => this.copyUrl(file))
							)
							.addItem((item) =>
								item
									.setTitle(getText("actions.remove.name"))
									.setIcon("cross")
									.onClick(() => this.deleteFile(file))
							);
					}
					menu.addSeparator();
				}
			})
		);
	}

	registerVaultEvents() {
		this.registerEvent(
			this.app.vault.on("rename", (file, oldPath) => {
				if (file instanceof TFile) {
					this.obsidianClient.handleNoteRename(file, oldPath);
				}
			})
		);
		this.registerEvent(
			this.app.vault.on("delete", (file) => {
				if (file instanceof TFile) {
					this.obsidianClient.handleNoteDelete(file);
				}
			})
		);
	}

	showPublishedPosts() {
		new PublishedPostsModal(this.app, this.obsidianClient).open();
	}

	async publishFile(file: TFile) {
		try {
			const url = await this.obsidianClient.createPost(file);
			await navigator.clipboard.writeText(url);
			new Notice(getText("actions.create.success"));
		} catch (e) {
			console.error(e);
			new Notice(getText("actions.create.failure"));
		}
	}

	async updateFile(file: TFile) {
		try {
			await this.obsidianClient.updatePost(file);
			new Notice(getText("actions.update.success"));
		} catch (e) {
			console.error(e);
			new Notice(getText("actions.update.failure"));
		}
	}

	async copyUrl(file: TFile) {
		const url = this.obsidianClient.getUrl(file);
		if (url) {
			await navigator.clipboard.writeText(url);
			new Notice(getText("actions.copyUrl.success"));
		} else {
			new Notice(getText("actions.copyUrl.failure"));
		}
	}

	async deleteFile(file: TFile) {
		try {
			await this.obsidianClient.deletePost(file);
			new Notice(getText("actions.remove.success"));
		} catch (e) {
			console.error(e);
			new Notice(getText("actions.remove.failure"));
		}
	}
}
