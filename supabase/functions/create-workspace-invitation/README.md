# create-workspace-invitation (Edge Function)

**Stage 4C-B — delivery-pending only.** This function creates a workspace invitation through the server-only PostgreSQL RPC `public.create_workspace_invitation` and returns a safe pending result. **No email is sent** in this stage.

## Two-client boundary

| Client | Key | Purpose |
|--------|-----|---------|
| **User-authenticated** | `SUPABASE_ANON_KEY` + caller `Authorization: Bearer <JWT>` | Verify the caller with `auth.getUser(jwt)`. Never trust body-supplied user IDs. |
| **Service-role** | `SUPABASE_SERVICE_ROLE_KEY` (server env only) | Call `create_workspace_invitation` RPC. Required because create is granted to `service_role` only. |

**Important:** A service-role Supabase client does **not** preserve `auth.uid()` inside PostgreSQL. The Edge Function therefore:

1. Verifies the JWT with the anon client.
2. Passes `p_inviter_user_id = verifiedUser.id` to the RPC via the service-role client.

The service-role key must never appear in responses, logs, frontend code, or Git.

## Request

```http
POST /functions/v1/create-workspace-invitation
Authorization: Bearer <user_access_jwt>
Content-Type: application/json

{
  "workspaceId": "uuid",
  "inviteeEmail": "person@example.com",
  "requestedRole": "admin" | "member"
}
```

Body fields **`inviterUserId` / `userId` are ignored and rejected** if present.

## Success response (browser-safe)

```json
{
  "ok": true,
  "deliveryStatus": "pending",
  "invitationId": "uuid"
}
```

- **`deliveryStatus` is always `"pending"`** until a real email provider is configured in a later stage.
- **Never returned:** `raw_token`, `token_hash`, invitation links, or secrets.

## Error response

```json
{
  "ok": false,
  "error": "Unable to send invitation. Please try again.",
  "category": "UNAUTHORIZED" | "FORBIDDEN" | "INVALID_REQUEST" | "INVITATION_PENDING" | "INTERNAL_ERROR"
}
```

Errors are generic and must not reveal whether an arbitrary email exists outside the caller's workspace.

## Environment variables (Supabase Edge Function secrets)

| Variable | Required | Notes |
|----------|----------|-------|
| `SUPABASE_URL` | Yes | Provided by Supabase |
| `SUPABASE_ANON_KEY` | Yes | Provided by Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only; set as Edge Function secret |
| `ALLOWED_ORIGINS` | No | Comma-separated extra CORS origins for deployed app |

## CORS

Restrictive CORS for local Vite ports (`5173`, `5174`) plus optional `ALLOWED_ORIGINS`. Does not use `*` with credentials.

## Token handling

PostgreSQL generates the raw invitation token inside `create_workspace_invitation`. The RPC composite result may include `raw_token` in server memory. This function:

1. Reads only `invitation.id`.
2. Discards `raw_token` immediately.
3. Does **not** log request bodies, authorization headers, or token material.

## Deployment prerequisites (manual — not part of this stage)

1. Applied migration `0002_workspace_invitations_functions.sql` on project `ryobamnkdqpywlpfjwzo`.
2. Supabase CLI or Dashboard deploy of this function.
3. Edge Function secret: `SUPABASE_SERVICE_ROLE_KEY` (already available to hosted functions; confirm in project settings).
4. Optional: `ALLOWED_ORIGINS` for production app URL.

## Out of scope

- Email provider (Resend, SendGrid, etc.)
- Returning copyable invitation links
- React invitation UI
- Calling this function from automated tests against production

## Local check (optional)

If Deno is installed:

```bash
deno check supabase/functions/create-workspace-invitation/index.ts
```

Do not deploy from this stage without explicit approval.
