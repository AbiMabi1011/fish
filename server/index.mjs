import { createServer } from 'node:http';
import { mkdir,readFile,stat } from 'node:fs/promises';
import { resolve,sep,extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { createStore } from './store.mjs';
import { GameEngine } from './engine.mjs';
import { fetchPuzzle } from './puzzles.mjs';
import { Duels } from './duels.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));await mkdir(resolve(root,'data'),{recursive:true});
const store=createStore(process.env.DATA_FILE||resolve(root,'data/treasure.sqlite'));const duels=new Duels(store,fetchPuzzle);const games=new Map(),attempts=new Map();
function slot(user){let s=games.get(user.id);if(!s){s={engine:null,revision:0,eventId:0,answer:null,gameId:null,reward:null};games.set(user.id,s);}return s;}
function snapshot(user){const s=slot(user);return {state:s.engine?.getState()||GameEngine.initialState(),revision:s.revision,eventId:s.eventId,answer:s.answer,gameId:s.gameId};}
function start(user,stage){const p=store.progress(user.id);if(!Number.isInteger(stage)||stage<1||stage>p.max_stage)throw new Error('Unlock this stage first.');const s=slot(user);s.engine?.dispose();s.engine=new GameEngine(fetchPuzzle);s.gameId=randomUUID();s.answer=null;s.reward=null;s.persistenceError=null;s.pending=null;s.revision++;
  s.engine.events.on('stateChanged',()=>s.revision++);s.engine.events.on('answered',r=>{s.answer=r;s.eventId++;s.revision++;});
  s.engine.events.on('gameOver',r=>{s.pending=r;try{s.reward=store.complete(user.id,s.gameId,r);s.pending=null;}catch{s.persistenceError='Your score could not be saved. Please retry.';}s.revision++;});s.engine.start(stage);return snapshot(user);
}
const send=(res,status,data,headers={})=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store',...headers});res.end(JSON.stringify(data));};
const cookie=token=>`treasure_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${token?604800:0}${process.env.COOKIE_SECURE==='true'?'; Secure':''}`;
async function body(req){let text='';for await(const c of req){text+=c;if(text.length>10000)throw new Error('Request too large.');}try{return JSON.parse(text||'{}');}catch{throw new Error('Invalid request.');}}
const server=createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Referrer-Policy','same-origin');
  const path=new URL(req.url,'http://'+req.headers.host).pathname;
  if(path.startsWith('/api/')){try{
    const allowedOrigins=new Set(['http://'+req.headers.host,'http://127.0.0.1:5174','http://localhost:5174',...(process.env.APP_ORIGIN?[process.env.APP_ORIGIN]:[])]);
    if(req.method==='POST'&&req.headers.origin&&!allowedOrigins.has(req.headers.origin))return send(res,403,{error:'Request origin not allowed.'});
    const token=/(?:^|;\s*)treasure_session=([a-f0-9]{64})/.exec(req.headers.cookie||'')?.[1];const user=store.user(token);
    if(req.method==='GET'&&path==='/api/auth/me')return send(res,200,{user});
    if(req.method==='GET'&&path==='/api/scores')return send(res,200,store.leaderboard());
    if(req.method==='POST'&&['/api/auth/register','/api/auth/login'].includes(path)){
      const now=Date.now();for(const[k,v]of attempts)if(v.until<now)attempts.delete(k);const key=req.socket.remoteAddress;const a=attempts.get(key)||{count:0,until:now+60000};attempts.set(key,a);if(++a.count>20)return send(res,429,{error:'Too many attempts. Please wait a minute.'});
      const d=await body(req);const account=path.endsWith('register')?await store.register(d.email,d.password,d.name):await store.login(d.email,d.password);if(token)store.logout(token);return send(res,200,{user:account},{'Set-Cookie':cookie(store.createSession(account.id))});
    }
    if(!user)return send(res,401,{error:'Sign in to your local account first.'});
    if(req.method==='POST'&&path==='/api/auth/logout'){store.logout(token);return send(res,200,{ok:true},{'Set-Cookie':cookie('')});}
    if(req.method==='POST'&&path==='/api/auth/avatar')return send(res,200,store.selectAvatar(user.id,(await body(req)).avatar));
    if(req.method==='GET'&&path==='/api/progress')return send(res,200,store.progress(user.id));
    if(req.method==='POST'&&path==='/api/progress/gift')return send(res,200,store.gift(user.id,(await body(req)).gift));
    if(req.method==='POST'&&path==='/api/progress/avatar')return send(res,200,store.unlock(user.id,(await body(req)).avatar));
    if(req.method==='POST'&&path==='/api/progress/reef'){const d=await body(req);return send(res,200,store.reef(user.id,d.item,d.action));}
    if(req.method==='POST'&&path==='/api/progress/aquarium'){const d=await body(req);return send(res,200,store.aquarium(user.id,d.action,d.species));}
    if(req.method==='GET'&&path==='/api/scores/best')return send(res,200,{best:store.best(user.id)});
    if(req.method==='GET'&&path==='/api/solo')return send(res,200,snapshot(user));
    if(req.method==='POST'&&path==='/api/solo/start')return send(res,200,start(user,(await body(req)).stage??1));
    if(req.method==='POST'&&path==='/api/solo/action'){const d=await body(req),s=slot(user);if(!s.engine||d.gameId!==s.gameId)throw new Error('This game has ended. Start a new dive.');if(d.action==='answer'){if(!Number.isInteger(d.fish)||d.fish<0||d.fish>99)throw new Error('Enter a valid count.');if(d.round!==s.engine.getState().round)throw new Error('This round has ended.');s.engine.submit(d.fish);}else if(['pause','resume','quit','retry'].includes(d.action)){const action=d.action==='retry'?'nextRound':d.action;if(action==='nextRound'&&s.engine.getState().phase!=='loading')throw new Error('The current puzzle is still active.');s.engine[action]();}else throw new Error('Unknown action.');return send(res,200,snapshot(user));}
    if(req.method==='GET'&&path==='/api/solo/result'){const s=slot(user);if(s.pending){s.reward=store.complete(user.id,s.gameId,s.pending);s.pending=null;}if(!s.reward)throw new Error('Finish a game before collecting its results.');return send(res,200,s.reward);}
    if(req.method==='POST'&&path==='/api/duels/create')return send(res,200,{id:await duels.create(user)});
    if(req.method==='POST'&&path==='/api/duels/join')return send(res,200,{id:duels.join((await body(req)).code,user)});
    const match=/^\/api\/duels\/([a-f0-9-]+)(?:\/(puzzle|answer|start|leave))?$/.exec(path);
    if(match){const[,id,action]=match;if(req.method==='GET'&&!action)return send(res,200,duels.read(id,user));if(req.method==='GET'&&action==='puzzle')return send(res,200,duels.puzzle(id,user));if(req.method==='POST'&&action==='answer'){const d=await body(req);return send(res,200,duels.answer(id,user,d.round,d.answer));}if(req.method==='POST'&&['start','leave'].includes(action)){duels[action](id,user);return send(res,200,{ok:true});}}
    return send(res,404,{error:'Endpoint not found.'});
  }catch(e){return send(res,400,{error:['TypeError','TimeoutError','AbortError'].includes(e.name)?'The service could not be reached. Please retry.':e.message});}}
  try{const dist=resolve(root,'dist');let target=resolve(dist,'.'+decodeURIComponent(path));if(target!==dist&&!target.startsWith(dist+sep)){res.writeHead(403);return res.end();}try{if(!(await stat(target)).isFile())target=resolve(dist,'index.html');}catch{target=resolve(dist,'index.html');}const content=await readFile(target);res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.ttf':'font/ttf','.woff2':'font/woff2'})[extname(target)]||'application/octet-stream'});res.end(content);}catch{res.writeHead(404);res.end('Build the app first, or use the development server on port 5174.');}
});
server.listen(Number(process.env.PORT||3002),'127.0.0.1',()=>console.log('Treasure Count backend: http://127.0.0.1:'+(process.env.PORT||3002)));
function stop(){for(const s of games.values())s.engine?.dispose();server.close(()=>{store.close();process.exit(0);});}process.on('SIGINT',stop);process.on('SIGTERM',stop);
