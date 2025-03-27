import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import postcssNesting from 'postcss-nesting'
import cssnanoPlugin from 'cssnano'
import { viteStaticCopy } from 'vite-plugin-static-copy'

const iconsPath = 'node_modules/@shoelace-style/shoelace/dist/assets/icons'

// https://vitejs.dev/config/
export default defineConfig({
    define: {
        global: 'globalThis'
    },
    plugins: [
        preact({
            devtoolsInProd: false,
            prefreshEnabled: true,
            babel: {
                sourceMaps: 'both'
            }
        }),
        viteStaticCopy({
            targets: [
                {
                    src: iconsPath,
                    dest: 'assets',
                },
            ],
        }),
    ],
    // https://github.com/vitejs/vite/issues/8644#issuecomment-1159308803
    esbuild: {
        logOverride: { 'this-is-undefined-in-esm': 'silent' }
    },
    publicDir: '_public',
    css: {
        postcss: {
            plugins: [
                postcssNesting,
                cssnanoPlugin
            ],
        },
    },
    server: {
        port: 8888,
        host: true,
        open: true,
        proxy: {
            '/api': {
                target: 'http://localhost:9999/.netlify/functions',
                rewrite: path => path.replace(/^\/api/, ''),
                changeOrigin: true,
            },
        },
    },
    build: {
        target: 'esnext',
        minify: false,
        outDir: './public',
        emptyOutDir: true,
        sourcemap: 'inline'
    }
})
