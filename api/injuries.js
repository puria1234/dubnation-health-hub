import fetch from 'node-fetch';

// In-memory cache (will persist during the function's lifetime)
let injuryCache = {
    data: null,
    timestamp: null,
    CACHE_DURATION: 5 * 60 * 1000 // 5 minutes in milliseconds
};

export default async function handler(req, res) {
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
        
        const apiKey = process.env.SPORTRADAR_API_KEY?.trim();
        
        if (!apiKey) {
            throw new Error('SPORTRADAR_API_KEY not configured');
        }
        
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
}
