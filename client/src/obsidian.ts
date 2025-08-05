import http from "./http";
import { TFile } from "obsidian";
import { PluginData, DEFAULT_SETTINGS } from "./types";

interface CreateResponse {
	id: string;
	secret: string;
}

const obsidianWrapper = {
	async createPost(baseUrl: string, authToken: string | undefined, title: string, content: string): Promise<CreateResponse> {
		return http("POST", `${baseUrl}/`, { title, content }, authToken);
	},
	async updatePost(
		baseUrl: string,
		authToken: string | undefined,
		id: string,
		secret: string,
		title: string,
		content: string
	): Promise<void> {
		return http("PUT", `${baseUrl}/${id}`, {
			secret,
			title,
			content,
		}, authToken);
	},
	async deletePost(baseUrl: string, authToken: string | undefined, id: string, secret: string): Promise<void> {
		return http("DELETE", `${baseUrl}/${id}`, { secret }, authToken);
	},
};

export interface Post {
	id: string;
	secret: string;
}

export interface ObsidianClient {
	data(): PluginData;

	getServerUrl(): string;

	getAuthToken(): string | undefined;

	publishPost(file: TFile): Promise<string | null>;

	createPost(view: TFile): Promise<string>;

	getUrl(view: TFile): string | null;

	updatePost(view: TFile): Promise<void>;

	deletePost(view: TFile): Promise<void>;

	handleNoteRename(file: TFile, oldPath: string): Promise<void>;

	handleNoteDelete(file: TFile): Promise<void>;
}

export async function createClient(
	loadData: () => Promise<PluginData>,
	saveData: (data: PluginData) => Promise<void>
): Promise<ObsidianClient> {
	const data = await loadData();

	// Ensure settings exist with defaults
	if (!data.settings) {
		data.settings = { ...DEFAULT_SETTINGS };
		await saveData(data);
	}

	return {
		data() {
			return data;
		},
		getServerUrl(): string {
			return data.settings?.serverUrl || DEFAULT_SETTINGS.serverUrl;
		},
		getAuthToken(): string | undefined {
			return data.settings?.authToken;
		},
		async publishPost(file: TFile) {
			if (data.posts[file.path]) {
				await this.updatePost(file);
				return null;
			} else {
				return await this.createPost(file);
			}
		},
		async createPost(file: TFile) {
			const title = file.basename;
			const content = await file.vault.read(file);
			const serverUrl = this.getServerUrl();
			const authToken = this.getAuthToken();

			try {
				const resp = await obsidianWrapper.createPost(serverUrl, authToken, title, content);
				data.posts[file.path] = {
					id: resp.id,
					secret: resp.secret,
				};
				await saveData(data);

				return `${serverUrl}/${resp.id}`;
			} catch (e) {
				console.error(e);
				throw new Error("Failed to create post");
			}
		},
		getUrl(file: TFile): string | null {
			const post = data.posts[file.path];
			if (!post) {
				return null;
			}

			const serverUrl = this.getServerUrl();
			return `${serverUrl}/${post.id}`;
		},
		async updatePost(file: TFile) {
			const post = data.posts[file.path];
			const title = file.basename;
			const content = await file.vault.read(file);
			const serverUrl = this.getServerUrl();
			const authToken = this.getAuthToken();

			try {
				await obsidianWrapper.updatePost(
					serverUrl,
					authToken,
					post.id,
					post.secret,
					title,
					content
				);
			} catch (e) {
				console.error(e);
				throw new Error("Failed to update post");
			}
		},
		async deletePost(file: TFile) {
			const post = data.posts[file.path];
			const serverUrl = this.getServerUrl();
			const authToken = this.getAuthToken();

			try {
				await obsidianWrapper.deletePost(serverUrl, authToken, post.id, post.secret);
				delete data.posts[file.path];
				await saveData(data);
			} catch (e) {
				console.error(e);
				throw new Error("Failed to delete post");
			}
		},
		async handleNoteRename(file, oldPath) {
			if (data.posts[oldPath]) {
				data.posts[file.path] = data.posts[oldPath];
				delete data.posts[oldPath];
				await saveData(data);
			}
		},
		async handleNoteDelete(file) {
			if (data.posts[file.path]) {
				delete data.posts[file.path];
				await saveData(data);
			}
		},
	};
}
