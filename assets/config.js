/* ==========================================================================
   Praja Sakti Group — Architect Scoring System
   CONFIGURATION (edit this file after one-time Supabase setup)

   Steps:
   1. Create a free project at https://supabase.com
   2. Run supabase/schema.sql in the SQL Editor
   3. Paste your Project URL and anon public key below
   4. Set a roomId (any string; use one room per project/cohort)

   The anon key is designed to be public and safe to embed in a static site.
   Access control is enforced by Row Level Security in schema.sql, NOT by
   hiding this key.
   ========================================================================== */

window.PRAJA_CONFIG = {
  // e.g. "https://abcdefghijklmnop.supabase.co"
  supabaseUrl: "https://iriypmpdwduchkjktlpe.supabase.co",

  // Project Settings -> API -> "anon public" key
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyaXlwbXBkd2R1Y2hramt0bHBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5OTcxNTAsImV4cCI6MjEwNzU3MzE1MH0.jRPN3S4e0R0hPz5f12zfFcHV1yiCV3QdNavQtMNJ8Bs",

  // Shared room identifier. All assessors using the same roomId share data.
  // Use something project-specific, e.g. "kemanggisan-pulo-2026".
  roomId: "kemanggisan-pulo",

  // Table name (must match schema.sql)
  tableName: "praja_assessments",

  // OPTIONAL passphrase required before a CLOUD-wide reset (wiping every
  // assessor's data for this room). Leave "" to rely on the typed
  // confirmation only. NOTE: this file is public, so the passphrase is a
  // deterrent, not real security -- it only guards the reset button.
  resetPassphrase: "",
};

/* Returns true when cloud sync is configured and available. */
window.isCloudConfigured = function () {
  var c = window.PRAJA_CONFIG || {};
  return !!(c.supabaseUrl && c.supabaseAnonKey && window.supabase);
};
