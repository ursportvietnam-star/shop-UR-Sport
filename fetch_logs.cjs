const https = require('https');

https.get('https://api.github.com/repos/ursportvietnam-star/shop-UR-Sport/actions/runs?per_page=1', {
  headers: { 'User-Agent': 'Node.js' }
}, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const runs = JSON.parse(data).workflow_runs;
    const runId = runs[0].id;
    console.log('Run ID:', runId);
    
    https.get(`https://api.github.com/repos/ursportvietnam-star/shop-UR-Sport/actions/runs/${runId}/jobs`, {
      headers: { 'User-Agent': 'Node.js' }
    }, (res2) => {
      let data2 = '';
      res2.on('data', (chunk) => data2 += chunk);
      res2.on('end', () => {
        const jobs = JSON.parse(data2).jobs;
        console.log('Job ID:', jobs[0].id);
        
        https.get(`https://api.github.com/repos/ursportvietnam-star/shop-UR-Sport/actions/jobs/${jobs[0].id}/logs`, {
          headers: { 'User-Agent': 'Node.js' }
        }, (res3) => {
           if (res3.statusCode === 302) {
             const location = res3.headers.location;
             https.get(location, (res4) => {
               let logs = '';
               res4.on('data', chunk => logs += chunk);
               res4.on('end', () => {
                 const lines = logs.split('\n');
                 const errLines = lines.filter(l => l.toLowerCase().includes('error') || l.toLowerCase().includes('fail'));
                 console.log(errLines.slice(-30).join('\n'));
               });
             });
           }
        });
      });
    });
  });
}).on('error', (err) => console.error(err));
