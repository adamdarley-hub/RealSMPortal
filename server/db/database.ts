import path from "path";
import fs from "fs";
import * as schema from "./schema";

// Try to import better-sqlite3, but make it optional for production builds
let Database: any = null;
let drizzle: any = null;

try {
  Database = require("better-sqlite3");
  const drizzleModule = require("drizzle-orm/better-sqlite3");
  drizzle = drizzleModule.drizzle;
} catch (error) {
  console.log(
    "SQLite not available in production environment - using in-memory fallback",
  );
}

// Database file path - only used in development
const DB_PATH =
  process.env.DATABASE_PATH ||
  path.join(process.cwd(), "data", "servemanager.db");

let sqlite: any = null;
export let db: any = null;

// Initialize SQLite only if available (development environment)
if (Database && drizzle) {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Create SQLite database connection
    sqlite = new Database(DB_PATH);

    // Enable foreign keys and performance optimizations
    sqlite.pragma("foreign_keys = ON");
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("synchronous = NORMAL");
    sqlite.pragma("cache_size = 1000000");
    sqlite.pragma("temp_store = memory");
    sqlite.pragma("mmap_size = 268435456"); // 256MB

    // Create Drizzle instance
    db = drizzle(sqlite, { schema });
    console.log("SQLite database initialized for development");
  } catch (error) {
    console.log(
      "Failed to initialize SQLite, running without local database:",
      error.message,
    );
  }
} else {
  console.log("Running in production mode without local SQLite database");
}

// Initialize database (create tables if they don't exist)
export function initializeDatabase() {
  if (!sqlite) {
    console.log("Skipping database initialization - SQLite not available");
    return;
  }

  try {
    console.log("Initializing database...");

    // Create tables manually for now (simple approach)
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        servemanager_id TEXT UNIQUE,
        uuid TEXT,
        job_number TEXT,
        generated_job_id TEXT,
        reference TEXT,
        status TEXT,
        job_status TEXT,
        priority TEXT,
        urgency TEXT,
        created_at TEXT,
        updated_at TEXT,
        due_date TEXT,
        service_date TEXT,
        completed_date TEXT,
        received_date TEXT,
        client_id TEXT,
        client_name TEXT,
        client_company TEXT,
        client_email TEXT,
        client_phone TEXT,
        client_address TEXT,
        account_id TEXT,
        recipient_name TEXT,
        defendant_name TEXT,
        defendant_first_name TEXT,
        defendant_last_name TEXT,
        defendant_address TEXT,
        service_address TEXT,
        address TEXT,
        server_id TEXT,
        server_name TEXT,
        assigned_server TEXT,
        assigned_to TEXT,
        amount REAL,
        price REAL,
        cost REAL,
        fee REAL,
        total REAL,
        service_type TEXT,
        type TEXT,
        document_type TEXT,
        description TEXT,
        notes TEXT,
        instructions TEXT,
        attempt_count INTEGER,
        last_attempt TEXT,
        last_attempt_date TEXT,
        latitude REAL,
        longitude REAL,
        court TEXT,
        case_number TEXT,
        docket_number TEXT,
        plaintiff TEXT,
        attorney TEXT,
        law_firm TEXT,
        attempts TEXT,
        documents TEXT,
        attachments TEXT,
        gps_coordinates TEXT,
        tags TEXT,
        badges TEXT,
        raw_data TEXT,
        last_synced TEXT DEFAULT CURRENT_TIMESTAMP,
        created_local TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        servemanager_id TEXT UNIQUE,
        name TEXT,
        company TEXT,
        email TEXT,
        phone TEXT,
        address TEXT,
        billing_address TEXT,
        mailing_address TEXT,
        created_date TEXT,
        updated_date TEXT,
        active INTEGER,
        status TEXT,
        raw_data TEXT,
        last_synced TEXT DEFAULT CURRENT_TIMESTAMP,
        created_local TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS servers (
        id TEXT PRIMARY KEY,
        servemanager_id TEXT UNIQUE,
        name TEXT,
        first_name TEXT,
        last_name TEXT,
        email TEXT,
        phone TEXT,
        license_number TEXT,
        active INTEGER,
        status TEXT,
        territories TEXT,
        created_date TEXT,
        raw_data TEXT,
        last_synced TEXT DEFAULT CURRENT_TIMESTAMP,
        created_local TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        servemanager_id TEXT UNIQUE,
        invoice_number TEXT,
        client_id TEXT,
        client_name TEXT,
        client_company TEXT,
        status TEXT,
        subtotal REAL,
        tax REAL,
        total REAL,
        created_date TEXT,
        due_date TEXT,
        paid_date TEXT,
        jobs TEXT,
        raw_data TEXT,
        last_synced TEXT DEFAULT CURRENT_TIMESTAMP,
        created_local TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY,
        servemanager_id TEXT UNIQUE,
        name TEXT,
        email TEXT,
        phone TEXT,
        address TEXT,
        created_date TEXT,
        raw_data TEXT,
        last_synced TEXT DEFAULT CURRENT_TIMESTAMP,
        created_local TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS sync_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT UNIQUE,
        last_full_sync TEXT,
        last_incremental_sync TEXT,
        last_sync_status TEXT,
        last_sync_error TEXT,
        records_synced INTEGER,
        total_records INTEGER,
        sync_duration_ms INTEGER,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Create indexes for performance
      CREATE INDEX IF NOT EXISTS idx_jobs_servemanager_id ON jobs(servemanager_id);
      CREATE INDEX IF NOT EXISTS idx_jobs_client_id ON jobs(client_id);
      CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
      CREATE INDEX IF NOT EXISTS idx_jobs_priority ON jobs(priority);
      CREATE INDEX IF NOT EXISTS idx_jobs_server_id ON jobs(server_id);
      CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);
      CREATE INDEX IF NOT EXISTS idx_jobs_due_date ON jobs(due_date);
      CREATE INDEX IF NOT EXISTS idx_jobs_last_synced ON jobs(last_synced);
      
      CREATE INDEX IF NOT EXISTS idx_clients_servemanager_id ON clients(servemanager_id);
      CREATE INDEX IF NOT EXISTS idx_clients_company ON clients(company);
      CREATE INDEX IF NOT EXISTS idx_clients_active ON clients(active);
      
      CREATE INDEX IF NOT EXISTS idx_servers_servemanager_id ON servers(servemanager_id);
      CREATE INDEX IF NOT EXISTS idx_servers_active ON servers(active);
      
      CREATE INDEX IF NOT EXISTS idx_invoices_servemanager_id ON invoices(servemanager_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
    `);

    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
}

// Close database connection
export function closeDatabase() {
  if (sqlite) {
    sqlite.close();
  }
}

// Get database stats
export function getDatabaseStats() {
  if (!sqlite) {
    return [];
  }

  const stats = sqlite
    .prepare(
      `
    SELECT 
      'jobs' as table_name, COUNT(*) as count FROM jobs
    UNION ALL
    SELECT 'clients' as table_name, COUNT(*) as count FROM clients  
    UNION ALL
    SELECT 'servers' as table_name, COUNT(*) as count FROM servers
    UNION ALL
    SELECT 'invoices' as table_name, COUNT(*) as count FROM invoices
    UNION ALL
    SELECT 'contacts' as table_name, COUNT(*) as count FROM contacts
  `,
    )
    .all();

  return stats;
}

// Initialize database if SQLite is available
if (sqlite) {
  initializeDatabase();
}
