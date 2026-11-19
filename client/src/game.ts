import {wantsFire} from './fire-input';
import {resolveAim} from './aim';
import Phaser from 'phaser';
import {Simulation,SIZE,TUNING,idle,type State,type Input} from '../../shared/game';
import {makeTextures,carTexture,runnerTexture,ITEM_COLORS} from './sprites';
import {paintTile,TILE,lamps,neonTrims} from './city-art';

export type Bridge={state:State;id:string;input:Input;solo:Simulation|null;map:boolean;muted:boolean;update:(s:State)=>void};

type Img=Phaser.GameObjects.Image;
type Emitter=Phaser.GameObjects.Particles.ParticleEmitter;
/** Everything drawn for one player. */
type Rig={shadow:Img;glow:Img;beam:Img;body:Img;wanted:Img;gem:Img;name:Phaser.GameObjects.Text|null};
/** A short-lived sprite effect (flash, shockwave, light burst). */
type Fx={img:Img;life:number;max:number;s0:number;s1:number;a0:number};
type Shot={img:Img;glow:Img|null;x:number;y:number;life:number;rocket:boolean;oil:boolean};
type Pickup={img:Img;aura:Img;ring:Img|null;x:number;y:number;kind:string;active:boolean};

const ADD=Phaser.BlendModes.ADD;
// Depth layers.
const D={city:-1,lights:.5,oil:.7,aura:1,item:1.5,shadow:1.8,beam:1.9,glow:1.95,car:2,shot:2.5,fx:3,label:4,aim:4.5};

