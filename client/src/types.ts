// Client-side types for Obsidian Publishing System
// Based on design document specifications

export interface PluginSettings {
  serverUrl: string;          // Custom server URL
  authToken?: string;         // Optional authentication token for private servers
}

export interface PluginData {
  posts: Record<string, Post>;
  settings?: PluginSettings;
}

export interface Post {
  id: string;
  secret: string;
}

// Default settings
export const DEFAULT_SETTINGS: PluginSettings = {
  serverUrl: "https://share.141029.xyz"
};

// URL validation helper
export function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    
    // Allow HTTPS for production, HTTP only for localhost
    if (url.protocol === 'https:') {
      return true;
    }
    
    if (url.protocol === 'http:' && 
        (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) {
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
}

// Server health check response
export interface ServerHealthResponse {
  status: string;
  timestamp: string;
  version?: string;
}