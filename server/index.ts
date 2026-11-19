import express from 'express';
import {createServer} from 'node:http';
import {randomBytes} from 'node:crypto';
import {Server} from 'socket.io';
import {Simulation,idle,matchMinutes,type Input} from '../shared/game.js';
import {initialize,save,leaders} from './persistence.js';
const app=express(),http=createServer(app);
const io=new Server(http,{cors:{origin:process.env.CLIENT_ORIGIN?.split(',')||true},maxHttpBufferSize:16384});
app.get('/health',(_,r)=>r.json({ok:true}));
app.get('/api/leaderboard',async(_,r)=>{try{r.json(await leaders())}catch{r.status(503).json({error:'History unavailable'})}});
app.use(express.static('dist'));
type Room={code:string;sim:Simulation;inputs:Record<string,Input>;lastInput:Record<string,number>;ready:Set<string>;started:boolean;host:string;public:boolean;minutes:number};
const rooms=new Map<string,Room>();
function lobby(r:Room){io.to(r.code).emit('lobby',{code:r.code,host:r.host,public:r.public,minutes:r.minutes,players:r.sim.state.players.filter(p=>!p.bot).map(p=>({id:p.id,name:p.name,ready:r.ready.has(p.id)}))})}
function cleanName(name:unknown){if(typeof name!=='string')return 'Guest';const n=name.replace(/[\p{C}]/gu,'').replace(/\s+/g,' ').trim().slice(0,18);return n||'Guest'}
io.on('connection',socket=>{
 let room:Room|undefined;
 socket.on('join',(raw:unknown,reply:unknown)=>{
  const ack=typeof reply==='function'?reply:()=>{};
  if(room)return ack({error:'Already in a room'});
  if(!raw||typeof raw!=='object')return ack({error:'Invalid room request'});
  const {code,name,match,minutes}=raw as {code?:unknown;name?:unknown;match?:unknown;minutes?:unknown};
  if(code!==undefined&&(typeof code!=='string'||!/^\s*[a-f0-9]{6}\s*$/i.test(code)))return ack({error:'Enter a six-character room code'});
  let r=typeof code==='string'?rooms.get(code.trim().toUpperCase()):undefined;
  if(code&&!r)return ack({error:'Room not found'});
  if(match===true&&!code)r=Array.from(rooms.values()).find(r=>r.public&&!r.started&&r.sim.state.players.length<8);
  if(r&&(r.started||r.sim.state.players.length>=8))return ack({error:'Room full or match in progress'});
  if(!r){let c:string;do{c=randomBytes(3).toString('hex').toUpperCase()}while(rooms.has(c));r={code:c,sim:new Simulation(),inputs:{},lastInput:{},ready:new Set(),started:false,host:socket.id,public:match===true,minutes:matchMinutes(minutes)};rooms.set(c,r)}
  room=r;r.sim.add(socket.id,cleanName(name));socket.join(r.code);ack({code:r.code,id:socket.id});lobby(r);
 });
 socket.on('ready',()=>{if(!room||room.started)return;room.ready.has(socket.id)?room.ready.delete(socket.id):room.ready.add(socket.id);lobby(room)});
 socket.on('minutes',(raw:unknown)=>{
  if(!room||room.started)return;
  if(room.host!==socket.id)return socket.emit('room_error','Only the host can change the match length');
  room.minutes=matchMinutes(raw);lobby(room);
 });
 socket.on('start',()=>{
  if(!room||room.started)return;
  if(room.host!==socket.id)return socket.emit('room_error','Only the host can start the match');
  if(room.ready.size!==room.sim.state.players.length)return socket.emit('room_error','Every player must be ready');
  room.started=true;room.sim.state.time=room.minutes*60;while(room.sim.state.players.length<4)room.sim.add(`bot${room.sim.state.players.length}`,'Rival '+room.sim.state.players.length,true);
  io.to(room.code).emit('started');io.to(room.code).emit('state',room.sim.state);
 });
 socket.on('input',(raw:Partial<Input>)=>{
  if(!room?.started||!raw||typeof raw!=='object')return;
  const a=idle();for(const k of ['up','down','left','right','drift','nitro','fire','enter'] as const)a[k]=raw[k]===true;
  a.aim=Number.isFinite(raw.aim)?Number(raw.aim):0;a.weapon=[0,1,2].includes(Number(raw.weapon))?Number(raw.weapon):0;
  room.inputs[socket.id]=a;room.lastInput[socket.id]=performance.now();
 });
 socket.on('disconnect',()=>{
  if(!room)return;
  room.sim.state.players=room.sim.state.players.filter(p=>{if(p.id!==socket.id)return true;for(let i=0;i<p.loot;i++)room!.sim.item('treasure',p.x,p.y);return false});
  room.ready.delete(socket.id);delete room.inputs[socket.id];delete room.lastInput[socket.id];
  if(!room.sim.state.players.some(p=>!p.bot)){rooms.delete(room.code);return}
  if(room.host===socket.id)room.host=room.sim.state.players.find(p=>!p.bot)!.id;
  lobby(room);
 });
});
// Real elapsed time, bounded catch-up: server and solo share a 60 Hz simulation.
let previous=performance.now(),accumulator=0;
setInterval(()=>{const now=performance.now();accumulator=Math.min(.25,accumulator+(now-previous)/1000);previous=now;
 while(accumulator>=1/60){accumulator-=1/60;for(const r of rooms.values()){
  if(!r.started||r.sim.state.ended)continue;
  for(const id in r.inputs)if(now-(r.lastInput[id]||0)>500)r.inputs[id]=idle();
  r.sim.step(1/60,r.inputs);
  if(r.sim.state.tick%2===0||r.sim.state.ended)io.to(r.code).emit('state',r.sim.state);
  if(r.sim.state.ended)void save(r.sim.state).catch(console.error);
 }}
},1000/60);
await initialize().catch(console.error);
http.listen(Number(process.env.PORT)||3001,'0.0.0.0',()=>console.log(`RAGE LANE server :${Number(process.env.PORT)||3001}`));
