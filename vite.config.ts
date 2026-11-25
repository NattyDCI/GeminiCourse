/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Local dev/preview proxy for Ravelry Personal API so users who provide their
 * Ravelry read-only keys can list their Ravelry library without CORS errors.
 */
function ravelryProxyPlugin(): Plugin {
  return {
    name: 'ravelry-api-proxy',
    configureServer(server) {
      server.middlewares.use('/api/ravelry/library', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        try {
          const chunks: Buffer[] = [];
          for await (const chunk of req) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          }
          const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') as {
            username?: string;
            accessKey?: string;
            personalKey?: string;
            query?: string;
            page?: number;
          };

          const username = (body.username || '').trim();
          const accessKey = (body.accessKey || '').trim();
          const personalKey = (body.personalKey || '').trim();

          if (!username || !accessKey || !personalKey) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                error: 'Se requieren usuario, Access Key y Personal Key de Ravelry.',
              })
            );
            return;
          }

          const params = new URLSearchParams({
            page_size: '30',
            page: String(body.page ?? 1),
            type: 'pattern',
          });
          if (body.query?.trim()) {
            params.set('query', body.query.trim());
          }

          const authHeader =
            'Basic ' + Buffer.from(`${accessKey}:${personalKey}`).toString('base64');
          const upstream = await fetch(
            `https://api.ravelry.com/people/${encodeURIComponent(username)}/library/search.json?${params.toString()}`,
            {
              headers: {
                Authorization: authHeader,
                Accept: 'application/json',
              },
            }
          );

          const text = await upstream.text();
          res.statusCode = upstream.status;
          res.setHeader('Content-Type', 'application/json');
          res.end(text);
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              error:
                err instanceof Error
                  ? err.message
                  : 'Error al consultar la API de Ravelry',
            })
          );
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), ravelryProxyPlugin()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
