const assert=require('node:assert/strict');
const fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
const mod={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname,'../src/lib/fileValidation.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:mod.exports,Uint8Array});
const api=mod.exports;
function file(type,name,content='%PDF-1.7'){return {type,name,size:content.length,slice:()=>({arrayBuffer:async()=>new TextEncoder().encode(content.slice(0,5)).buffer})};}
(async()=>{
 for(const type of ['application/pdf','','application/octet-stream']){const pdf=file(type,'sklad.PDF');api.assertSafePdf(pdf);assert.equal(await api.hasPdfSignature(pdf),true);}
 assert.throws(()=>api.assertSafePdf(file('image/png','sklad.pdf')));
 assert.throws(()=>api.assertSafePdf(file('','sklad.txt')));
 assert.throws(()=>api.assertSafePdf({...file('application/pdf','sklad.pdf'),size:21*1024*1024}));
 assert.equal(await api.hasPdfSignature(file('application/pdf','fake.pdf','not a PDF')),false);
 console.log('PASS: PDF MIME variants, signature, extension and size restrictions');
})().catch(e=>{console.error(e);process.exitCode=1});
