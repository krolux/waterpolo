# Administrator user management

Deploy the standalone index.ts as the admin-users Supabase Edge Function. JWT verification stays enabled. The function also verifies the token with Auth and checks the caller's active Admin profile on every request. It uses the runtime's SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY; no server secret is placed in the Vite app.

Actions: list, create, edit, approve, password. Roles match the production user_role enum. Clubs are validated by ID. A caller cannot demote their own profile; their own password remains in Moje konto. No existing password or password hash is returned. Password values are never logged, returned, or persisted by the UI.

New accounts are email-confirmed and active. Initial passwords are supplied by the administrator. Creating an account does not replace the administrator's browser session. If profile creation fails, only the Auth account created by the same request is cleaned up. Existing account deletion is not exposed.

Run node tests/admin-users.test.cjs and npm run build. Runtime verification should include listing/searching users and logo/back navigation. A real account creation/password change requires an intended user and password entered by the administrator, not invented production test accounts.
