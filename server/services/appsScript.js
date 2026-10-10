/**
 * Database Service Facade (Backward Compatibility)
 * Re-exports the unified Database Adapter from /database.
 * All operations are routed dynamically based on process.env.DATABASE_TYPE (appscript, json, supabase).
 */

const db = require('../../database');

module.exports = db;
