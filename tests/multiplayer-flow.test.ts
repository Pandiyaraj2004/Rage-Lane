import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {io,type Socket} from 'socket.io-client';
import {idle,type State} from '../shared/game.js';

test('public matchmaking, private rooms, ready gates, combat, treasure and disconnects',{timeout:60000},async()=>{
 const server=spawn(process.execPath,['--import','tsx','server/index.ts'],{env:{...process.env,PORT:'3098',DATABASE_URL:''},stdio:'pipe'});
 const clients:Socket[]=[];const intervals:ReturnType<typeof setInterval>[]=[];
 const event=<T,>(s:Socket,name:string,predicate:(v:T)=>boolean=()=>true,timeout=10000)=>new Promise<T>((resolve,reject)=>{const timer=setTimeout(()=>{s.off(name,handler);reject(new Error('Timed out: '+name))},timeout);function handler(v:T){if(predicate(v)){clearTimeout(timer);s.off(name,handler);resolve(v)}}s.on(name,handler)});
 const join=(s:Socket,args:unknown)=>new Promise<any>(resolve=>s.emit('join',args,resolve));
 const connect=async()=>{const s=io('http://localhost:3098',{transports:['websocket'],forceNew:true});clients.push(s);await event(s,'connect');return s};
 try{
  await new Promise<void>((resolve,reject)=>{server.stdout.once('data',()=>resolve());server.once('error',reject);server.once('exit',c=>{if(c)reject(new Error('Server failed '+c))})});
  const a=await connect(),b=await connect();
  assert.ok((await join(a,null)).error);
  const publicRoom=await join(a,{name:'Alpha',match:true});
  assert.equal((await join(b,{name:'Bravo',match:true})).code,publicRoom.code);
  const privateClient=await connect(),privateRoom=await join(privateClient,{name:'Private'});
  assert.notEqual(privateRoom.code,publicRoom.code);
  const privateJoin=await connect();assert.equal((await join(privateJoin,{name:'Friend',code:privateRoom.code.toLowerCase()})).code,privateRoom.code);
  const newHost=event<any>(privateJoin,'lobby',v=>v.host===privateJoin.id&&v.players.length===1);privateClient.disconnect();await newHost;
  privateJoin.disconnect();
  const peers=[a,b];for(let i=2;i<8;i++){const s=await connect();peers.push(s);assert.equal((await join(s,{name:'Racer '+i,code:publicRoom.code})).code,publicRoom.code)}
  const extra=await connect();assert.ok((await join(extra,{name:'Overflow',code:publicRoom.code})).error);
  const hostOnly=event<string>(b,'room_error');b.emit('start');assert.match(await hostOnly,/host/);
  const notReady=event<string>(a,'room_error');a.emit('start');assert.match(await notReady,/ready/);
  const allReady=event<any>(a,'lobby',v=>v.players.length===8&&v.players.every((p:any)=>p.ready));peers.forEach(s=>s.emit('ready'));await allReady;
  const first=event<State>(a,'state');a.emit('start');const initial=await first;assert.equal(initial.players.length,8);assert.equal(initial.time,480);
  let latest=initial;const drive=(s:State)=>{latest=s;const p=s.players.find(p=>p.id===a.id)!;if(p.loot){a.emit('input',idle());return}const angle=Math.atan2(100-p.y,100-p.x),diff=Math.atan2(Math.sin(angle-p.angle),Math.cos(angle-p.angle));a.emit('input',{...idle(),up:Math.abs(diff)<.3,left:diff<-.06,right:diff>.06})};
  a.on('state',drive);const treasure=await event<State>(a,'state',s=>s.players.find(p=>p.id===a.id)!.loot===1);a.off('state',drive);a.emit('input',idle());
  assert.equal(treasure.items.find(i=>i.id===initial.items[0].id)!.active,false);assert.equal(treasure.players.find(p=>p.id===a.id)!.score,1000);
  // Bravo and Racer 2 share a clear horizontal road; actual server projectiles do the damage.
  const target=peers[2];const combat=event<State>(a,'state',s=>s.players.find(p=>p.id===b.id)!.kills===1);
  const fire=setInterval(()=>b.emit('input',{...idle(),fire:true,aim:0}),16);intervals.push(fire);
  const killed=await combat;clearInterval(fire);b.emit('input',idle());assert.ok(killed.players.find(p=>p.id===target.id)!.respawn>0);assert.equal(killed.players.find(p=>p.id===b.id)!.score,250);
  assert.ok((await join(extra,{code:publicRoom.code})).error);
  const hostId=b.id;const hostChange=event<any>(b,'lobby',v=>v.host===hostId&&v.players.length===7);const dropped=event<State>(b,'state',s=>!s.players.some(p=>p.id===a.id)&&s.items.some(i=>i.kind==='treasure'&&i.active&&i.id>initial.items.at(-1)!.id));a.disconnect();await hostChange;await dropped;
  assert.ok(latest.tick>=0);
  peers.slice(1).forEach(s=>s.disconnect());let gone=false;for(let retry=0;retry<30;retry++){const response=await join(extra,{code:publicRoom.code});if(response.error==='Room not found'){gone=true;break}await new Promise(r=>setTimeout(r,20))}assert.equal(gone,true);
 }finally{intervals.forEach(clearInterval);clients.forEach(s=>s.disconnect());server.kill()}
});
