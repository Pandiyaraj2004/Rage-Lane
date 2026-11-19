import {test} from 'node:test';import assert from 'node:assert/strict';import {resolveAim} from '../client/src/aim.js';
test('default aim follows forward travel and reverse travel',()=>{assert.equal(resolveAim(1.2,150,0,0),1.2);assert.equal(resolveAim(1.2,-100,0,0),1.2+Math.PI)});
test('manual aim overrides travel only while a direction is held',()=>{assert.equal(resolveAim(1.2,150,1,0),0);assert.equal(resolveAim(1.2,150,0,-1),-Math.PI/2);assert.equal(resolveAim(1.2,150,0,0,2.5),2.5);assert.equal(resolveAim(1.2,150,0,0),1.2)});
