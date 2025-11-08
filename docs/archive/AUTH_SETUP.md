# Authentication & User Profiles - Setup Guide

## 🎉 What's New

Your FlashStudy app now has complete authentication with:

1. **User Authentication** ✅
   - Email/password signup and login
   - Secure session management with Supabase Auth
   - Automatic profile creation on signup

2. **Cloud Data Sync** ✅
   - All flashcards stored in Supabase database
   - Automatic sync across devices
   - User-specific data isolation with RLS

3. **User Profiles** ✅
   - Personal statistics and progress tracking
   - Customizable preferences (daily goals, etc.)
   - Achievement system with badges
   - Study streaks and mastery metrics

## 🚀 Deployment Steps

### Step 1: Apply Database Migration

Run the new migration to create the `user_profiles` table:

```bash
# Make sure you're in the project directory
cd /Users/rafaelp/Documents/Apps/FlashStudy

# Apply the migration
# If using Supabase CLI:
supabase db push

# OR manually in Supabase Dashboard:
# 1. Go to SQL Editor in Supabase Dashboard
# 2. Open supabase/migrations/20251027235900_create_user_profiles.sql
# 3. Copy and run the SQL
```

### Step 2: Verify Supabase Email Settings

For authentication to work properly:

1. Go to **Supabase Dashboard** → **Authentication** → **Email Templates**
2. Make sure email templates are configured (or use development mode)
3. For production, configure SMTP settings or use Supabase's email service

**Development Mode:**
- Set `GOTRUE_MAILER_AUTOCONFIRM=true` for local testing (auto-confirms emails)

### Step 3: Test the Flow

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Test Anonymous Usage:**
   - Create some flashcards without logging in
   - They'll be saved to Supabase with `user_id = null`

3. **Test Signup:**
   - Click "S'inscrire" in the header
   - Create a new account with email/password
   - You should see a migration prompt offering to import your anonymous cards

4. **Test Login:**
   - Sign out and sign back in
   - Your cards should persist across sessions

5. **Test Profile:**
   - Click on your user menu in the header
   - View "Mon Profil" to see statistics
   - Edit your display name and daily goal

## 📁 New Files Created

```
src/
├── contexts/
│   └── AuthContext.tsx          # Authentication state management
├── components/
│   ├── AuthModal.tsx             # Login/Signup modal
│   └── UserProfile.tsx           # User profile page
└── utils/
    └── storage.ts                # Updated to use user_id

supabase/
└── migrations/
    └── 20251027235900_create_user_profiles.sql  # Profile table
```

## 🔐 Security Features

### Row Level Security (RLS)
All tables have RLS enabled with policies that:
- Anonymous users can only access data where `user_id IS NULL`
- Authenticated users can only access their own data (`user_id = auth.uid()`)

### Authentication Flow
1. User signs up → Profile auto-created via trigger
2. User logs in → Session stored securely
3. All data operations check `user_id` automatically

### Data Migration
When a user signs up after using the app anonymously:
- Prompt appears automatically
- One-click migration transfers all anonymous cards to the user account
- Old localStorage data is cleaned up

## 🎯 Features

### Authentication
- ✅ Email/password signup
- ✅ Email/password login
- ✅ Secure session management
- ✅ Automatic logout on session expiry
- ✅ Password requirements (min 6 characters)

### User Profile
- ✅ Display name customization
- ✅ Total cards counter
- ✅ Mastered cards counter
- ✅ Study streak tracking
- ✅ Daily goal setting
- ✅ Achievement badges
- ✅ Progress visualization

### Data Management
- ✅ Cloud sync for all cards
- ✅ FSRS state preservation
- ✅ Anonymous → Authenticated migration
- ✅ Import/Export still works
- ✅ Multi-device support

## 🔧 Configuration

### Environment Variables
Make sure your `.env` file has:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_FUNCTION_URL=https://your-project.functions.supabase.co
```

### Supabase Auth Settings

**For Development:**
1. Dashboard → Authentication → Settings
2. Enable "Confirm email" or set `GOTRUE_MAILER_AUTOCONFIRM=true`

**For Production:**
1. Configure SMTP settings
2. Customize email templates
3. Set up password policies
4. Enable rate limiting

## 🐛 Troubleshooting

### "Failed to load cards" error
- Check Supabase connection
- Verify RLS policies are applied
- Check browser console for detailed errors

### "User not authenticated" after login
- Check Supabase Auth settings
- Verify email confirmation is enabled/working
- Check that the migration was applied correctly

### Cards not syncing
- Verify `user_id` is being set correctly in storage.ts
- Check Supabase Dashboard → Table Editor → cards
- Look for entries with your user_id

### Migration prompt keeps appearing
- Check if anonymous cards exist: `SELECT * FROM cards WHERE user_id IS NULL`
- Manually delete them or click "Migrer" in the app

## 📊 Database Schema

### user_profiles
```sql
- id (uuid, FK to auth.users)
- email (text)
- display_name (text, nullable)
- total_cards (integer)
- total_reviews (integer)
- mastered_cards (integer)
- current_streak (integer)
- longest_streak (integer)
- preferences (jsonb)
```

### cards (updated)
```sql
- user_id (uuid, nullable) -- NEW: links to auth.users
-- All existing fields remain the same
```

### fsrs_data (updated)
```sql
- user_id (uuid, nullable) -- NEW: links to auth.users
-- All existing fields remain the same
```

## 🎨 UI/UX Changes

### Header
- Login/Signup buttons for anonymous users
- User menu with profile picture and dropdown
- "Mon Profil" link in user menu
- Logout option

### Navigation
- New "Profil" tab (only visible when logged in)
- User badge shows display name

### Modals
- Authentication modal with login/signup toggle
- Migration prompt for anonymous users
- Toast notifications for all auth actions

## 🚢 Next Steps (Optional Enhancements)

1. **OAuth Integration**
   - Add Google/GitHub login
   - Configure in Supabase Dashboard → Authentication → Providers

2. **Password Reset**
   - Add "Forgot Password" link
   - Use `supabase.auth.resetPasswordForEmail()`

3. **Email Verification**
   - Force email confirmation before login
   - Customize email templates

4. **User Statistics Dashboard**
   - Add charts for progress over time
   - Daily/weekly/monthly views
   - Study session history

5. **Social Features**
   - Share decks with other users
   - Public/private deck settings
   - Deck marketplace

## 📝 Testing Checklist

- [ ] Sign up with new account
- [ ] Receive confirmation email (or auto-confirm)
- [ ] Create flashcards as authenticated user
- [ ] Log out and log back in
- [ ] Verify cards persist
- [ ] Test profile page displays correctly
- [ ] Update display name and preferences
- [ ] Test anonymous usage → migration flow
- [ ] Verify RLS prevents accessing other users' data
- [ ] Test across multiple devices/browsers

## 🎓 User Guide

Share this with your users:

### Creating an Account
1. Click "S'inscrire" in the top right
2. Enter your email and password (min 6 characters)
3. Confirm your email (check inbox)
4. Start creating flashcards!

### Your Profile
- Access via the user menu (your name in top right)
- View your statistics and achievements
- Set your daily study goal
- Track your progress

### Cloud Sync
- All your cards are automatically saved to the cloud
- Access them from any device by logging in
- Your progress syncs in real-time

### Migrating Old Cards
- If you used the app before signing up
- You'll see a prompt to migrate your cards
- Click "Migrer" to transfer them to your account

Enjoy your upgraded StudyFlash with authentication! 🎉
