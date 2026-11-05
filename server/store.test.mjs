import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from './store.mjs';
import {mkdirSync,rmSync} from 'node:fs';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
test('local accounts work immediately; passwords and cookies are verified',async()=>{
 const store=createStore(':memory:');try{const u=await store.register('Diver@Example.com','local-password-123','Diver');assert.equal((await store.login('diver@example.com','local-password-123')).id,u.id);await assert.rejects(store.login('diver@example.com','wrong-password'));await assert.rejects(store.register('diver@example.com','another-password','Duplicate'));await assert.rejects(store.register('bad','local-password-123','Name'));const token=store.createSession(u.id);assert.equal(store.user(token).id,u.id);assert.equal(store.user('fake'),null);store.logout(token);assert.equal(store.user(token),null);}finally{store.close();}
});
test('completed rewards are atomic and idempotent; gifts and avatars enforce eligibility',async()=>{
 const store=createStore(':memory:');try{const u=await store.register('reward@example.com','local-password-123','Diver');const r={correctAnswers:10,fishCounted:30,bestStreak:5,elapsed:120,score:300,level:3,rounds:13};const first=store.complete(u.id,'game-1',r);assert.deepEqual(first,{xp:300,coins:100,shells:1,quests:[1,2,3]});assert.deepEqual(store.complete(u.id,'game-1',r),first);assert.equal(store.progress(u.id).xp,300);assert.throws(()=>store.selectAvatar(u.id,'pufferfish'),/Unlock/);store.unlock(u.id,'pufferfish');assert.equal(store.selectAvatar(u.id,'pufferfish').avatar_id,'pufferfish');assert.equal(store.progress(u.id).coins,0);assert.equal(store.gift(u.id,1).coins,40);assert.throws(()=>store.gift(u.id,1),/already/);assert.equal(store.gift(u.id,3).xp,150);assert.throws(()=>store.gift(u.id,5),/Finish/);store.gift(u.id,0);assert.throws(()=>store.gift(u.id,0),/already/);assert.equal(store.leaderboard().length,1);assert.equal(store.best(u.id),300);}finally{store.close();}
});
test('accounts, sessions and progress survive closing and reopening SQLite',async()=>{
 mkdirSync(resolve('data'),{recursive:true});const file=resolve('data','test-'+randomUUID()+'.sqlite');let store=createStore(file);
 try {const u=await store.register('persist@example.com','local-password-123','Persistent');const token=store.createSession(u.id);store.complete(u.id,'persist-game',{correctAnswers:1,fishCounted:4,bestStreak:1,elapsed:5,score:28,level:1,rounds:4});store.close();store=createStore(file);assert.equal((await store.login('persist@example.com','local-password-123')).id,u.id);assert.equal(store.user(token).id,u.id);assert.equal(store.progress(u.id).xp,28);assert.equal(store.best(u.id),28);}finally{store.close();for(const suffix of ['','-wal','-shm'])rmSync(file+suffix,{force:true});}
});
test('reef purchases enforce balances and XP, remain idempotent and persist decorations',async()=>{
 mkdirSync(resolve('data'),{recursive:true});const file=resolve('data','test-reef-'+randomUUID()+'.sqlite');let store=createStore(file);
 try{
 const u=await store.register('reef@example.com','local-password-123','Reef builder');
 assert.throws(()=>store.reef(u.id,'coral','buy'),/Not enough/);
 assert.throws(()=>store.reef(u.id,'castle','buy'),/level 2/);
 assert.throws(()=>store.reef(u.id,'turtle','show'),/Buy/);
 assert.throws(()=>store.reef(u.id,'unknown','buy'),/Unknown/);
 assert.throws(()=>store.reef(u.id,'coral','refund'),/Unknown/);
 store.complete(u.id,'reef-game',{correctAnswers:200,fishCounted:30,bestStreak:5,elapsed:120,score:2100,level:3,rounds:200});
 const before=store.progress(u.id);store.reef(u.id,'coral','buy');store.reef(u.id,'coral','buy');
 assert.equal(store.progress(u.id).coins,before.coins-60);assert.equal(store.progress(u.id).xp,2100);
 store.reef(u.id,'coral','hide');assert.deepEqual(store.progress(u.id).reef_equipped,[]);
 store.reef(u.id,'coral','show');store.reef(u.id,'coral','show');assert.deepEqual(store.progress(u.id).reef_equipped,['coral']);
 assert.throws(()=>store.reef(u.id,'turtle','buy'),/Not enough/);assert.equal(store.progress(u.id).shells,1);
 store.complete(u.id,'reef-game-2',{correctAnswers:1,fishCounted:0,bestStreak:0,elapsed:0,score:0,level:8,rounds:1});store.gift(u.id,5);store.reef(u.id,'turtle','buy');assert.equal(store.progress(u.id).shells,0);
 store.close();store=createStore(file);assert.deepEqual(store.progress(u.id).reef_owned,['coral','turtle']);assert.deepEqual(store.progress(u.id).reef_equipped,['coral','turtle']);
 }finally{store.close();for(const suffix of ['','-wal','-shm'])rmSync(file+suffix,{force:true});}
});
