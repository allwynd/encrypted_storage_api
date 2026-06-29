# Secure Vault Azure Function

Node.js Azure Function app (v4 programming model) exposing two HTTP endpoints
that store and retrieve sensitive JSON, encrypted at rest with **AES-256-GCM**,
in MongoDB.

## Endpoints

### `POST /api/store`

Stores (creates or updates) an encrypted record under a unique name.

**Request body:**
```json
{
  "name": "ASB-Bank-Details",
  "category": "Bank",
  "email": "user@example.com",
  "password": "s3cret-password",
  "pin": "1234",
  "secrets": [
    { "label": "Account Number", "value": "12-3456-7890123-00" },
    { "label": "Security Question", "value": "Mother's maiden name: Smith" }
  ]
}
```
- `name` — required, unique identifier stored as a plaintext field and used for lookup.
- `category` — required, plaintext vault item type.
- `email` — required, must look like a valid email address.
- `password` — required string.
- `pin` — optional string.
- `secrets` — optional array of `{ label, value }` line items.

**Response (200):**
```json
{ "message": "Stored successfully.", "name": "ASB-Bank-Details" }
```

### `GET /api/retrieve/{name}`

Looks up the record by name, decrypts it, and returns the original JSON.

**Example:** `GET /api/retrieve/ASB-Bank-Details`

**Response (200):**
```json
{
  "name": "ASB-Bank-Details",
  "category": "Bank",
  "email": "user@example.com",
  "password": "s3cret-password",
  "pin": "1234",
  "secrets": [{ "label": "Account Number", "value": "12-3456-7890123-00" }],
  "createdAt": "2026-06-21T00:00:00.000Z",
  "updatedAt": "2026-06-21T00:00:00.000Z"
}
```
Returns `404` if the name doesn't exist.

## How encryption works

- `email`, `password`, `pin`, and `secrets` are bundled into a single object and
  encrypted as one blob using **AES-256-GCM** (authenticated encryption — it
  also detects tampering, not just confidentiality).
- A random 96-bit IV is generated per write, so encrypting the same data twice
  produces different ciphertext.
- The MongoDB document stores only `{ ciphertext, iv, authTag, algorithm }`
  plus the plaintext `name`, plaintext `category`, and timestamps — never plaintext secrets.
- Decryption verifies the GCM auth tag; if the stored data was tampered with
  or the key is wrong, decryption fails loudly instead of returning garbage.

## Project structure

```
secure-vault-function/
├── host.json
├── package.json
├── local.settings.json        # template — fill in your own values, never commit real secrets
└── src/
    ├── functions/
    │   ├── store.js
    │   └── retrieve.js
    └── lib/
        ├── crypto.js           # AES-256-GCM encrypt/decrypt
        ├── db.js                # cached MongoDB client/collection
        └── validate.js          # request payload validation
```

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Generate a 256-bit encryption key** (base64-encoded):
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

3. **Configure `local.settings.json`** (for local dev) or your Function App's
   **Application Settings** (in Azure) with:
   - `MONGODB_URI` — your MongoDB connection string (Atlas or self-hosted)
   - `MONGODB_DB_NAME` — e.g. `secure_vault`
   - `MONGODB_COLLECTION` — e.g. `vault_items`
   - `VAULT_ENCRYPTION_KEY` — the base64 key generated above

4. **Run locally** (requires [Azure Functions Core Tools](https://learn.microsoft.com/azure/azure-functions/functions-run-local)):
   ```bash
   npm start
   ```
   This serves `http://localhost:7071/api/store` and `/api/retrieve/{key}`.

5. **Test with curl:**
   ```bash
   curl -X POST http://localhost:7071/api/store \
     -H "Content-Type: application/json" \
     -d '{
           "name": "ASB-Bank-Details",
           "category": "Bank",
           "email": "user@example.com",
           "password": "s3cret-password",
           "pin": "1234",
           "secrets": [{"label":"Account Number","value":"12-3456-7890123-00"}]
         }'

   curl http://localhost:7071/api/retrieve/ASB-Bank-Details
   ```

## Security recommendations for production

- **Don't store `VAULT_ENCRYPTION_KEY` as a plain App Setting in production.**
  Put it in **Azure Key Vault** and reference it from the Function App
  configuration (`@Microsoft.KeyVault(SecretUri=...)`), or fetch it at
  startup via the Key Vault SDK with a managed identity.
- Set `authLevel: "function"` (already set) and require a function key, or
  better, put the Function App behind **Azure API Management** / **Easy Auth**
  (Azure AD) so endpoints aren't reachable with just a guessable key.
- Enable MongoDB **encryption at rest** and restrict network access
  (VNet/private endpoint or IP allow-list) as defense in depth — the
  application-level AES-256-GCM encryption protects the data even if the
  database itself is exposed, but both layers together are best practice.
- Consider key rotation: store a `keyVersion` alongside each encrypted record
  so you can support multiple decryption keys during rotation.
- Add rate limiting / WAF rules in front of these endpoints since they handle
  credentials.
