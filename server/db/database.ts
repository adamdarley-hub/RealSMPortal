import path from "path";
import fs from "fs";

// In production (Vercel), we don't use local SQLite database
// All data comes directly from ServeManager API
export const db = null;

// No-op functions for production compatibility
export function initializeDatabase() {
  console.log(
    "Running in serverless mode - no local database initialization needed",
  );
}

export function closeDatabase() {
  // No-op in serverless environment
}

export function getDatabaseStats() {
  // Return empty stats since no local database
  return [];
}

console.log("Database module loaded in serverless mode (no SQLite)");
