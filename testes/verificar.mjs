import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const {chromium} = require('playwright');
const {PDFDocument} = require('pdf-lib');
const site = path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const work = process.env.RESULTADOS_TESTE || await fs.mkdtemp(path.join(tmpdir(),'rematricula-teste-'));
await fs.mkdir(work,{recursive:true});
const prefix='/secretaria/gerador/';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.csv':'text/csv'};
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(!url.pathname.startsWith(prefix)){res.writeHead(404).end();return;}
  const route=url.pathname.slice(prefix.length)||'index.html';
  try {const file=path.resolve(site,route);if (!file.startsWith(site+path.sep))throw Error();
    const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':(mime[path.extname(file)]||'text/plain')}).end(data);
  }catch{res.writeHead(404).end();}
});
await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok)});
const base='http://127.0.0.1:'+server.address().port+prefix;
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || undefined,headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'pt-BR',timezoneId:'America/Sao_Paulo'});
const page=await context.newPage();
// Entrega os recursos do disco no caminho de um site Pages, inclusive sem rede.
if (process.env.TESTE_ROTA_LOCAL === '1') await context.route(base+'**',async route=>{
  const pathname=new URL(route.request().url()).pathname.slice(prefix.length)||'index.html';
  try {const file=path.resolve(site,pathname);if(!file.startsWith(site+path.sep))throw Error();
    await route.fulfill({status:200,contentType:mime[path.extname(file)]||'text/plain',body:await fs.readFile(file)});
  } catch {await route.fulfill({status:404,body:'Arquivo ausente'});}
});
page.setDefaultTimeout(6000);
const errors=[],external=[],dialogLog=[];
let accept=true;
page.on('pageerror',e=>errors.push(e.message));
page.on('dialog',async d=>{dialogLog.push(d.message());if(accept)await d.accept();else await d.dismiss()});
page.on('request',r=>{if(!r.url().startsWith(base)&&!r.url().startsWith('blob:')&&!r.url().startsWith('data:')&&!r.url().startsWith('file:'))external.push(r.url())});
const at=id=>page.locator('#'+id);
const click=id=>at(id).click();
const val=id=>at(id).inputValue();
const fill=(id,s)=>at(id).fill(s);
const check=async(fn,msg)=>{await fn();console.log('OK '+msg)};
const active=()=>page.waitForFunction(()=>document.querySelector('#v21')?.value && !document.querySelector('main').inert);
const openQuery=async term=>{await click('run-search');await fill('query',term);};
const choose=async term=>{await openQuery(term);await at('query').press('Enter');};
const closeDB=async()=>{await at('db-dialog').getByRole('button',{name:'Voltar à emissão'}).click();};
const importBuffer=async buffer=>at('file').setInputFiles({name:'cadastros-teste.csv',mimeType:'text/csv',buffer});
const toCSV=async arr=>Buffer.from('\uFEFF'+await page.evaluate(arr=>Papa.unparse(arr,{delimiter:';'}),arr),'utf8');
async function expand(id) {
 const group=await at(id).evaluate(n=>n.closest('.group').id);
 await page.locator('#section-controls [aria-controls="'+group+'"]').click();
}
try {
 await check(async()=>{
  const example=await fs.readFile(path.join(site,'exemplos/dados-ficticios.csv'),'utf8');
  let sharedCSV=example;
  const url=base+'base-secretaria.csv';
  await page.route(url,route=>route.fulfill({contentType:'text/csv',body:sharedCSV}));
  try {
   await page.goto(base);await active();
   assert.match(await at('count').innerText(),/^5 /);
   assert.equal(await at('db-dialog').isVisible(),false);
   await choose('000071');assert.equal(await val('v0'),'João Exemplo');
   sharedCSV=example.replace('João Exemplo','João Base Atualizada');
   await page.reload();await active();
   await choose('000071');assert.equal(await val('v0'),'João Base Atualizada');
   sharedCSV='arquivo inválido';
   await page.reload();await active();
   assert.match(await at('count').innerText(),/^0 /);
   assert.match(await at('notice').innerText(),/Não foi possível carregar a base compartilhada/);
  } finally {await page.unroute(url);}
 },'carregamento automático da base compartilhada, atualização e tratamento de CSV inválido');
 await page.goto(base);await active();await page.screenshot({path:path.join(work,'inicial.png')});
 await check(async()=>{
  assert.equal(await page.title(),'Gerador de Comprovantes de Rematrícula · Walda Miranda de Paiva');
  assert.equal(await page.locator('input[id^="v"]').count(),20);
  await at('file').setInputFiles(path.join(site,'exemplos/dados-ficticios.csv'));
  await at('db-dialog').waitFor({state:'visible'});
  assert.deepEqual(await at('stats').locator('strong').allTextContents(),['5','4','1','1','2','2']);
  assert.equal(await page.evaluate(()=>Secretaria.headers.length),26);await closeDB();
 },'importação e estatísticas das 26 colunas');
 await check(async()=>{
  await openQuery('joao');assert.equal(await at('result-list').getByRole('option').count(),2);
  await fill('query','JOÃO');assert.equal(await at('result-list').getByRole('option').count(),2);
  await at('query').press('ArrowDown');await at('query').press('Enter');
  assert.equal(await val('v1'),'');assert.equal(await val('v2'),'18/04/2016');
  assert.equal(await val('v8'),'(00) 90000-1001');assert.equal(await val('v10'),'');assert.equal(await val('v19'),await page.evaluate(()=>new Date().toLocaleDateString('pt-BR')));
  assert.equal(await val('v21'),await page.evaluate(()=>new Date().toLocaleDateString('pt-BR')));
  await choose('000071');assert.equal(await val('v1'),'000071');
  await at('phone-source').selectOption('9');assert.equal(await val('v8'),'(00) 90000-1001');
  await click('copy-mother');assert.equal(await val('v10'),'Mãe Fictícia A');assert.equal(await val('v11'),await val('v8'));
 },'pesquisa normalizada, homônimos, sem matrícula e telefones alternativos');
 await check(async()=>{
  await fill('v0','Nome editado');assert.equal(await at('receipt').locator('[data-value="0"]').textContent(),'Nome editado');
  assert.equal(await at('v0').getAttribute('data-state'),'manual');
  accept=false;await choose('000073');accept=true;assert.equal(await val('v0'),'Nome editado');
  await at('query').press('Escape');await click('restore');assert.equal(await val('v0'),'João Exemplo');
  await click('new');await choose('000071');await fill('v0','João Fictício Editado');
  await click('save');assert.equal(await at('selected').textContent(),'João Fictício Editado');
  await expand('v19');assert.equal(await val('v19'),await page.evaluate(()=>new Date().toLocaleDateString('pt-BR')));
  assert.match(await val('v20'),/^\d\d:\d\d/);await click('restore');assert.equal(await val('v0'),'João Exemplo');
  await click('save');assert.equal(await at('selected').textContent(),'João Exemplo');
 },'edição só no documento, cancelamento de troca, gravação confirmada e restauração do original');
 await check(async()=>{
   await openQuery('agata');assert.equal(await at('result-list').getByRole('option').count(),0);
   await click('filters-btn');await at('inactive').check();assert.equal(await at('result-list').getByRole('option').count(),1);
   assert.match(await at('result-list').getByRole('option').innerText(),/Desativado/);
   await at('f24').selectOption('25/04/2026');await fill('query','');assert.equal(await at('result-list').getByRole('option').count(),1);
   await click('reset-filters');await at('f3').selectOption('5º ano');await at('f4').selectOption('B');
   await at('f6').selectOption('Ensino fundamental');await at('f22').selectOption('Matriculado');
   assert.equal(await at('result-list').getByRole('option').count(),1);await at('query').press('Enter');assert.equal(await val('v0'),'Joana Exemplo');
   await click('reset-filters');await click('filters-btn');await choose('000071');
   await openQuery('');await at('query').press('Escape');await click('next');assert.equal(await val('v1'),'');
   await click('previous');assert.equal(await val('v1'),'000071');
 },'cinco filtros, inclusão de desativados e navegação anterior/próximo');
 await check(async()=>{
   await click('settings');await fill('d5','Unidade de Teste');await click('save-settings');assert.equal(await val('v5'),'Escola de Demonstração');
   await choose('000073');assert.equal(await val('v18'),'2');
   assert.match(await at('receipt').textContent(),/CÓDIGO DA RE-MATRÍCULA 2/);
   await click('settings');await at('scope').selectOption('all');await at('bulk').check();accept=false;await click('save-settings');accept=true;
   assert.equal(await at('settings-dialog').isVisible(),true);await click('save-settings');await choose('000071');assert.equal(await val('v5'),'Unidade de Teste');
 },'padrões para vazios, confirmação de sobrescrita e sincronização dos dois códigos');
 await check(async()=>{
   for (const key of [18,19,20]) assert.ok(await at('v'+key).evaluate(n=>n.readOnly));
   for (const key of [8,11,17]) {
     await expand('v'+key);
     await fill('v'+key,'(99)0000-001');
     await at('v'+key).press('Home');
     await at('v'+key).pressSequentially('61');
     assert.equal(await val('v'+key),'(61) 99000-0001');
     await at('v'+key).press('End');await at('v'+key).pressSequentially('abc');
     assert.equal(await val('v'+key),'(61) 99000-0001');
     await at('v'+key).pressSequentially('6');
     assert.equal(await val('v'+key),'(61) 99000-0001, (6');
     await at('v'+key).press('Backspace');
     assert.equal(await val('v'+key),'(61) 99000-0001');
     await at('v'+key).pressSequentially('615959446846');
     assert.equal(await val('v'+key),'(61) 99000-0001, (61) 59594-4684, (6');
     const lines = await at('receipt').locator('[data-value="'+key+'"]').allTextContents();
     assert.equal(lines.join(' '),await val('v'+key));
     await fill('v'+key,'abc0030000001');assert.equal(await val('v'+key),'(00) 3000-0001');
     assert.equal(await at('receipt').locator('[data-value="'+key+'"]').textContent(),'(00) 3000-0001');
   }
   await page.clock.setFixedTime(new Date('2031-01-02T02:59:58Z'));
   await page.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));
   assert.equal(await val('v19'),'01/01/2031');assert.equal(await val('v20'),'23:59:58');
   await page.clock.setFixedTime(new Date('2031-01-02T03:00:02Z'));
   await page.waitForFunction(()=>document.querySelector('#v20').value==='00:00:02');
   assert.equal(await val('v19'),'02/01/2031');
   await click('save');
   const download=page.waitForEvent('download');await click('export');
   const saved=await download;
   const csv=await fs.readFile(await saved.path(),'utf8');
   const values=await page.evaluate(s=>Papa.parse(s,{delimiter:';'}).data[1],csv);
   assert.deepEqual(values.slice(18,21),['2','02/01/2031','00:00:02']);
   await page.clock.setFixedTime(new Date());
 },'máscara nos três telefones, inserção de DDD, bloqueio de letras, virada de dia e cadastro salvo');
 const headers=await page.evaluate(()=>Secretaria.headers);
 const demo=await fs.readFile(path.join(site,'exemplos/dados-ficticios.csv'),'utf8');
 const raw=await page.evaluate(s=>Papa.parse(s,{delimiter:';',skipEmptyLines:true}).data,demo);
 const row=raw[1].slice();
 row[0]='Álvaro '+('Sobrenome de Demonstração '.repeat(12)).trim();row[12]='Rua Fictícia; setor "Norte", '+('quadra e lote de demonstração '.repeat(16)).trim();
 row[13]='Jardim\nModelo';row[25]=' =1+1';row[7]='<b>Nome fictício</b>';row[14]='00000-002';row[18]='2';
 await check(async()=>{
   const bad=raw[0].slice();bad[0]='Cabeçalho incorreto';await importBuffer(await toCSV([bad,row]));
   await page.waitForFunction(()=>!document.querySelector('main').inert);
   assert.match(dialogLog.at(-1),/26 cabeçalhos/);assert.equal(await at('count').innerText(),'5 alunos carregados');
   await importBuffer(await toCSV([headers,row.slice(1)]));await page.waitForFunction(()=>!document.querySelector('main').inert);assert.match(dialogLog.at(-1),/25 colunas/);
   await importBuffer(await toCSV([headers.slice().reverse(),row.slice().reverse()]));await closeDB();
   await choose('alvaro');assert.equal(await val('v12'),row[12]);assert.equal(await val('v7'),row[7]);
   assert.equal(await at('v14').inputValue(),'00000-002');assert.equal(await page.locator('#receipt b').count(),0);
   const dl=page.waitForEvent('download');await click('export');const file=await dl;await file.saveAs(path.join(work,'exportado.csv'));
   const bytes=await fs.readFile(path.join(work,'exportado.csv'));assert.ok(bytes.subarray(0,3).equals(Buffer.from([239,187,191])));
   const table=await page.evaluate(s=>Papa.parse(s,{delimiter:';',skipEmptyLines:true}).data,bytes.toString());
   assert.deepEqual(table[0],headers);assert.equal(table[1][25],"' =1+1");assert.deepEqual(table[1].slice(0,25),row.slice(0,25));
 },'CSV inválido preserva base, reordenação, Unicode, aspas, quebra de linha, zeros e proteção de fórmulas');
 await check(async()=>{
   await page.pdf({path:path.join(work,'longo.pdf'),preferCSSPageSize:true,printBackground:true});
   assert.equal(await at('paper-error').isHidden(),true);
   const fits=await at('receipt').evaluate(svg=>[...svg.querySelectorAll('text')].every(x=>{const b=x.getBBox();return b.x>=0&&b.y>=0&&b.x+b.width<=595&&b.y+b.height<842}));
   assert.ok(fits);assert.equal(await at('zoom-fit').textContent(),'150%');
   await click('zoom-in');assert.equal(await at('zoom-fit').textContent(),'175%');
   await click('zoom-out');assert.equal(await at('zoom-fit').textContent(),'150%');
   await click('zoom-fit');assert.equal(await at('zoom-fit').textContent(),'100%');
   await page.evaluate(()=>{window.print=()=>window.testPrint=(window.testPrint||0)+1});
   await click('print');await click('pdf');await page.keyboard.press('Control+p');assert.equal(await page.evaluate(()=>window.testPrint),3);
   await page.keyboard.press('Control+k');assert.equal(await page.evaluate(()=>document.activeElement.id),'query');await page.keyboard.press('Escape');
   await context.setOffline(true);
   const blockNetwork = route => route.abort('internetdisconnected');
   await context.route('**/*',blockNetwork);
   await choose('alvaro');await fill('v1','000001');assert.equal(await val('v1'),'000001');await click('save');
   const dl=page.waitForEvent('download');await click('export');await dl;
   await page.pdf({path:path.join(work,'offline.pdf'),preferCSSPageSize:true,printBackground:true});
   await context.unroute('**/*',blockNetwork);await context.setOffline(false);
 },'texto longo, limites A4, zoom, impressão e exportação sem conexão');
 await check(async()=>{
   await page.reload();await active();assert.match(await at('count').innerText(),/^0 /);
   await at('file').setInputFiles(path.join(site,'exemplos/dados-ficticios.csv'));await closeDB();await click('settings');await at('remember').check();await click('save-settings');
   await at('settings-dialog').waitFor({state:'hidden'});
   await page.reload();await active();assert.match(await at('count').innerText(),/^5 /);
   await choose('000071');await fill('v0','Aluno Persistido de Exemplo');await click('save');await active();
   await page.reload();await active();await choose('persistido');assert.equal(await val('v1'),'000071');
   await click('base');await click('erase');await at('db-dialog').waitFor({state:'hidden'});
   await page.reload();await active();assert.match(await at('count').innerText(),/^0 /);
 },'memória por padrão, recuperação em IndexedDB e apagamento completo');
 await check(async()=>{
   const dataset=Array.from({length:573},(_,i)=>{const r=raw[1].slice();r[0]='Aluno Fictício '+String(i+1).padStart(3,'0');r[1]=i<39?'':String(i).padStart(6,'0');r[24]=i<93?'01/01/2026':'';return r;});
   await importBuffer(await toCSV([headers,...dataset]));await at('db-dialog').waitFor({state:'visible'});
   assert.deepEqual((await at('stats').locator('strong').allTextContents()).slice(0,4),['573','480','93','39']);await closeDB();await choose('Fictício 573');
   assert.equal(await val('v1'),'000572');await fill('v0','Referência de Teste');await expand('v19');
   await expand('v0');
   await click('zoom-fit');
   for (const [width,height] of [[1366,768],[1280,720],[1024,600]]) {
     await page.setViewportSize({width,height});
     await page.waitForFunction(()=>{
       const screen=document.documentElement, paper=document.querySelector('#paper').getBoundingClientRect();
       const stage=document.querySelector('#stage').getBoundingClientRect();
       return screen.scrollHeight<=innerHeight+1 && screen.scrollWidth<=innerWidth+1 &&
         paper.height>150 && paper.bottom<=stage.bottom && document.querySelector('#save').getBoundingClientRect().bottom<=innerHeight;
     });
   }
   await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(work,'mobile.png')});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1));
   await click('show-preview');assert.ok(await at('print').isVisible());
   assert.ok(await page.evaluate(()=>document.querySelector('#print').getBoundingClientRect().bottom<=innerHeight));
   await click('show-editor');assert.equal(await val('v0'),'Referência de Teste');
   await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:path.join(work,'preenchido.png')});
 },'lote sintético de 573 linhas, busca do último registro e tela móvel');
 await check(async()=>{
   await click('new');await page.evaluate(()=>{for(const i of [18,21]){const e=document.querySelector('#v'+i);e.value=i===18?'2':'';e.dispatchEvent(new Event('input',{bubbles:true}));}});
   await page.pdf({path:path.join(work,'replica.pdf'),preferCSSPageSize:true,printBackground:true});
   const local=await context.newPage();await local.goto(pathToFileURL(path.join(site,'index.html')).href);
   await local.waitForSelector('#v0');await local.locator('#file').setInputFiles(path.join(site,'exemplos/dados-ficticios.csv'));
   await local.locator('#db-dialog[open]').waitFor();assert.match(await local.locator('#count').innerText(),/^5 /);
   await local.locator('#db-dialog').getByRole('button',{name:'Voltar à emissão'}).click();
   await local.locator('#query').fill('000071');await local.locator('#query').press('Enter');
   await local.pdf({path:path.join(work,'local.pdf'),preferCSSPageSize:true,printBackground:true});await local.close();
   assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
 },'impressão de referência, abertura direta do ZIP extraído e ausência de chamadas externas ou erros JS');
 await check(async()=>{
   for (const file of ['replica.pdf','longo.pdf','offline.pdf']) {
     const pdf = await PDFDocument.load(await fs.readFile(path.join(work,file)));
     assert.equal(pdf.getPageCount(),1);
     const {width,height} = pdf.getPage(0).getSize();
     assert.ok(Math.abs(width-595.28)<1 && Math.abs(height-841.89)<1);
   }
 },'três PDFs com exatamente uma página A4 em retrato');
 console.log('Resultados gravados em '+work);
} finally {await browser.close();server.closeAllConnections();server.close();}


