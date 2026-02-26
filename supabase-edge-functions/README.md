# Supabase Edge Functions for SA-HALL

This folder contains Supabase Edge Functions for server-side operations.

## Functions

### hyperpay-checkout

Handles HyperPay payment checkout requests to avoid CORS issues.

## Deployment

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Login:
```bash
supabase login
```

3. Deploy:
```bash
supabase functions deploy hyperpay-checkout --project-ref YOUR_PROJECT_REF
```

## Testing

Local testing:
```bash
supabase functions serve hyperpay-checkout
```

## Notes

- These functions are written in Deno/TypeScript
- They run on the server side, avoiding CORS issues
- Keep sensitive credentials (like HyperPay tokens) in the database, not in code
