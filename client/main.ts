import { Notice, Plugin, TFile } from "obsidian";
import type { ObsiusClient } from "./src/obsius";
import { createClient } from "./src/obsius";
import { getText } from "./src/text";
import { PublishedPostsModal } from "./src/modals";
import { ObsiusSettingTab } from "./src/settings";
import { PluginData, DEFAULT_SETTINGS, isValidUrl } from "./src/types";
import { migratePluginData, validatePluginData } from "./src/migration";

export default class ObsiusPlugin extends Plugin {
	obsiusClient: ObsiusClient;

	async onload() {
		this.obsiusClient = await createClient(
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
		this.addSettingTab(new ObsiusSettingTab(this.app, this));
	}

	onunload() {}

	// Settings management methods
	getServerUrl(): string {
		return this.obsiusClient.getServerUrl();
	}

	getAuthToken(): string | undefined {
		return this.obsiusClient.getAuthToken();
	}

	async updateServerUrl(newUrl: string): Promise<void> {
		if (!isValidUrl(newUrl)) {
			throw new Error("Invalid URL format");
		}

		const data = this.obsiusClient.data();
		if (!data.settings) {
			data.settings = { ...DEFAULT_SETTINGS };
		}
		data.settings.serverUrl = newUrl;
		await this.saveData(data);
	}

	async updateAuthToken(newToken: string | undefined): Promise<void> {
		const data = this.obsiusClient.data();
		if (!data.settings) {
			data.settings = { ...DEFAULT_SETTINGS };
		}
		data.settings.authToken = newToken;
		await this.saveData(data);
	}

	async resetToDefaultSettings(): Promise<void> {
		const data = this.obsiusClient.data();
		data.settings = { ...DEFAULT_SETTINGS };
		await this.saveData(data);
	}

	addObsiusCommands() {
		this.addCommand({
			id: "obsius.action.listPosts",
			name: getText("actions.listPosts.name"),
			callback: () => this.showPublishedPosts(),
		});
		this.addCommand({
			id: "obsius.action.create",
			name: getText("actions.create.name"),
			editorCheckCallback: (checking, _, view) => {
				if (!(view.file instanceof TFile)) {
					return false;
				}
				if (checking) {
					return !this.obsiusClient.getUrl(view.file);
				}
				this.publishFile(view.file);
			},
		});
		this.addCommand({
			id: "obsius.action.update",
			name: getText("actions.update.name"),
			editorCheckCallback: (checking, _, view) => {
				if (!(view.file instanceof TFile)) {
					return false;
				}
				if (checking) {
					return !!this.obsiusClient.getUrl(view.file);
				}
				this.updateFile(view.file);
			},
		});
		this.addCommand({
			id: "obsius.action.copyUrl",
			name: getText("actions.copyUrl.name"),
			editorCheckCallback: (checking, _, view) => {
				if (!(view.file instanceof TFile)) {
					return false;
				}
				if (checking) {
					return !!this.obsiusClient.getUrl(view.file);
				}
				this.copyUrl(view.file);
			},
		});
		this.addCommand({
			id: "obsius.action.remove",
			name: getText("actions.remove.name"),
			editorCheckCallback: (checking, _, view) => {
				if (!(view.file instanceof TFile)) {
					return false;
				}
				if (checking) {
					return !!this.obsiusClient.getUrl(view.file);
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
					if (!this.obsiusClient.getUrl(file)) {
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
					this.obsiusClient.handleNoteRename(file, oldPath);
				}
			})
		);
		this.registerEvent(
			this.app.vault.on("delete", (file) => {
				if (file instanceof TFile) {
					this.obsiusClient.handleNoteDelete(file);
				}
			})
		);
	}

	showPublishedPosts() {
		new PublishedPostsModal(this.app, this.obsiusClient).open();
	}

	async publishFile(file: TFile) {
		try {
			const url = await this.obsiusClient.createPost(file);
			await navigator.clipboard.writeText(url);
			new Notice(getText("actions.create.success"));
		} catch (e) {
			console.error(e);
			new Notice(getText("actions.create.failure"));
		}
	}

	async updateFile(file: TFile) {
		try {
			await this.obsiusClient.updatePost(file);
			new Notice(getText("actions.update.success"));
		} catch (e) {
			console.error(e);
			new Notice(getText("actions.update.failure"));
		}
	}

	async copyUrl(file: TFile) {
		const url = this.obsiusClient.getUrl(file);
		if (url) {
			await navigator.clipboard.writeText(url);
			new Notice(getText("actions.copyUrl.success"));
		} else {
			new Notice(getText("actions.copyUrl.failure"));
		}
	}

	async deleteFile(file: TFile) {
		try {
			await this.obsiusClient.deletePost(file);
			new Notice(getText("actions.remove.success"));
		} catch (e) {
			console.error(e);
			new Notice(getText("actions.remove.failure"));
		}
	}
}
