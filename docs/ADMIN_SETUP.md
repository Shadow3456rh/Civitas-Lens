# Civitas Lens — Admin Account Promotion & Auth Setup

This guide documents how to create an account and promote it to **Admin** or **Analyst** via the Supabase SQL Editor.

---

## 1. Create Your Account

1. Open the application and visit `/login`.
2. Toggle to the **Create Account** tab.
3. Enter your email and password (minimum 6 characters), then click **Create Account**.
4. The database trigger automatically creates a row in `public.profiles` with the default role `'citizen'`.

---

## 2. Promote Your Account to Admin via SQL

Open your [Supabase Dashboard](https://supabase.com/dashboard) and navigate to the **SQL Editor**. Paste and run either of the commands below:

### Option A: Direct SQL Update (Recommended)

Replace `'your-email@example.com'` with the email address you registered:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE id = (
  SELECT id 
  FROM auth.users 
  WHERE email = 'your-email@example.com'
);
```

### Option B: Using the Migration 00011 Helper Function

```sql
SELECT public.promote_user_to_role('your-email@example.com', 'admin');
```

> **Tip**: To promote a user to an **Analyst** instead of an Admin, replace `'admin'` with `'analyst'`:
> ```sql
> SELECT public.promote_user_to_role('your-email@example.com', 'analyst');
> ```

---

## 3. Verify the Role Promotion

Run this query in the Supabase SQL Editor to verify the assigned role:

```sql
SELECT 
  u.id,
  u.email,
  p.role,
  p.created_at
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'your-email@example.com';
```

---

## 4. Sign In and Access the Dashboard

1. Return to `http://localhost:3000/login` (or your production URL).
2. Enter your email and password.
3. Once authenticated:
   - Your role badge (**ADMIN** in red/rose or **ANALYST** in indigo) will appear in the top bar.
   - You can now access the protected `/dashboard` and `/dashboard/incidents/[id]` routes.

---

## 5. Security & Role Permissions Overview

| Role | Access Permissions |
| :--- | :--- |
| **Anonymous (Unauthenticated)** | Can view `/` and submit photo/text observations at `/report` and check status at `/report/submitted/:id`. Cannot access `/dashboard`. |
| **Citizen (Default Signup)** | Can submit observations and view their own contributions. If they attempt to open `/dashboard`, the Next.js middleware redirects them with an access restriction notice. |
| **Analyst** | Authorized to access `/dashboard`, view full incident clusters and maps, inspect private evidence photos via signed URLs, review AI explainability metrics, change incident statuses, and detach false merges. |
| **Admin** | Full system and analyst access + administrative permissions. |
