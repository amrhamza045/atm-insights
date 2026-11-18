import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Speeds up both dev HMR and production/validation builds:
 * 1. Dev server: excludes backend (`base44/`), `dist/`, and test files from Chokidar polling
 *    and relaxes poll interval from 100ms to 350ms so background `stat()` syscalls don't starve CPU.
 * 2. Build: rewrites named icon imports directly to each icon's ESM module file
 *    using lucide-react's own export table, avoiding parsing ~1,400 unused icon modules.
 */
function buildAndWatchSpeedPlugin() {
  let lucideMap = null;

  function getLucideMap() {
    if (lucideMap) return lucideMap;
    lucideMap = new Map();
    try {
      const entry = path.resolve('node_modules/lucide-react/dist/esm/lucide-react.js');
      const dir = path.dirname(entry);
      const src = fs.readFileSync(entry, 'utf8');
      const lineRe = /^export\s+\{([^}]+)\}\s+from\s+'(\.\/icons\/[^']+)';/gm;
      let m;
      while ((m = lineRe.exec(src))) {
        const target = path.resolve(dir, m[2]).replace(/\\/g, '/');
        for (const part of m[1].split(',')) {
          const asMatch = part.trim().match(/^default\s+as\s+([A-Za-z0-9_]+)$/);
          if (asMatch) lucideMap.set(asMatch[1], target);
        }
      }
    } catch {
      lucideMap = new Map();
    }
    return lucideMap;
  }

  return [
    {
      name: 'app-watch-tuning',
      configResolved(resolved) {
        if (resolved.command === 'serve' && resolved.server?.watch) {
          const prevIgnored = resolved.server.watch.ignored;
          const extra = ['**/base44/**', '**/dist/**', '**/*.test.js', '**/*.test.jsx'];
          resolved.server.watch.ignored = Array.isArray(prevIgnored)
            ? [...prevIgnored, ...extra]
            : prevIgnored ? [prevIgnored, ...extra] : extra;
          if (resolved.server.watch.usePolling) {
            resolved.server.watch.interval = 350;
          }
        }
      },
    },
    {
      name: 'barrel-direct-imports',
      apply: 'build',
      enforce: 'pre',
      transform(code, id) {
        if (id.includes('node_modules')) return null;
        const hasLucide = code.includes('lucide-react');
        const hasDateFns = code.includes('date-fns');
        if (!hasLucide && !hasDateFns) return null;

        let next = code;
        let changed = false;

        if (hasLucide) {
          const map = getLucideMap();
          if (map.size) {
            next = next.replace(
              /import\s+\{([^}*]+)\}\s+from\s+['"]lucide-react['"]\s*;?/g,
              (full, specifiers) => {
                const lines = [];
                for (const raw of specifiers.split(',')) {
                  const s = raw.trim();
                  if (!s) continue;
                  const parts = s.split(/\s+as\s+/);
                  const imported = parts[0]?.trim();
                  const local = (parts[1] || parts[0])?.trim();
                  const target = map.get(imported);
                  if (!target || !local) return full;
                  lines.push(`import ${local} from "${target}";`);
                }
                if (!lines.length) return full;
                changed = true;
                return lines.join(' ');
              }
            );
          }
        }

        if (hasDateFns) {
          const dateFnsDir = path.resolve('node_modules/date-fns');
          next = next.replace(
            /import\s+\{([^}*]+)\}\s+from\s+['"]date-fns['"]\s*;?/g,
            (full, specifiers) => {
              const lines = [];
              for (const raw of specifiers.split(',')) {
                const s = raw.trim();
                if (!s) continue;
                const parts = s.split(/\s+as\s+/);
                const imported = parts[0]?.trim();
                const local = (parts[1] || parts[0])?.trim();
                if (!imported || !local) return full;
                const targetFile = path.join(dateFnsDir, `${imported}.mjs`);
                if (!fs.existsSync(targetFile)) return full;
                lines.push(`import { ${imported}${local !== imported ? ` as ${local}` : ''} } from "${targetFile.replace(/\\/g, '/')}";`);
              }
              if (!lines.length) return full;
              changed = true;
              return lines.join(' ');
            }
          );
        }

        return changed ? { code: next, map: null } : null;
      },
    },
  ];
}

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error', // Suppress warnings, only show errors
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    react(),
    ...buildAndWatchSpeedPlugin(),
  ],
  build: {
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        // Function-form manualChunks splits ONLY modules actually imported in the graph
        // (object-form forced full lodash + full date-fns + moment into the build as synthetic entries).
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-router') || id.includes('/scheduler/')) {
            return 'react-vendor';
          }
          if (id.includes('/@radix-ui/')) {
            return 'ui-vendor';
          }
          if (id.includes('/@tanstack/')) {
            return 'query-vendor';
          }
          if (id.includes('/framer-motion/') || id.includes('/motion-dom/') || id.includes('/motion-utils/')) {
            return 'motion-vendor';
          }
          return undefined;
        }
      }
    }
  }
});