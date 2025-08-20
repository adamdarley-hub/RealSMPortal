// Test script to verify the app works without better-sqlite3 in production
const express = require('express');

console.log('Testing production mode without SQLite...');

try {
  // Try to require better-sqlite3 - should fail in production
  const Database = require('better-sqlite3');
  console.log('❌ better-sqlite3 is available - this should not happen in production');
} catch (error) {
  console.log('✅ better-sqlite3 not available (expected in production)');
}

// Test importing our database module
try {
  const { db, initializeDatabase } = require('./server/db/database.ts');
  console.log('✅ Database module imported successfully');
  console.log('Database instance:', db ? 'Available' : 'Null (expected in production)');
  
  initializeDatabase();
  console.log('✅ Database initialization completed without errors');
} catch (error) {
  console.log('❌ Error importing database module:', error.message);
}

console.log('Production test completed');
