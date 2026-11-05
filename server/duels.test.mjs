import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from './store.mjs';
import {Duels} from './duels.mjs';
test('duels enforce membership, capacity, host start, deadlines and replay protection',async(t)=>{
 let now=100000;t.mock.method(Date,'now',()=>now);const store=createStore(':memory:');try{
 const host=await store.register('host@example.com','local-password-123','Host'),guest=await store.register('guest@example.com','local-password-123','Guest'),other=await store.register('other@example.com','local-password-123','Other');
 const service=new Duels(store,async()=>({imageUrl:'test-image',fish:8,chests:2}));const id=await service.create(host);const room=service.read(id,host);assert.equal(room.puzzles,undefined);assert.throws(()=>service.read(id,other),/other players/);assert.equal(service.join(room.code,guest),id);assert.throws(()=>service.join(room.code,other),/full/);assert.throws(()=>service.start(id,guest),/host/);service.start(id,host);assert.equal(service.puzzle(id,host).fish,undefined);assert.throws(()=>service.answer(id,host,0,8),/countdown/);now+=3100;assert.equal(service.answer(id,host,0,8).correct,true);assert.throws(()=>service.answer(id,host,0,8),/ended/);assert.equal(service.read(id,host).host_score,25);now+=20000;service.read(id,guest);assert.equal(service.read(id,host).host_lives,2);service.leave(id,host);service.leave(id,guest);assert.equal(service.read(id,host).status,'finished');
 }finally{store.close();}
});
