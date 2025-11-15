# Deploying DubNation Health Hub to Vercel

## Quick Deploy

### Option 1: Deploy via Vercel CLI

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel
```

4. For production deployment:
```bash
vercel --prod
```

### Option 2: Deploy via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your Git repository (GitHub, GitLab, or Bitbucket)
4. Vercel will auto-detect the configuration from `vercel.json`
5. Add your environment variables (see below)
6. Click "Deploy"

## Environment Variables

You must add these environment variables in your Vercel project settings:

- `RESEND_API_KEY` - Your Resend API key for sending emails
- `SPORTRADAR_API_KEY` - Your Sportradar API key for NBA injury data
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key

### Adding Environment Variables in Vercel:

1. Go to your project in Vercel Dashboard
2. Click "Settings" tab
3. Click "Environment Variables" in the sidebar
4. Add each variable with its value
5. Select which environments (Production, Preview, Development)
6. Click "Save"

## Project Structure

```
dubnation-health-hub/
├── api/                    # Serverless functions
│   ├── injuries.js         # Fetch NBA injuries
│   ├── send-email.js       # Send emails via Resend
│   └── supabase-config.js  # Supabase configuration
├── index.html              # Main HTML file
├── style.css               # Styles
├── script.js               # Client-side JavaScript
├── vercel.json             # Vercel configuration
└── package.json            # Dependencies
```

## How It Works

- **Static Files**: `index.html`, `style.css`, `script.js` are served directly
- **API Routes**: Files in `/api/` folder become serverless functions
  - `/api/injuries` - Fetches NBA injury data with caching
  - `/api/send-email` - Sends emails via Resend API
  - `/api/supabase-config` - Returns Supabase configuration

## Local Development

To test locally before deploying:

```bash
# Install dependencies
npm install

# Run the original Express server
npm start

# Or use Vercel CLI to simulate Vercel environment
vercel dev
```

## Troubleshooting

### API Routes Not Working
- Make sure all environment variables are set in Vercel
- Check the function logs in Vercel Dashboard > Deployments > [Your Deployment] > Functions

### Build Errors
- Ensure `node-fetch` is in dependencies (required for Node.js fetch)
- Check that all files are properly formatted

### Environment Variables Missing
- Double-check that all 4 environment variables are set
- Make sure they're enabled for the correct environment (Production/Preview)

## Post-Deployment

After deployment, your app will be available at:
- Production: `https://your-project-name.vercel.app`
- Custom domain: Set up in Vercel project settings

## Notes

- The Express server (`server.js`) is no longer used in Vercel deployment
- Each API route is now a serverless function
- Static files are served from the root directory
- Caching works within each serverless function's lifecycle
