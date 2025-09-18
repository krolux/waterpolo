// src/lib/imports.ts
import { supabase } from "./supabase"

/** Wrzuć CSV do bucketa 'imports' pod nazwą 'users.csv' */
export async function uploadImportCSV(file: File) {
  const { error } = await supabase.storage
    .from("imports")
    .upload("users.csv", file, { upsert: true, contentType: "text/csv" })
  if (error) throw error
}

/** Wywołaj Edge Function 'bulk-import-users' (musi być wdrożona w projekcie). */
export async function triggerBulkImport() {
  const { data, error } = await supabase.functions.invoke("bulk-import-users", {
      body: { path: "imports/users.csv" }
  })
  if (error) throw error
  return data
}
