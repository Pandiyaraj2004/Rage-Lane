import {defineConfig} from 'vite';
import tailwind from '@tailwindcss/vite';
export default defineConfig({plugins:[tailwind()],server:{proxy:{'/socket.io':{target:`http://localhost:${process.env.PORT||3001}`,ws:true}}},build:{outDir:'dist'}});
