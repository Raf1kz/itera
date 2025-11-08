# Google Authentication Setup Guide

Your FlashStudy app now supports Google authentication! Follow these steps to configure it:

## Step 1: Configure Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure the OAuth consent screen if prompted:
   - Choose **External** user type
   - Add your app name: "FlashStudy"
   - Add your email as support email
   - Add authorized domains (for development: `localhost` and your Supabase domain)
6. Create OAuth Client ID:
   - Application type: **Web application**
   - Name: "FlashStudy Web"
   - Authorized JavaScript origins:
     - `http://localhost:5173` (for development)
     - Your production domain (when deployed)
   - Authorized redirect URIs:
     - `https://wlzyfvywhpoahctwcpos.supabase.co/auth/v1/callback`
     - (Replace with your actual Supabase project URL)
7. Click **Create** and copy your:
   - Client ID
   - Client Secret

## Step 2: Configure Supabase

1. Go to your [Supabase Dashboard](https://app.supabase.com/project/wlzyfvywhpoahctwcpos)
2. Navigate to **Authentication** → **Providers**
3. Find **Google** in the list and enable it
4. Enter your Google credentials:
   - **Client ID**: (from Step 1)
   - **Client Secret**: (from Step 1)
5. Copy the **Redirect URL** shown in Supabase
6. Make sure it matches what you added to Google Console in Step 1
7. Click **Save**

## Step 3: Test Google Sign-In

1. Make sure your dev server is running: `npm run dev`
2. Open http://localhost:5173/
3. Click "Sign in" or "Get started"
4. Click the **"Continue with Google"** button
5. You'll be redirected to Google's sign-in page
6. After signing in, you'll be redirected back to your app

## Features

✅ **One-click sign-in** - No need to remember passwords
✅ **Automatic profile creation** - User profile is created automatically
✅ **Secure OAuth flow** - Industry-standard authentication
✅ **Profile picture** - Google profile picture can be used
✅ **Email verification** - Google accounts are already verified

## Troubleshooting

### "redirect_uri_mismatch" error
- Make sure the redirect URI in Google Console exactly matches your Supabase callback URL
- Format: `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`

### Google button doesn't redirect
- Check browser console for errors
- Verify Google OAuth is enabled in Supabase dashboard
- Ensure Client ID and Secret are correctly entered in Supabase

### User profile not created
- The user_profiles table should have a trigger to auto-create profiles
- Check if the migration from `supabase/migrations/20251027235900_create_user_profiles.sql` was applied
- The trigger handles both email/password and OAuth sign-ups

## Code Implementation

The Google authentication is implemented in:

- **`src/contexts/AuthContext.tsx`** - `signInWithGoogle()` function
- **`src/components/AuthModal.tsx`** - "Continue with Google" button
- Uses Supabase's `signInWithOAuth()` method with Google provider

## Next Steps

Once Google OAuth is configured in Supabase, the authentication will work automatically. Users will be able to:
- Sign in with Google
- Have their profile auto-created
- Sync their flashcards across devices
- Access all features just like email/password users
