// Proxy CSV uploads to FastAPI backend.
// Disables Next.js body parser to handle large files (up to 90MB).
// Uses Node http module — no external deps needed.

import http from 'http';

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

function collectBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ detail: 'Method not allowed' });
  }

  try {
    const body = await collectBody(req);
    const contentType = req.headers['content-type'] || '';

    const proxyReq = http.request(
      {
        hostname: '127.0.0.1',
        port: 8000,
        path: '/upload',
        method: 'POST',
        headers: {
          'content-type': contentType,
          'content-length': body.length,
        },
      },
      (proxyRes) => {
        let data = '';
        proxyRes.on('data', (chunk) => { data += chunk; });
        proxyRes.on('end', () => {
          try {
            const json = JSON.parse(data);
            res.status(proxyRes.statusCode).json(json);
          } catch {
            res.status(proxyRes.statusCode).send(data);
          }
        });
      }
    );

    proxyReq.on('error', (err) => {
      console.error('Upload proxy error:', err.message);
      res.status(502).json({ detail: 'Backend unreachable: ' + err.message });
    });

    proxyReq.write(body);
    proxyReq.end();
  } catch (err) {
    console.error('Upload handler error:', err);
    res.status(500).json({ detail: 'Upload proxy failed: ' + err.message });
  }
}
