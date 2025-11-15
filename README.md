# 🏀 Golden State Warriors Injury Report Emailer

A sleek web app that fetches Golden State Warriors injury data from Sportradar and sends email reports via Resend.

## Features

- 🏀 Fetches real-time NBA injury data from Sportradar API
- 📧 Sends beautifully formatted email reports via Resend
- 🎯 Filters specifically for Golden State Warriors players
- 🔒 Secure backend with environment variables
- 💅 Modern, responsive UI with smooth animations

## Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment variables:**
Create a `.env` file in the root directory:
```
RESEND_API_KEY=your_resend_api_key_here
SPORTRADAR_API_KEY=your_sportradar_api_key_here
PORT=3000
```

3. **Start the server:**
```bash
npm start
```

4. **Open your browser:**
Navigate to `http://localhost:3000`

## Usage

1. Enter the recipient email address
2. Click "Fetch Warriors Injuries" to load current injury data
3. Review the injury report
4. Click "Send Email Report" to deliver via email

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- APIs: Sportradar (NBA data), Resend (email)
