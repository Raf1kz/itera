# QA Testing Guide - FlashStudy

## Pre-Testing Setup

### 1. Set Up Admin Account

1. Sign up/login to the app at http://localhost:5174/
2. Note your email address
3. Go to Supabase Dashboard → SQL Editor
4. Open [set_admin.sql](set_admin.sql) and replace `your-email@example.com` with your actual email
5. Run the SQL script
6. Verify you now have admin role

### 2. Clear Test Data (Optional)

If you want to start fresh:
1. Go to Supabase Dashboard → SQL Editor
2. Run [clear_test_data.sql](clear_test_data.sql)
3. Confirm all test data is cleared

### 3. Verify Environment

Check your [.env](.env) file contains:
- ✅ `VITE_CLERK_PUBLISHABLE_KEY` (fixed typo)
- ✅ `VITE_SUPABASE_URL`
- ✅ `VITE_SUPABASE_ANON_KEY`
- ✅ `VITE_SUPABASE_FUNCTION_URL`
- ✅ `OPENAI_API_KEY`

---

## Test Plan

### Phase 1: Flashcard Generation Feature ✨

**Test Case 1.1: Basic Generation**
- [ ] Navigate to Generate view
- [ ] Enter Title: "Biology Chapter 1"
- [ ] Enter Subject: "Biology"
- [ ] Enter Notes (use sample below)
- [ ] Click "Generate Flashcards & Summary"
- [ ] Wait for generation to complete
- [ ] **Expected**: See generated flashcards with questions and answers
- [ ] **Expected**: See a summary of the content
- [ ] **Expected**: No mock data (e.g., "What is the main concept?")

**Sample Notes for Testing:**
```
Photosynthesis is the process by which plants convert light energy into chemical energy.
The process occurs in chloroplasts and requires carbon dioxide, water, and sunlight.
The products of photosynthesis are glucose and oxygen.
Chlorophyll is the green pigment that captures light energy.
There are two main stages: light-dependent reactions and the Calvin cycle.
```

**Test Case 1.2: Empty Input Validation**
- [ ] Try to generate without entering Title
- [ ] **Expected**: Button is disabled
- [ ] Try to generate without entering Subject
- [ ] **Expected**: Button is disabled
- [ ] Try to generate without entering Notes
- [ ] **Expected**: Button is disabled

**Test Case 1.3: Error Handling**
- [ ] Temporarily disconnect internet
- [ ] Try to generate flashcards
- [ ] **Expected**: See error message in red box
- [ ] **Expected**: Error message is user-friendly

**Test Case 1.4: Large Input**
- [ ] Paste a very long text (3000+ words)
- [ ] Click generate
- [ ] **Expected**: Generation completes successfully
- [ ] **Expected**: Multiple flashcards generated (up to 80)
- [ ] **Expected**: No timeout errors

**Test Case 1.5: Different Card Types**
- [ ] Generate flashcards from different types of content:
  - [ ] Definitions (e.g., biology terms)
  - [ ] Formulas (e.g., physics equations)
  - [ ] Concepts (e.g., historical events)
  - [ ] Procedures (e.g., lab instructions)
- [ ] **Expected**: AI generates appropriate card types for each

---

### Phase 2: Review & Save Workflow

**Test Case 2.1: Review Generated Cards**
- [ ] After generation, review the flashcards
- [ ] **Expected**: Can see both question and answer for each card
- [ ] **Expected**: Can edit cards if needed
- [ ] **Expected**: Can delete unwanted cards

**Test Case 2.2: Save to Study Deck**
- [ ] Click "Save" or similar button
- [ ] **Expected**: Cards are saved to your deck
- [ ] **Expected**: Success toast message appears
- [ ] **Expected**: Confetti animation plays
- [ ] Navigate to Study view
- [ ] **Expected**: See the newly created cards

---

### Phase 3: Study Session with FSRS

**Test Case 3.1: Start Study Session**
- [ ] Navigate to Study view
- [ ] **Expected**: See cards ready for review
- [ ] Start studying
- [ ] **Expected**: Cards appear one at a time
- [ ] **Expected**: Can reveal answer

**Test Case 3.2: FSRS Scheduling**
- [ ] Rate a card as "Again" (1)
- [ ] **Expected**: Card scheduled for sooner review
- [ ] Rate a card as "Easy" (4)
- [ ] **Expected**: Card scheduled for later review
- [ ] Complete 5-10 reviews
- [ ] Check that card due dates are different based on ratings

