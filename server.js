import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Cache for injury data
let injuryCache = {
    data: null,
    timestamp: null,
    CACHE_DURATION: 5 * 60 * 1000 // 5 minutes in milliseconds
};

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Supabase config endpoint
app.get('/api/supabase-config', (req, res) => {
    res.json({
        url: process.env.SUPABASE_URL,
        anonKey: process.env.SUPABASE_ANON_KEY
    });
});

// Fetch NBA injuries with caching
app.get('/api/injuries', async (req, res) => {
    try {
        const now = Date.now();
        
        // Check if cache is valid
        if (injuryCache.data && injuryCache.timestamp && (now - injuryCache.timestamp < injuryCache.CACHE_DURATION)) {
            const cacheAge = Math.floor((now - injuryCache.timestamp) / 1000 / 60);
            console.log(`✅ Serving cached data (${cacheAge} minutes old)`);
            return res.json({
                ...injuryCache.data,
                cached: true,
                cacheAge: `${cacheAge} minutes ago`
            });
        }
        
        // Cache expired or doesn't exist, fetch fresh data
        console.log('🔄 Cache expired or empty, fetching fresh data from Sportradar...');
        
        const apiKey = process.env.SPORTRADAR_API_KEY.trim();
        const url = `https://api.sportradar.com/nba/trial/v5/en/league/injuries.json?api_key=${apiKey}`;
        
        console.log('Fetching from:', url.replace(apiKey, 'API_KEY_HIDDEN'));
        
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Response:', response.status, errorText);
            
            // If we have cached data, return it even if expired
            if (injuryCache.data) {
                console.log('⚠️ API error, returning stale cache');
                return res.json({
                    ...injuryCache.data,
                    cached: true,
                    stale: true
                });
            }
            
            throw new Error(`Sportradar API error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Teams found:', data.teams?.length || 0);
        
        // Filter for Golden State Warriors
        const warriors = data.teams?.find(team => 
            team.name === 'Warriors' || team.market === 'Golden State'
        );
        
        console.log('Warriors found:', warriors ? 'Yes' : 'No');
        
        const responseData = {
            success: true,
            team: warriors || null,
            allTeams: data.teams || [],
            cached: false
        };
        
        // Update cache
        injuryCache.data = responseData;
        injuryCache.timestamp = now;
        console.log('💾 Data cached for 5 minutes');
        
        res.json(responseData);
    } catch (error) {
        console.error('Error fetching injuries:', error);
        
        // Return cached data if available
        if (injuryCache.data) {
            console.log('⚠️ Error occurred, returning cached data');
            return res.json({
                ...injuryCache.data,
                cached: true,
                stale: true
            });
        }
        
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Send email via Resend
app.post('/api/send-email', async (req, res) => {
    try {
        const { toEmail, subject, htmlContent } = req.body;
        const resendKey = process.env.RESEND_API_KEY;
        
        if (!resendKey) {
            throw new Error('Resend API key not configured');
        }
        
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${resendKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 'onboarding@resend.dev',
                to: toEmail,
                subject: subject,
                html: htmlContent
            })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'Failed to send email');
        }
        
        res.json({
            success: true,
            emailId: result.id
        });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
