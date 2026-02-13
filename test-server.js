const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <!DOCTYPE html>
    <html>
      <head><title>Test Server</title></head>
      <body>
        <h1>✅ SUCCESS!</h1>
        <p>Server is working on port 9000</p>
        <p>Time: ${new Date().toISOString()}</p>
      </body>
    </html>
  `);
});

server.listen(9000, '0.0.0.0', () => {
  console.log('Test server running on http://0.0.0.0:9000');
});
