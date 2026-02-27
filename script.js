const API_BASE = 'https://your-worker.your-subdomain.workers.dev';

async function broadcast() {
    const data = {
        token: document.getElementById('botToken').value,
        message: document.getElementById('message').value,
        users: await parseUserFile(),
        proxies: document.getElementById('useProxies').checked,
        schedule: document.getElementById('schedule').checked ? document.getElementById('scheduleTime').value : null
    };

    const logs = document.getElementById('logs');
    logs.textContent += `[${new Date().toISOString()}] Starting broadcast...\n`;

    try {
        const response = await fetch(`${API_BASE}/broadcast`, {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        logs.textContent += JSON.stringify(result, null, 2) + '\n';
        fetchStats();
    } catch(e) {
        logs.textContent += `Error: ${e.message}\n`;
    }
}

async function parseUserFile() {
    const fileInput = document.getElementById('userList');
    if (!fileInput.files[0]) return [];
    
    const file = fileInput.files[0];
    const text = await file.text();
    
    if (file.name.endsWith('.csv')) {
        return text.split('\n').map(line => line.split(',')[0].trim()).filter(id => id);
    } else {
        return JSON.parse(text);
    }
}

async function fetchStats() {
    try {
        const response = await fetch(`${API_BASE}/stats`);
        const stats = await response.json();
        document.getElementById('stats').innerHTML = `
            Sent: ${stats.sent} | Failed: ${stats.failed} | Success: ${(stats.successRate || 0).toFixed(1)}%<br>
            Active: ${stats.active} | Proxies: ${stats.proxies?.length || 0}
        `;
    } catch(e) {
        document.getElementById('stats').textContent = 'Stats unavailable';
    }
}

// Auto-refresh stats
setInterval(fetchStats, 5000);
fetchStats();
