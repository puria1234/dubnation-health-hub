# Supabase Authentication Setup Guide

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in:
   - Project name: `warriors-injury-report`
   - Database password: (generate a strong password)
   - Region: Choose closest to you
4. Click "Create new project" and wait for setup to complete

## 2. Get Your Supabase Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

## 3. Configure Your .env File

Add these to your `.env` file:

```env
SUPABASE_URL=your_project_url_here
SUPABASE_ANON_KEY=your_anon_key_here
```

## 4. Configure Email Authentication

1. In Supabase dashboard, go to **Authentication** → **Providers**
2. Make sure **Email** is enabled
3. Configure email templates (optional):
   - Go to **Authentication** → **Email Templates**
   - Customize confirmation and password reset emails

## 5. Email Settings (Optional but Recommended)

By default, Supabase uses their email service. For production:

1. Go to **Settings** → **Auth**
2. Scroll to **SMTP Settings**
3. Configure your own SMTP provider (SendGrid, AWS SES, etc.)

## 6. Test Your Setup

1. Start your server: `npm start`
2. Open `http://localhost:3000`
3. Try signing up with a test email
4. Check your email for verification link
5. After verification, log in and test sending injury reports

## Features

- **Secure Authentication**: Users must log in to access the app
- **Auto Email**: Injury reports are sent to the logged-in user's email
- **Session Persistence**: Users stay logged in across page refreshes
- **Email Verification**: New accounts require email verification
- **Auto-refresh**: Injury data updates every 30 seconds while logged in

## Security Notes

- Never commit your `.env` file
- The anon key is safe to use in the browser (it's public)
- Supabase handles all security with Row Level Security (RLS)
- User passwords are securely hashed by Supabase

## Troubleshooting

**"Email not confirmed"**: Check your spam folder for the verification email

**"Invalid API key"**: Make sure you copied the anon key, not the service_role key

**CORS errors**: Make sure your Supabase project allows your domain in Auth settings