**Test Case 3.3: Progress Tracking**
- [ ] Complete a study session
- [ ] **Expected**: See updated statistics
  - Total reviews count increased
  - Streak updated if studying daily
  - Mastery levels updated

---

### Phase 4: Database & Persistence

**Test Case 4.1: Data Persistence**
- [ ] Create some flashcards
- [ ] Study a few cards
- [ ] Close the browser tab
- [ ] Reopen the app
- [ ] **Expected**: All cards and progress retained
- [ ] **Expected**: FSRS scheduling data preserved

**Test Case 4.2: User Isolation**
- [ ] Create cards as your user
- [ ] Logout
- [ ] Login as different user (or test in incognito)
- [ ] **Expected**: Don't see other user's cards
- [ ] **Expected**: Each user has their own deck

**Test Case 4.3: Admin Features**
- [ ] As admin, verify you can view your own data
- [ ] Check that admin role doesn't expose other users' private data
- [ ] **Expected**: Admin sees only their own cards (RLS still enforced)

---

### Phase 5: Edge Cases & Error Handling

**Test Case 5.1: Special Characters**
- [ ] Generate flashcards with special characters:
  - Mathematical symbols (∑, ∫, √)
  - Accented characters (é, à, ñ)
  - Emojis 🧪
- [ ] **Expected**: All characters preserved correctly

**Test Case 5.2: Very Short Input**
- [ ] Try to generate with only 1-2 sentences
- [ ] **Expected**: Either generates cards or shows helpful message

**Test Case 5.3: Non-English Content**
- [ ] Generate flashcards in French/Spanish
- [ ] **Expected**: Works correctly in other languages

**Test Case 5.4: Rate Limiting**
- [ ] Generate flashcards 5+ times rapidly
- [ ] **Expected**: Either succeeds or shows appropriate rate limit message
- [ ] **Expected**: No crashes or undefined errors

---

### Phase 6: AI Features (If Implemented)

**Test Case 6.1: AI Companion**
- [ ] Study some cards with mixed ratings
- [ ] Access AI Companion feature
- [ ] **Expected**: Get personalized recommendations
- [ ] **Expected**: See weakest cards highlighted

**Test Case 6.2: Reflection Mode**
- [ ] Complete a study session
- [ ] Access Reflection Mode
- [ ] **Expected**: See summary of session performance
- [ ] **Expected**: Get insights on strengths/weaknesses

---

## Performance Checks

### Response Times
- [ ] Flashcard generation: < 15 seconds for 1000 words
- [ ] Page navigation: < 500ms
- [ ] Card reveal animation: smooth, no lag

### UI/UX
- [ ] All buttons are clickable and responsive
- [ ] Loading states show clearly during API calls
- [ ] Error messages are user-friendly, not technical
- [ ] No console errors in browser DevTools
- [ ] Mobile responsive (test on phone or resize browser)

---

## Critical Issues to Watch For

🚨 **BLOCKERS** - Must be fixed before launch:
- Mock generation data appears (e.g., "What is the main concept?")
- Cards not saving to database
- FSRS scheduling not working
- User data visible to other users
- App crashes on generation

⚠️ **HIGH PRIORITY** - Should be fixed soon:
- Slow generation times (>20 seconds)
- Poor error messages
- UI/UX issues
- Missing validation

ℹ️ **MEDIUM PRIORITY** - Can be addressed later:
- Minor visual glitches
- Edge case handling
- Performance optimizations

---

## Reporting Issues

When you find a bug, please note:
1. **What you did** (steps to reproduce)
2. **What you expected** to happen
3. **What actually happened**
4. **Browser console errors** (F12 → Console tab)
5. **Screenshots** if applicable

---

## Success Criteria

✅ **Ready for Use** when:
- All Phase 1 (Generation) tests pass
- All Phase 2 (Review) tests pass
- All Phase 3 (Study) tests pass
- No mock/boilerplate data appears
- Admin account is working
- Database persistence is reliable
- No critical bugs found

---

## Quick Smoke Test (5 minutes)

If you want a quick sanity check:
1. ✅ Login works
2. ✅ Generate flashcards from sample text
3. ✅ Review and save cards
4. ✅ Study session works
5. ✅ FSRS scheduling updates
6. ✅ No console errors

If all 6 pass → **App is functional** ✨
