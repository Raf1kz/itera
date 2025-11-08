# Apply User Profiles Migration

## Quick Steps

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://app.supabase.com/project/wlzyfvywhpoahctwcpos
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `supabase/migrations/20251027235900_create_user_profiles.sql`
5. Paste into the SQL editor
6. Click **Run** or press `Cmd/Ctrl + Enter`
7. Verify success (should see "Success. No rows returned")

### Option 2: Supabase CLI

If you have Supabase CLI installed:

```bash
# Make sure you're logged in
supabase login

# Link to your project
supabase link --project-ref wlzyfvywhpoahctwcpos

# Apply migration
supabase db push
```

### Option 3: Direct SQL

```bash
# Using psql or any PostgreSQL client
psql postgresql://postgres:[YOUR-PASSWORD]@db.wlzyfvywhpoahctwcpos.supabase.co:5432/postgres \
  -f supabase/migrations/20251027235900_create_user_profiles.sql
```

## Verify Migration

After running, verify the table exists:

```sql
SELECT * FROM user_profiles LIMIT 1;
```

You should see the table structure (even if empty).

## Next: Get Your Anon Key

1. Go to **Project Settings** → **API**
2. Copy the `anon` / `public` key
3. Update `.env` file:
   ```
   VITE_SUPABASE_ANON_KEY=your-actual-key-here
   ```
