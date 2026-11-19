export type FireInput={fire?:boolean;fireUntil?:number;aim?:number};
/** Keep a quick tap alive long enough to reach a simulation/network tick. */
export function pressFire(s:FireInput,now:number){s.fire=true;s.fireUntil=now+100}
export function wantsFire(s:FireInput,now:number){return !!s.fire||now<(s.fireUntil||0)}