export function mountGame(parent:HTMLElement,b:Bridge){
 class City extends Phaser.Scene{
  g!:Phaser.GameObjects.Graphics;keys:any;last=0;accumulator=0;
  tiles:{x:number;y:number;key:string;img:Img|null}[]=[];
  poses=new Map<string,{x:number;y:number}>();
  lastHp=250;audio:AudioContext|null=null;lastShot=0;keyboardFireUntil=0;
  frameCount=0;sampleStart=0;cpuTotal=0;zoom=1;
  rigs=new Map<string,Rig>();pickups=new Map<number,Pickup>();shots=new Map<number,Shot>();
  damageHistory=new Map<string,{carHp:number;hp:number}>();
  effects:Fx[]=[];
  sparks!:Emitter;twinkle!:Emitter;fire!:Emitter;smoke!:Emitter;nitro!:Emitter;
  marker!:Img;reticle!:Img;

  create(){
   makeTextures(this);
   // City tiles are painted once at load (~10ms each) and cached as textures.
   for(let y=0;y<SIZE;y+=TILE)for(let x=0;x<SIZE;x+=TILE){const t={x,y,key:`city-${x}-${y}`,img:null};this.paintTile(t);this.tiles.push(t)}
   // Static light pools: street lamps and neon trims glowing onto the ground.
   for(const l of lamps)this.add.image(l.x,l.y,'glow').setBlendMode(ADD).setTint(l.color).setAlpha(.22).setScale(1.7).setDepth(D.lights);
   for(const n of neonTrims)this.add.image(n.x,n.y,'glow').setBlendMode(ADD).setTint(n.color).setAlpha(.3).setScale(n.horizontal?2.6:.55,n.horizontal?.55:2.6).setDepth(D.lights);

   const particles=(key:string,cfg:Phaser.Types.GameObjects.Particles.ParticleEmitterConfig)=>this.add.particles(0,0,key,{emitting:false,...cfg}).setDepth(D.fx);
   this.sparks=particles('spark',{lifespan:{min:180,max:480},speed:{min:90,max:380},scale:{start:.9,end:0},alpha:{start:1,end:0},tint:[0xfff3b0,0xffc15a,0xff7b3d],blendMode:'ADD',maxAliveParticles:320});
   this.twinkle=particles('spark',{lifespan:{min:300,max:650},speed:{min:40,max:200},scale:{start:1,end:0},alpha:{start:1,end:0},blendMode:'ADD',maxAliveParticles:120});
   this.fire=particles('glow',{lifespan:{min:260,max:640},speed:{min:20,max:170},scale:{start:.55,end:0},alpha:{start:.95,end:0},tint:[0xffe39a,0xff9a3d,0xff4b2b],blendMode:'ADD',maxAliveParticles:220});
   this.smoke=particles('smoke',{lifespan:{min:700,max:1400},speed:{min:8,max:60},scale:{start:.35,end:1.4},alpha:{start:.5,end:0},tint:[0x2b313d,0x3a414f,0x1d222b],rotate:{min:0,max:360},maxAliveParticles:220});
   this.smoke.setDepth(D.fx-.1);
   this.nitro=particles('glow',{lifespan:{min:140,max:300},speed:{min:10,max:60},scale:{start:.32,end:0},alpha:{start:.9,end:0},tint:[0x7ff8ff,0x3d8bff,0xb46cff],blendMode:'ADD',maxAliveParticles:240});

   this.marker=this.add.image(0,0,'marker').setTint(0x65f5d0).setAlpha(.55).setScale(.62).setDepth(D.shadow+.05);
   this.reticle=this.add.image(0,0,'reticle').setTint(0xe6fff4).setAlpha(.85).setScale(.6).setDepth(D.aim);
   this.g=this.add.graphics().setDepth(D.aim);

   this.cameras.main.setBounds(0,0,SIZE,SIZE).setBackgroundColor('#0b111c');
   this.keys=this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT,SPACE,E,M,ONE,TWO,THREE,CTRL');
   this.input.mouse!.disableContextMenu();
   this.input.keyboard!.addCapture(['UP','DOWN','LEFT','RIGHT','SPACE','CTRL']);
   const blur=()=>{(window as any).rageTouch={};b.input={...idle(),weapon:b.input.weapon}};
   window.addEventListener('blur',blur);
   let cleaned=false;
   const cleanup=()=>{if(cleaned)return;cleaned=true;window.removeEventListener('blur',blur);void this.audio?.close().catch(()=>{});this.audio=null};
   this.events.once('shutdown',cleanup);this.events.once('destroy',cleanup);
   this.keys.CTRL.on('down',()=>this.keyboardFireUntil=performance.now()+100);
   this.input.keyboard!.on('keydown-M',()=>b.map=!b.map);
   this.input.keyboard!.on('keydown-ONE',()=>b.input.weapon=0);
   this.input.keyboard!.on('keydown-TWO',()=>b.input.weapon=1);
   this.input.keyboard!.on('keydown-THREE',()=>b.input.weapon=2);
  }

  paintTile(t:{x:number;y:number;key:string;img:Img|null}){
   const tex=this.textures.createCanvas(t.key,TILE,TILE)!;
   paintTile(tex.context,t.x,t.y);tex.refresh();
   t.img=this.add.image(t.x,t.y,t.key).setOrigin(0).setDepth(D.city);
  }

  // ------------------------------------------------------------ effects
  flash(x:number,y:number,key:string,tint:number,life:number,s0:number,s1:number,a0=1,blend=true){
   const img=this.add.image(x,y,key).setTint(tint).setScale(s0).setAlpha(a0).setDepth(D.fx+.2);
   if(blend)img.setBlendMode(ADD);
   this.effects.push({img,life,max:life,s0,s1,a0});
  }
  explode(x:number,y:number,big:boolean){
   this.flash(x,y,'glow',0xff8a3d,big?.55:.35,big?1.2:.7,big?3.4:2,.85);
   this.flash(x,y,'flare',0xfff0c0,.22,big?.5:.3,big?1.5:.9);
   this.flash(x,y,'ring',0xffc477,big?.5:.35,.15,big?1.6:.9,.9);
   this.sparks.explode(big?34:16,x,y);
   this.fire.explode(big?26:12,x,y);
   this.smoke.explode(big?14:6,x,y);
   const cam=this.cameras.main.worldView;
   if(Phaser.Geom.Rectangle.Contains(cam,x,y))this.cameras.main.shake(big?220:120,big?.006:.003);
   this.sound2(big?55:80,.18);
  }
  sound2(freq:number,dur:number){
   if(b.muted)return;
   try{this.audio||=new AudioContext();void this.audio.resume();const a=this.audio,o=a.createOscillator(),v=a.createGain();
    o.type='square';o.frequency.setValueAtTime(freq,a.currentTime);o.frequency.exponentialRampToValueAtTime(20,a.currentTime+dur);
    v.gain.setValueAtTime(.05,a.currentTime);v.gain.exponentialRampToValueAtTime(.001,a.currentTime+dur);
    o.connect(v);v.connect(a.destination);o.start();o.stop(a.currentTime+dur)}catch{}
  }

  rig(id:string,name:string,mine:boolean):Rig{
   let r=this.rigs.get(id);if(r)return r;
   r={
    shadow:this.add.image(0,0,'shadow').setDepth(D.shadow).setAlpha(.85),
    glow:this.add.image(0,0,'glow').setBlendMode(ADD).setDepth(D.glow),
    beam:this.add.image(0,0,'beam').setOrigin(0,.5).setBlendMode(ADD).setTint(0xdff8ff).setAlpha(.16).setDepth(D.beam),
    body:this.add.image(0,0,'car-'+ITEM_COLORS.car.toString(16)).setDepth(D.car),
    wanted:this.add.image(0,0,'ring').setTint(0xffca5d).setBlendMode(ADD).setDepth(D.glow).setVisible(false),
    gem:this.add.image(0,0,'item-treasure').setScale(.42).setDepth(D.label).setVisible(false),
    name:mine?null:this.add.text(0,0,name,{fontFamily:'Arial, sans-serif',fontSize:'11px',fontStyle:'bold',color:'#eaf6ff',stroke:'#05080d',strokeThickness:3}).setOrigin(.5,1).setDepth(D.label).setAlpha(.85),
   };
   this.rigs.set(id,r);return r;
  }
  dropRig(id:string){const r=this.rigs.get(id);if(!r)return;for(const o of [r.shadow,r.glow,r.beam,r.body,r.wanted,r.gem,r.name])o?.destroy();this.rigs.delete(id)}

  update(t:number,delta:number){
   const now=performance.now();
   if(!this.sampleStart)this.sampleStart=now;
   this.frameCount++;
   if(now-this.sampleStart>=2000){parent.dataset.fps=(this.frameCount*1000/(now-this.sampleStart)).toFixed(1);parent.dataset.updateMs=(this.cpuTotal/this.frameCount).toFixed(2);this.cpuTotal=0;parent.dataset.cachedCityTiles=String(this.tiles.filter(t=>t.img).length);this.frameCount=0;this.sampleStart=now}

   // ---------------------------------------------------------- input (unchanged gameplay)
   const k=this.keys,a=b.input;const touch=(window as any).rageTouch||{};
   a.up=k.UP.isDown;a.down=k.DOWN.isDown;a.left=k.LEFT.isDown;a.right=k.RIGHT.isDown;
   a.nitro=k.SHIFT.isDown||!!touch.nitro;a.drift=k.SPACE.isDown;a.enter=k.E.isDown||!!touch.enter;
   a.fire=k.CTRL.isDown||now<this.keyboardFireUntil||wantsFire(touch,now);
   const me=b.state.players.find(p=>p.id===b.id);
   if(me){
    if(touch.moving){const target=Math.atan2(touch.moveY,touch.moveX),diff=Math.atan2(Math.sin(target-me.angle),Math.cos(target-me.angle));a.up=Math.abs(diff)<1.4;a.left=diff<-.12;a.right=diff>.12}
    const ax=(k.A.isDown?1:0)-(k.D.isDown?1:0),ay=(k.S.isDown?1:0)-(k.W.isDown?1:0);
    a.aim=resolveAim(me.angle,me.speed,ax,ay,wantsFire(touch,now)?touch.aim:undefined);
   }
   if(b.solo){this.accumulator=Math.min(.2,this.accumulator+delta/1000);while(this.accumulator>=1/60){b.solo.step(1/60,{[b.id]:a});this.accumulator-=1/60}b.state=b.solo.state}
   if(t-this.last>120){b.update({...b.state});this.last=t}

   const g=this.g;g.clear();
   const cam=this.cameras.main,view=cam.worldView;
   const visible=(x:number,y:number,pad=100)=>x>=view.x-pad&&x<=view.right+pad&&y>=view.y-pad&&y<=view.bottom+pad;
   const pulse=Math.sin(t/260);

   // ---------------------------------------------------------- city tiles
   for(const tile of this.tiles)tile.img?.setVisible(tile.x<view.right&&tile.x+TILE>view.x&&tile.y<view.bottom&&tile.y+TILE>view.y);

   // ---------------------------------------------------------- pickups
   const seenItems=new Set<number>();
   for(const i of b.state.items){
    seenItems.add(i.id);
    let p=this.pickups.get(i.id);
    if(!p){
     const color=ITEM_COLORS[i.kind];
     p={img:this.add.image(i.x,i.y,i.kind==='car'?'car-'+ITEM_COLORS.car.toString(16):'item-'+i.kind).setDepth(D.item),
        aura:this.add.image(i.x,i.y,'glow').setBlendMode(ADD).setTint(color).setDepth(D.aura),
        ring:i.kind==='car'?null:this.add.image(i.x,i.y,'ring').setBlendMode(ADD).setTint(color).setDepth(D.aura),
        x:i.x,y:i.y,kind:i.kind,active:i.active};
     if(i.kind==='car')p.img.setScale(.5).setTint(0xb8c4d4);
     this.pickups.set(i.id,p);
    }
    if(p.active&&!i.active&&i.kind!=='car'&&visible(i.x,i.y))this.collect(p);
    p.active=i.active;p.x=i.x;p.y=i.y;
    const show=i.active&&visible(i.x,i.y,80);
    p.img.setVisible(show);p.aura.setVisible(show);p.ring?.setVisible(show);
    if(!show)continue;
    if(i.kind==='car'){
     p.img.setPosition(i.x,i.y).setAngle(0);
     p.aura.setPosition(i.x,i.y).setScale(.75,.45).setAlpha(.22+.1*pulse);
    }else{
     const treasure=i.kind==='treasure',bob=Math.sin(t/240+i.id)*3;
     p.img.setPosition(i.x,i.y+bob).setScale(treasure?.62+.04*pulse:.5).setAngle(treasure?0:Math.sin(t/500+i.id)*6);
     p.aura.setPosition(i.x,i.y).setScale(treasure?.95:.6).setAlpha((treasure?.5:.32)+.12*pulse);
     const ring=(t/(treasure?1300:1800)+i.id*.13)%1;
     p.ring!.setPosition(i.x,i.y).setScale(.25+ring*(treasure?.55:.35)).setAlpha((1-ring)*(treasure?.9:.5));
    }
   }
   for(const [id,p] of this.pickups)if(!seenItems.has(id)){
    if(p.active&&p.kind!=='car'&&visible(p.x,p.y))this.collect(p);
    p.img.destroy();p.aura.destroy();p.ring?.destroy();this.pickups.delete(id);
   }

   // ---------------------------------------------------------- projectiles
   const seenShots=new Set<number>();
   for(const q of b.state.bullets){
    seenShots.add(q.id);
    let s=this.shots.get(q.id);
    if(!s){
     const key=q.oil?'oil':q.rocket?'rocket':'bullet';
     s={img:this.add.image(q.x,q.y,key).setDepth(q.oil?D.oil:D.shot),glow:null,x:q.x,y:q.y,life:q.life,rocket:q.rocket,oil:q.oil};
     if(q.oil)s.img.setScale(.48).setAngle((q.id*47)%360);
     else if(q.rocket){s.img.setScale(.55);s.glow=this.add.image(q.x,q.y,'glow').setBlendMode(ADD).setTint(0xff8a3d).setScale(.45).setDepth(D.shot-.1)}
     else s.img.setScale(.55).setBlendMode(ADD);
     if(!q.oil&&visible(q.x,q.y)){
      const ang=Math.atan2(q.vy,q.vx);
      this.flash(q.x-Math.cos(ang)*8,q.y-Math.sin(ang)*8,'flare',q.rocket?0xffb06a:0xfff1b8,.07,q.rocket?.42:.26,q.rocket?.6:.36);
      if(q.rocket)this.smoke.explode(4,q.x,q.y);
     }
     this.shots.set(q.id,s);
    }
    s.x=q.x;s.y=q.y;s.life=q.life;
    const show=visible(q.x,q.y,40);
    s.img.setVisible(show);s.glow?.setVisible(show);
    if(!show)continue;
    s.img.setPosition(q.x,q.y);
    if(!q.oil){
     const ang=Math.atan2(q.vy,q.vx);s.img.setRotation(ang);
     if(q.rocket){
      s.glow!.setPosition(q.x-Math.cos(ang)*10,q.y-Math.sin(ang)*10).setAlpha(.7+.3*Math.random());
      if(this.frameCount%2===0){this.smoke.emitParticleAt(q.x-Math.cos(ang)*14,q.y-Math.sin(ang)*14,1);this.fire.emitParticleAt(q.x-Math.cos(ang)*12,q.y-Math.sin(ang)*12,1)}
     }
    }else s.img.setAlpha(Math.min(1,q.life*1.5));
   }
   for(const [id,s] of this.shots)if(!seenShots.has(id)){
    if(visible(s.x,s.y,60)){
     if(s.rocket)this.explode(s.x,s.y,false);
     else if(!s.oil&&s.life>.06){this.sparks.explode(5,s.x,s.y);this.flash(s.x,s.y,'glow',0xffd27a,.12,.18,.45,.8)}
    }
    s.img.destroy();s.glow?.destroy();this.shots.delete(id);
   }

   // ---------------------------------------------------------- players
   const seenPlayers=new Set<string>();
   for(const p of b.state.players){
    seenPlayers.add(p.id);
    const mine=p.id===b.id,r=this.rig(p.id,p.name,mine);
    const old=this.damageHistory.get(p.id);
    if(old&&visible(p.x,p.y)){
     if((old.carHp>0&&p.carHp<=0)||(old.hp>0&&p.hp<=0))this.explode(p.x,p.y,true);
     else if(p.carHp<old.carHp||p.hp<old.hp)this.sparks.explode(4,p.x,p.y);
    }
    this.damageHistory.set(p.id,{carHp:p.carHp,hp:p.hp});
    const parts=[r.shadow,r.glow,r.beam,r.body,r.wanted,r.gem,r.name];
    if(p.respawn>0){for(const o of parts)o?.setVisible(false);continue}

    let pos=this.poses.get(p.id)||{x:p.x,y:p.y};
    const blend=b.solo?1:1-Math.exp(-30*delta/1000);
    if(Math.hypot(pos.x-p.x,pos.y-p.y)>250)pos={x:p.x,y:p.y};else{pos.x+=(p.x-pos.x)*blend;pos.y+=(p.y-pos.y)*blend}
    this.poses.set(p.id,pos);
    const x=pos.x,y=pos.y;
    if(!mine&&!visible(x,y,200)){for(const o of parts)o?.setVisible(false);continue}

    const cos=Math.cos(p.angle),sin=Math.sin(p.angle);
    r.body.setTexture(p.car?carTexture(this,p.color):runnerTexture(this,p.color)).setPosition(x,y).setRotation(p.angle).setScale(.5).setVisible(true);
    r.shadow.setPosition(x+5,y+7).setRotation(p.angle).setScale(p.car?.5:.26,p.car?.62:.36).setVisible(true);
    r.glow.setPosition(x,y).setRotation(p.angle).setTint(p.color).setScale(p.car?.75:.4,p.car?.42:.4).setAlpha(p.car?.45:.25).setVisible(true);
    r.beam.setPosition(x+cos*24,y+sin*24).setRotation(p.angle).setScale(.85,.75).setVisible(p.car);
    const boosting=p.car&&Math.abs(p.speed)>TUNING.carSpeed+10;
    if(boosting&&visible(x,y))this.nitro.emitParticleAt(x-cos*27,y-sin*27,2);
    if(mine&&p.car&&b.input.drift&&Math.abs(p.speed)>120&&this.frameCount%3===0)
     for(const s of [-1,1])this.smoke.emitParticleAt(x-cos*18-sin*11*s,y-sin*18+cos*11*s,1);
    if(p.car&&p.carHp<45&&this.frameCount%5===0)this.smoke.emitParticleAt(x+cos*18,y+sin*18,1);
    r.wanted.setVisible(p.loot>0);r.gem.setVisible(p.loot>0);
    if(p.loot>0){
     const ring=(t%1200)/1200;
     r.wanted.setPosition(x,y).setScale(.62+ring*.25).setAlpha(.9-ring*.6);
     r.gem.setPosition(x,y-40+Math.sin(t/220)*3);
    }
    r.name?.setText(p.name).setPosition(x,y-(p.loot?58:30)).setVisible(true);

    if(mine){
     this.marker.setPosition(x,y).setRotation(p.angle).setVisible(true);
     const aim=b.input.aim;
     g.lineStyle(2,0xe6fff1,.35);
     for(let d=32;d<60;d+=9)g.lineBetween(x+Math.cos(aim)*d,y+Math.sin(aim)*d,x+Math.cos(aim)*(d+4),y+Math.sin(aim)*(d+4));
     this.reticle.setPosition(x+Math.cos(aim)*70,y+Math.sin(aim)*70).setRotation(t/900).setVisible(true);
     // Slight pull-back at speed; phones see a little more of the city.
     const base=Math.min(this.scale.width,this.scale.height)<520?.82:1;
     const targetZoom=base*(1-Math.min(.09,Math.abs(p.speed)/TUNING.nitroSpeed*.09));
     this.zoom+=(targetZoom-this.zoom)*Math.min(1,delta/250);
     cam.setZoom(this.zoom);cam.centerOn(x,y);
     if(p.carHp+p.hp<this.lastHp)cam.shake(90,.003);
     this.lastHp=p.carHp+p.hp;
    }
   }
   if(!me||me.respawn>0){this.marker.setVisible(false);this.reticle.setVisible(false)}
   for(const id of [...this.rigs.keys()])if(!seenPlayers.has(id))this.dropRig(id);

   // ---------------------------------------------------------- shot sound
   let newest;
   for(let i=b.state.bullets.length-1;i>=0;i--)if(b.state.bullets[i].owner===b.id){newest=b.state.bullets[i];break}
   if(newest&&newest.id>this.lastShot){
    this.lastShot=newest.id;
    if(!b.muted){try{this.audio||=new AudioContext();void this.audio.resume();const o=this.audio.createOscillator(),v=this.audio.createGain();o.type='sawtooth';o.frequency.setValueAtTime(newest.rocket?90:240,this.audio.currentTime);o.frequency.exponentialRampToValueAtTime(35,this.audio.currentTime+.09);v.gain.setValueAtTime(.035,this.audio.currentTime);v.gain.exponentialRampToValueAtTime(.001,this.audio.currentTime+.1);o.connect(v);v.connect(this.audio.destination);o.start();o.stop(this.audio.currentTime+.1)}catch{}}
   }

   // ---------------------------------------------------------- transient effects
   for(let i=this.effects.length-1;i>=0;i--){
    const e=this.effects[i];e.life-=delta/1000;
    if(e.life<=0){e.img.destroy();this.effects.splice(i,1);continue}
    const p=1-e.life/e.max;
    e.img.setScale(e.s0+(e.s1-e.s0)*p).setAlpha(e.a0*(1-p));
   }
   this.cpuTotal+=performance.now()-now;
  }

  collect(p:Pickup){
   const color=ITEM_COLORS[p.kind as keyof typeof ITEM_COLORS];
   this.flash(p.x,p.y,'ring',color,.4,.2,.9,.9);
   this.flash(p.x,p.y,'glow',color,.3,.4,1.3,.8);
   this.twinkle.setParticleTint(color);this.twinkle.explode(16,p.x,p.y);
  }
 }
 const game=new Phaser.Game({type:Phaser.AUTO,parent,backgroundColor:'#0b111c',scale:{mode:Phaser.Scale.RESIZE,width:parent.clientWidth,height:parent.clientHeight},scene:City,fps:{target:60,smoothStep:true},render:{antialias:true,powerPreference:'high-performance'},audio:{noAudio:true}});
 // Keep the canvas matched to its container (phone rotation, window resize).
 const ro=new ResizeObserver(()=>{if(parent.clientWidth&&parent.clientHeight)game.scale.resize(parent.clientWidth,parent.clientHeight)});
 ro.observe(parent);game.events.once('destroy',()=>ro.disconnect());
 // Development-only handle for inspecting the renderer from the console (stripped from production builds).
 if(import.meta.env.DEV)(window as any).__rageGame=game;
 return game;
}
