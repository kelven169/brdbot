// Deploy: wrangler deploy (free unlimited)

const TELEGRAM_API = 'https://api.telegram.org/bot';
let stats = { sent:0, failed:0, active:0, proxies:[] };
let broadcastQueue = [];

// Fetch free proxies on init
addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
    const url = new URL(request.url);
    
    if (url.pathname === '/broadcast' && request.method === 'POST') {
        const data = await request.json();
        return handleBroadcast(data);
    }
    
    if (url.pathname === '/stats') {
        return new Response(JSON.stringify(stats), {headers:{'Content-Type':'application/json'}});
    }
    
    return new Response('TBroadcaster API Ready', {status:200});
}

async function handleBroadcast(data) {
    const {token, message, users, proxies:useProxies, schedule} = data;
    
    if (schedule) {
        // Queue for scheduled broadcast
        broadcastQueue.push({token, message, users, useProxies, time: new Date(schedule)});
        return new Response(JSON.stringify({status:'scheduled', id:broadcastQueue.length}), {
            headers:{'Content-Type':'application/json'}
        });
    }
    
    // Immediate broadcast
    stats.active = users.length;
    const results = await Promise.allSettled(
        users.map(async (chatId, i) => {
            await new Promise(r => setTimeout(r, Math.random()*2000+500)); // Random delay evasion
            
            const proxy = useProxies ? getRandomProxy() : null;
            const response = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({
                    chat_id: chatId,
                    text: message,
                    parse_mode: 'HTML',
                    disable_web_page_preview: true
                })
            });
            
            const result = await response.json();
            if (result.ok) {
                stats.sent++;
                stats.successRate = (stats.sent / stats.active) * 100;
            } else {
                stats.failed++;
            }
            return result;
        })
    );
    
    return new Response(JSON.stringify({
        status: 'completed',
        results: results.map(r => r.status === 'fulfilled' ? r.value : r.reason),
        stats
    }), {headers:{'Content-Type':'application/json'}});
}

function getRandomProxy() {
    // Load from KV or fetch free proxies
    const proxies = [
        'socks5://proxy.example:1080', // Add your proxies.txt content
        // Fetches fresh from free-proxy-list.net API in prod
    ];
    return proxies[Math.floor(Math.random() * proxies.length)];
}

// Cron: Check scheduled broadcasts (Cloudflare Cron Triggers)
addEventListener('scheduled', event => {
    event.waitUntil(processQueue());
});

async function processQueue() {
    const now = Date.now();
    broadcastQueue = broadcastQueue.filter(job => {
        if (job.time < now) {
            handleBroadcast(job);
            return false;
        }
        return true;
    });
}
