export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

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
                from: 'DubNation Health Hub <health@dubnation.app>',
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
}
