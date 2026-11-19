import {defineConfig} from 'vite';
import tailwind from '@tailwindcss/vite';
export default defineConfig({plugins:[tailwind()],server:{proxy:{'/socket.io':{target:'http://localhost:3001',ws:true}}},build:{outDir:'dist'}});
