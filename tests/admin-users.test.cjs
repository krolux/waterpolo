const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const root=require('node:path').resolve(__dirname,'..');const ts=require(root+'/node_modules/typescript');
const tested={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(root+'/supabase/functions/admin-users/index.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:tested.exports,require:()=>({createClient:()=>null}),Deno:{serve:()=>{}},Request,Response,Map});
const self='11111111-1111-4111-8111-111111111111';const target='22222222-2222-4222-8222-222222222222';
function stub(role='Admin',options={}) {
 const calls=[];
 const db={calls,auth:{getUser:async()=>({data:{user:{id:self}}}),admin:{
   listUsers:async()=>({data:{users:[{id:target,email:'private@example.test',encrypted_password:'SECRET_HASH'}]}}),
   createUser:async body=>{calls.push(['create',body]);return {data:{user:{id:target}}};},
   updateUserById:async(id,body)=>{calls.push(['password',id,body]);return {};},
   deleteUser:async(id)=>{calls.push(['cleanup',id]);return {};},
 }},from(table){let op='read',values;const q={select(){return q;},eq(){return q;},order(){return q;},update(v){op='update';values=v;return q;},upsert(v){op='upsert';values=v;return q;},single:async()=>result(),then(resolve,reject){return Promise.resolve(result()).then(resolve,reject);}};
 function result(){if(op!=='read'){calls.push([op,table,values]);return options.profileFail?{error:{message:'profile failed'}}:{data:{id:target}};}
 if(table==='clubs')return {data:[{id:target,name:'Club'}]};
 // single() fetches caller; list query is awaited directly
 return {data:{role,is_active:options.inactive?false:true}};
 }
 q.then=(resolve,reject)=>Promise.resolve(table==='profiles'&&op==='read'?{data:[{id:target,display_name:'Test',role:'Club',club_id:target}]}:result()).then(resolve,reject);
 return q;}};return db;
}
async function call(db,body,auth=true){return tested.exports.handle(new Request('https://test.invalid',{method:'POST',headers:auth?{Authorization:'Bearer test-token','Content-Type':'application/json'}:{'Content-Type':'application/json'},body:JSON.stringify(body)}),db);}
(async()=>{
 assert.equal((await call(stub(),{action:'list'},false)).status,401);
 for(const role of ['Guest','Club','Referee','Delegate','Editor']) {const db=stub(role);assert.equal((await call(db,{action:'password',id:target,password:'TestPassword'})).status,403);assert.equal(db.calls.length,0);}
 assert.equal((await call(stub('Admin',{inactive:true}),{action:'list'})).status,403);
 const db=stub();const list=await (await call(db,{action:'list'})).json();assert.equal(list.users[0].email,'private@example.test');assert.equal(JSON.stringify(list).includes('SECRET_HASH'),false);
 const profile={action:'create',display_name:'Test',first_name:'Test',last_name:'User',role:'Club',club_id:target,email:'test@example.test',password:'TestPassword'};
 assert.equal((await call(db,profile)).status,200);assert.equal(db.calls[0][0],'create');assert.equal(db.calls[1][2].club_id,target);
 assert.equal((await call(stub(),{...profile,club_id:''})).status,400);
 assert.equal((await call(stub(),{...profile,role:'SuperAdmin'})).status,400);
 assert.equal((await call(stub(),{...profile,password:'short'})).status,400);
 assert.equal((await call(stub(),{...profile,action:'edit',id:self,role:'Guest'})).status,400);
 assert.equal((await call(stub(),{action:'password',id:self,password:'TestPassword'})).status,400);
 const reset=stub();const response=await call(reset,{action:'password',id:target,password:'TestPassword'});assert.equal(response.status,200);assert.equal(JSON.stringify(await response.json()).includes('TestPassword'),false);assert.equal(reset.calls[0][0],'password');
 const cleanup=stub('Admin',{profileFail:true});assert.equal((await call(cleanup,profile)).status,400);assert.equal(cleanup.calls.at(-1)[0],'cleanup');assert.equal(cleanup.calls.at(-1)[1],target);
 console.log('Admin users: session/admin checks, private list, roles/clubs, password validation, self-protection and failed-create cleanup passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
