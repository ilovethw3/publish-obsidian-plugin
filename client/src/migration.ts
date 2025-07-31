// Data migration utilities for backward compatibility
// Ensures existing plugin data works with new settings structure

import { PluginData, DEFAULT_SETTINGS } from "./types";

/**
 * Legacy data format (before settings were added)
 */
interface LegacyData {
  posts: Record<string, { id: string; secret: string }>;
  // No settings field in legacy data
}

/**
 * Migrates legacy plugin data to the new format with settings
 * @param loadedData Raw data loaded from plugin storage
 * @returns Properly formatted PluginData with settings
 */
export function migratePluginData(loadedData: any): PluginData {
  // Handle completely empty/new installation
  if (!loadedData || Object.keys(loadedData).length === 0) {
    return {
      posts: {},
      settings: { ...DEFAULT_SETTINGS }
    };
  }

  // Handle legacy data format (no settings field)
  if (!loadedData.settings) {
    return {
      posts: loadedData.posts || {},
      settings: { ...DEFAULT_SETTINGS }
    };
  }

  // Handle partial settings (missing fields)
  const migratedSettings = {
    ...DEFAULT_SETTINGS,
    ...loadedData.settings
  };

  // Ensure posts exist
  return {
    posts: loadedData.posts || {},
    settings: migratedSettings
  };
}

/**
 * Validates that the migrated data structure is correct
 * @param data The migrated plugin data
 * @returns true if data structure is valid
 */
export function validatePluginData(data: PluginData): boolean {
  // Check that required fields exist
  if (!data || typeof data !== 'object') {
    return false;
  }

  if (!data.posts || typeof data.posts !== 'object') {
    return false;
  }

  if (!data.settings || typeof data.settings !== 'object') {
    return false;
  }

  if (!data.settings.serverUrl || typeof data.settings.serverUrl !== 'string') {
    return false;
  }

  // Validate that posts have correct structure
  for (const [path, post] of Object.entries(data.posts)) {
    if (!post || typeof post !== 'object') {
      return false;
    }
    
    if (!post.id || typeof post.id !== 'string') {
      return false;
    }
    
    if (!post.secret || typeof post.secret !== 'string') {
      return false;
    }
  }

  return true;
}