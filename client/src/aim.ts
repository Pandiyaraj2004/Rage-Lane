/** Manual aim lasts only while a direction is held; otherwise follow travel. */
export function resolveAim(angle:number,speed:number,x:number,y:number,touchAim?:number){
 if(typeof touchAim==='number'&&Number.isFinite(touchAim))return touchAim;
 if(x||y)return Math.atan2(y,x);
 return angle+(speed < -10?Math.PI:0);
}
