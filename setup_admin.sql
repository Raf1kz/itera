-- Setup Admin User for Itera
-- Run this in Supabase Dashboard → SQL Editor

-- Step 1: Find your Clerk user ID
-- Method 1: From the app (sign in first, then open browser console):
--   console.log(await window.Clerk.user.id);
--
-- Method 2: From Clerk Dashboard → Users → Click on your user → Copy User ID
--   It will look like: user_2xxxxxxxxxxxxxxxxxxxxx

-- Step 2: Replace 'YOUR_CLERK_USER_ID_HERE' below with your actual user ID
-- Then run this script

INSERT INTO public.app_admins (user_id)
VALUES ('YOUR_CLERK_USER_ID_HERE')
ON CONFLICT (user_id) DO NOTHING;

-- Step 3: Verify admin was added
SELECT * FROM public.app_admins;

-- You should see your user_id in the results
-- Now you have full admin access to Notebook and Concept Graph!
