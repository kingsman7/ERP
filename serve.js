const express = require('express');
const http = require('http');
const path = require('path');

const app = express();
const PORT = parseInt(process.env.PORT || '80', 10);
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const DIST_DIR = path.join(__dirname, 'dist', 'app', 'browser');

// 1. Proxy transparente de /api hacia el Backend NestJS (puerto 3000)
app.use('/api', (req, res) => {
  const backendParsed = new URL(BACKEND_URL);
  
  const headers = { ...req.headers };
  headers.host = backendParsed.host;
  headers['x-forwarded-host'] = req.headers.host || '';
  headers['x-forwarded-proto'] = req.protocol;

  const options = {
    hostname: backendParsed.hostname,
    port: backendParsed.port || 3000,
    path: req.originalUrl,
    method: req.method,
    headers: headers,
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error('Error al conectar con backend:', err.message);
    if (!res.headersSent) {
      res.status(502).json({
        statusCode: 502,
        message: 'Backend no disponible',
        error: err.message,
      });
    }
  });

  req.pipe(proxyReq, { end: true });
});

// 2. Servir archivos estáticos del frontend de Angular
app.use(express.static(DIST_DIR, {
  maxAge: '1d',
  index: 'index.html',
}));

// 3. Fallback para rutas de Angular SPA (Express 5 compatible)
app.use((req, res) => {
  res.sendFile(path.join(DIST_DIR, 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 Frontend ERP activo con PM2 en puerto: ${PORT}`);
  console.log(`🌐 URL Local: http://localhost:${PORT}`);
  console.log(`🌐 Dominio: http://devhelameb.local${PORT === 80 ? '' : ':' + PORT}`);
  console.log(`🔗 Proxy /api redirigiendo a: ${BACKEND_URL}/api`);
  console.log(`=========================================`);
});
