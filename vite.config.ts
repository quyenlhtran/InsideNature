import {defineConfig} from 'vite';
import {APP_HOST,APP_PORT} from './app.config.mjs';

export default defineConfig({
  server:{host:APP_HOST,port:APP_PORT},
  preview:{host:APP_HOST,port:APP_PORT},
});
