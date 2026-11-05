import { spawn } from 'node:child_process';
const children=[spawn(process.execPath,['server/index.mjs'],{stdio:'inherit'}),spawn(process.execPath,['node_modules/vite/bin/vite.js'],{stdio:'inherit'})];let stopping=false;
const stop=code=>{if(stopping)return;stopping=true;children.forEach(c=>c.kill());process.exitCode=code||0;};children.forEach(c=>{c.on('error',()=>stop(1));c.on('exit',stop);});process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
