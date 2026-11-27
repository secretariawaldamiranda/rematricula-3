'use strict';
(() => {
  const {headers,blank,readFile,csvBlob,statistics,incomplete,findRows,storage,renderReceipt} = Secretaria;
  const $ = id => document.getElementById(id);
  const sections = [
    ['Dados do aluno','user',[0,1,2,5,7,8,10,11]],
    ['Endereço','pin',[12,13,14,15,16,17]],
    ['Rematrícula','calendar',[18,19,20,6,3,21]]
  ];
  const keys = sections.flatMap(s => s[2]);
  const defaultKeys = [5,16,15,6,21];
  const phoneFields = [8,11,17];
  const automaticFields = [18,19,20];
  const filterKeys = [3,4,6,22,24];
  const statNames = ['Total de registros','Sem desativação','Desativados','Sem matrícula','Possíveis duplicidades','Cadastros incompletos'];
  const labelNames = {0:'Nome',8:'Telefone da mãe',17:'Telefone residencial'};
  const emptyValues = () => Array(headers.length).fill('');
  const dateNow = () => new Date().toLocaleDateString('pt-BR');
  let rows = [], selectedId = null, matches = [], cursor = -1;
  let draft = emptyValues(), baseline = emptyValues(), phoneKey = 8, initialPhone = 8;
  let prefs = {defaults:{},scope:'empty'}, remember = false, revision = null, changedBase = false;
  let percent = 150, pageFits = true, timer, busy = false, ready = false;
  const current = () => rows.find(row => row.id === selectedId);
  const dirty = () => keys.some(i => !automaticFields.includes(i) && draft[i] !== baseline[i]) || phoneKey !== initialPhone;
  const canLeave = () => !dirty() || confirm('Descartar as alterações feitas somente neste comprovante?');
  const visibleResults = () => !$('results').hidden;
  function el(tag,cls,text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function icon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('class','icon'); svg.setAttribute('aria-hidden','true');
    const use = document.createElementNS(svg.namespaceURI,'use');
    use.setAttribute('href','#i-' + name); svg.append(use); return svg;
  }
  function notice(message) {
    $('notice').firstElementChild.textContent = message;
    $('notice').hidden = false; clearTimeout(timer);
    timer = setTimeout(() => {$('notice').hidden = true;},9000);
  }
  function on(id, event, fn) {
    $(id).addEventListener(event, fn);
  }
  // Impede transições concorrentes durante leituras de arquivo e transações.
  async function transaction(fn) {
    if (busy || !ready) return;
    busy = true;
    const main = $('emissao'), mast = document.querySelector('.mast'), dialog = document.querySelector('dialog[open]');
    mast.inert = main.inert = true; if (dialog) dialog.inert = true;
    try { await fn(); }
    catch (error) { alert(error.message || 'A operação não foi concluída.'); }
    finally { mast.inert = main.inert = false; if (dialog) dialog.inert = false; busy = false; }
  }
  async function saveSnapshot(nextRows,nextPrefs,nextRemember=remember) {
    if (nextRemember) {
      revision = await storage.write({rows:nextRows,prefs:nextPrefs},revision);
    } else if (remember) {
      await storage.clear(revision); revision = null;
    }
  }
  function formatPhoneNumber(digits, additional) {
    if (additional && digits.length <= 2) return '(' + digits;
    if (!additional && digits.length <= 4) return digits;
    const hasDDD = additional || digits.length >= 10;
    const local = hasDDD ? digits.slice(2) : digits;
    const prefix = hasDDD ? '(' + digits.slice(0,2) + ') ' : '';
    return prefix + (local.length <= 4 ? local : local.slice(0,-4) + '-' + local.slice(-4));
  }
  function formatPhone(value) {
    const numbers = [];
    for (const part of value.split(',')) {
      const digits = part.replace(/\D/g,'');
      for (let i = 0; i < digits.length; i += 11) {
        numbers.push(formatPhoneNumber(digits.slice(i,i+11), numbers.length > 0));
      }
    }
    return numbers.join(', ');
  }
  function maskPhone(input) {
    const count = input.value.slice(0,input.selectionStart).replace(/\D/g,'').length;
    const formatted = formatPhone(input.value);
    if (formatted === input.value) return;
    input.value = formatted;
    let pos = 0, found = 0;
    while (pos < formatted.length && found < count) {
      if (/\d/.test(formatted[pos])) found++;
      pos++;
    }
    input.setSelectionRange(pos,pos);
  }
  function refreshRegistration() {
    const now = new Date();
    draft[18] = '2';
    draft[19] = now.toLocaleDateString('pt-BR');
    draft[20] = now.toLocaleTimeString('pt-BR',{hour12:false});
    for (const key of automaticFields) {
      const field = $('v'+key);
      if (field.value !== draft[key]) field.value = draft[key];
      const printed = $('receipt').querySelector('[data-value="'+key+'"]');
      if (printed && printed.textContent !== draft[key]) printed.textContent = draft[key];
    }
  }
  function inputField(index,prefix) {
    const label = el('label','field');
    const caption = labelNames[index] || headers[index];
    label.append(el('span','',caption));
    const input = el('input');
    input.type = 'text'; input.id = prefix+index; input.autocomplete = 'off';
    input.spellcheck = false;
    if (prefix === 'v') {
      input.readOnly = automaticFields.includes(index);
      if (phoneFields.includes(index)) {
        input.type = 'tel'; input.inputMode = 'numeric';
        input.addEventListener('beforeinput', event => {
          if (event.inputType === 'insertText' && event.data && !/\d/.test(event.data)) {
            event.preventDefault(); return;
          }
          const pos = input.selectionStart;
          if (pos !== input.selectionEnd) return;
          if (event.inputType === 'deleteContentBackward') {
            let start = pos;
            while (start > 0 && /\D/.test(input.value[start-1])) start--;
            if (start < pos) input.setSelectionRange(Math.max(0,start-1),pos);
          } else if (event.inputType === 'deleteContentForward') {
            let end = pos;
            while (end < input.value.length && /\D/.test(input.value[end])) end++;
            if (end > pos) input.setSelectionRange(pos,Math.min(end+1,input.value.length));
          }
        });
      }
      if ([0,5,12,13,6].includes(index)) label.classList.add('wide');
      input.addEventListener('input', () => {
        if (input.readOnly) { refreshRegistration(); return; }
        if (phoneFields.includes(index)) maskPhone(input);
        draft[index] = input.value;
        updateEditor(false);
      });
    }
    label.append(input);
    return label;
  }
  function button(id,text,fn) {
    const b = el('button','compact',text); b.type='button'; b.id=id; b.addEventListener('click',fn); return b;
  }
  function buildForm() {
    sections.forEach(([title,symbol,indices],n) => {
      const group = el('section','group');
      group.id = 'group-'+n; group.hidden = n !== 0;
      group.setAttribute('aria-label',title);
      const control = button('section-'+n,title,()=>showSection(n));
      control.prepend(icon(symbol));
      control.setAttribute('aria-controls',group.id);
      control.setAttribute('aria-pressed',String(n === 0));
      $('section-controls').append(control);
      const grid = el('div','fields');
      indices.forEach(i => grid.append(inputField(i,'v')));
      group.append(grid);
      if (n === 0) {
        const choice = el('label','field wide','Número da mãe utilizado no comprovante');
        choice.id='phone-choice'; const select = el('select'); select.id='phone-source'; choice.append(select);grid.append(choice);
        select.addEventListener('change',() => {
          const desired = Number(select.value);
          if (draft[8] !== formatPhone(current()?.values[phoneKey] || '') && !confirm('Substituir o telefone digitado pelo número escolhido?')) {
            select.value = String(phoneKey); return;
          }
          phoneKey = desired; draft[8] = formatPhone(current().values[phoneKey]);updateEditor();
        });
        const actions = el('div','group-actions');
        actions.append(button('copy-mother','Copiar mãe para responsável',() => {
          if ((draft[10] || draft[11]) && !confirm('Substituir o nome e o telefone do responsável pelos dados da mãe?')) return;
          draft[10]=draft[7];draft[11]=draft[8];updateEditor();
          notice('Dados da mãe copiados para o responsável neste comprovante.');
        })); group.append(actions);
      }
      $('field-groups').append(group);
    });
    for (const i of defaultKeys) $('defaults').append(inputField(i,'d'));
    filterKeys.forEach(i => {
      const label = el('label','',headers[i]), sel = el('select'); sel.id='f'+i;
      sel.addEventListener('change',() => {
        if (i===24 && sel.value) $('inactive').checked=true;
        search(true);
      }); label.append(sel);$('filter-fields').append(label);
    });
  }
  function showSection(active) {
    sections.forEach((_,i) => {
      $('group-'+i).hidden = i !== active;
      $('section-'+i).setAttribute('aria-pressed',String(i === active));
    });
    $('field-groups').scrollTop = 0;
  }
  function withDefaults(source,settings=prefs) {
    const values = source.slice();
    for (const key of defaultKeys) {
      const def = settings.defaults[key] || '';
      if (!blank(def) && (settings.scope==='all' || blank(values[key]))) values[key]=def;
    }
    return values;
  }
  function loadDraft(row,source=row?.values || emptyValues(),useDefaults=true) {
    showSection(0);
    selectedId = row?.id ?? null;
    draft = useDefaults ? withDefaults(source) : source.slice();
    phoneKey = blank(source[8]) && !blank(source[9]) ? 9 : 8;
    draft[8] = source[phoneKey];
    for (const key of phoneFields) draft[key] = formatPhone(draft[key]);
    refreshRegistration();
    if (useDefaults && blank(draft[21])) draft[21]=dateNow();
    baseline=draft.slice();initialPhone=phoneKey;
    updatePhones(row?.values);
    updateEditor();updateNavigation();
  }
  function updatePhones(values) {
    const select = $('phone-source');
    select.replaceChildren();
    $('phone-choice').hidden = !values || blank(values[8]) || blank(values[9]);
    if (!$('phone-choice').hidden) {
      [8,9].forEach(i=>select.add(new Option((i===8?'Telefone':'Celular')+' · '+formatPhone(values[i]),String(i))));
      select.value=String(phoneKey);
    }
  }
  function updateEditor(write=true) {
    for (const i of keys) {
      const input=$('v'+i);
      if (write) input.value=draft[i];
      const modified=!automaticFields.includes(i) && (draft[i]!==baseline[i] || (i===8 && phoneKey!==initialPhone));
      input.dataset.state=modified?'manual':blank(draft[i])?'empty':'auto';
      input.title=modified?'Alterado neste comprovante':blank(draft[i])?'Campo vazio':'Preenchido automaticamente';
    }
    pageFits=renderReceipt(draft);
    document.body.classList.toggle('paper-overflow',!pageFits);$('paper-error').hidden=pageFits;
    $('print').disabled=$('pdf').disabled=!pageFits;
    $('selected').textContent=current() ? (current().values[0] || 'Aluno sem nome') : 'Comprovante em branco';
    $('edit-status').textContent=dirty()?'Alterações somente neste comprovante. Imprima ou salve na base local.':'As edições se aplicam ao comprovante atual.';
    $('save').disabled=$('restore').disabled=!current();
    $('copy-mother').disabled=blank(draft[7]) && blank(draft[8]);
  }
  function filterOptions(reset=false) {
    for (const i of filterKeys) {
      const select=$('f'+i), before=reset?'':select.value;
      const options=[...new Set(rows.map(row=>row.values[i]).filter(v=>!blank(v)))].sort((a,b)=>a.localeCompare(b,'pt-BR',{numeric:true}));
      select.replaceChildren(new Option('Todas as opções',''));
      options.forEach(value=>select.add(new Option(value,value)));
      if (options.includes(before)) select.value=before;
    }
  }
  function updateStats() {
    const totals=statistics(rows);
    $('stats').replaceChildren(...statNames.map((name,i)=>{
      const block=el('div','stat');block.append(el('strong','',totals[i]),el('span','',name));return block;
    }));
    $('count').lastElementChild.textContent=rows.length+(rows.length===1?' aluno carregado':' alunos carregados');
    $('export').disabled=!rows.length;
    $('memory').lastElementChild.textContent=remember?'Base neste computador':'Base na memória';
    $('search-hint').hidden=!!rows.length;
    $('db-message').textContent=rows.length?'Resumo da base carregada neste navegador.':'Importe um arquivo CSV para carregar os cadastros.';
  }
  function showResults(show) {
    $('results').hidden=!show;$('query').setAttribute('aria-expanded',String(show));
    if (!show) $('query').removeAttribute('aria-activedescendant');
  }
  function updateNavigation() {
    const i=matches.findIndex(row=>row.id===selectedId);
    $('previous').disabled=i<=0;
    $('next').disabled=i+1>=matches.length;
  }
  function highlight() {
    for (const [i,node] of [...$('result-list').children].entries()) {
      node.classList.toggle('current',i===cursor);
      node.setAttribute('aria-selected',String(i===cursor));
    }
    const node=$('result-list').children[cursor];
    if (node && visibleResults()) {
      $('query').setAttribute('aria-activedescendant',node.id);
      const panel=$('result-list');
      const delta=node.getBoundingClientRect().top-panel.getBoundingClientRect().top;
      if (delta<0) panel.scrollTop+=delta;
      else if (delta+node.offsetHeight>panel.clientHeight) panel.scrollTop+=delta+node.offsetHeight-panel.clientHeight;
    } else $('query').removeAttribute('aria-activedescendant');
  }
  function choose(row) {
    if (!row || (row.id!==selectedId && !canLeave())) return;
    if (row.id!==selectedId) loadDraft(row);
    showResults(false);
    $('query').blur();
  }
  function search(open=false) {
    const criteria=filterKeys.map(i=>[i,$('f'+i).value]);
    matches=findRows(rows,$('query').value,criteria,$('inactive').checked);
    $('filters-btn').lastChild.textContent='Filtros'+(criteria.some(([,v])=>v) || $('inactive').checked?' •':'');
    cursor=matches.length?0:-1;
    $('result-count').textContent=matches.length===0?'Nenhum aluno encontrado. Revise a pesquisa ou os filtros.':matches.length+' '+(matches.length===1?'aluno encontrado':'alunos encontrados');
    const list=document.createDocumentFragment();
    if (open) matches.forEach((row,i)=>{
      const v=row.values, option=el('div','result');option.setAttribute('role','option');option.id='result-'+row.id;
      const name=el('div');name.append(el('strong','',v[0] || 'Sem nome'),el('small','',[
        v[1]?'Matr. '+v[1]:'Sem matrícula',v[2]?'Nasc. '+v[2]:'Sem nascimento',v[3]||'Sem série',v[4]||'Sem turma',v[22]||'Situação sem registro'
      ].join(' · ')));
      const flags=el('div','flags');
      if (!blank(v[24])) flags.append(el('span','flag off','Desativado'));
      if (incomplete(v)) flags.append(el('span','flag','Incompleto'));
      option.append(name,flags);option.addEventListener('click',()=>choose(matches[i]));list.append(option);
    });
    $('result-list').replaceChildren(list);showResults(open && rows.length>0);
    highlight();updateNavigation();
  }
  function resetSearch() {
    $('query').value='';$('inactive').checked=false;filterOptions(true);search(false);
  }
  function focusSearch() { $('query').focus();$('query').select();search(true); }
  function printReceipt() {
    refreshRegistration();
    if (pageFits && !document.querySelector('dialog[open]')) window.print();
  }
  async function loadSharedBase() {
    try {
      const response = await fetch('./base-secretaria.csv', {
        mode:'same-origin', cache:'no-store', signal:AbortSignal.timeout(5000)
      });
      if (response.status === 404) return;
      if (!response.ok) throw Error();
      rows = await readFile(response);
    } catch {
      notice('Não foi possível carregar a base compartilhada. Confira o arquivo no servidor ou use Importar CSV.');
    }
  }
  async function importBase(file) {
    const next=await readFile(file);
    if ((rows.length || dirty()) && !confirm('Substituir a base carregada e o comprovante atual pelo novo CSV? Exporte antes as alterações que deseja guardar.')) return;
    await saveSnapshot(next,prefs);
    rows=next;changedBase=false;resetSearch();loadDraft(null);updateStats();
    $('db-message').textContent='Importação concluída. Cada linha do arquivo corresponde a um cadastro.';
    $('db-dialog').showModal();
  }
  async function saveStudent() {
    refreshRegistration();
    const row=current();if (!row) return;
    const updated=row.values.slice();
    for (const key of keys) {
      const target = key===8 ? phoneKey : key;
      if (phoneFields.includes(key) && draft[key] === formatPhone(updated[target])) continue;
      updated[target] = draft[key];
    }
    if (!updated.some((v,i)=>v!==row.values[i])) {
      notice(phoneKey!==initialPhone?'O número escolhido vale para este comprovante. Os dois telefones estão preservados no cadastro.':'Os campos do cadastro já estão atualizados.');
      return;
    }
    if (!confirm('Salvar os dados exibidos no cadastro local deste aluno, incluindo os padrões e a data do comprovante?')) return;
    refreshRegistration(); updated[19]=draft[19]; updated[20]=draft[20];
    const next=rows.map(r=>r.id===row.id?{...r,values:updated}:r);
    await saveSnapshot(next,prefs);
    rows=next;changedBase=true;baseline=draft.slice();initialPhone=phoneKey;
    filterOptions();search(false);updateStats();updateEditor();notice('Cadastro atualizado. Use Exportar CSV para obter uma cópia.');
  }
  function restore() {
    const row=current();
    if (!row || !confirm('Restaurar neste comprovante os valores do CSV originalmente importado? Para restaurar também o cadastro, use Salvar na base local.')) return;
    const previous=row.values.slice();const original=row.original;
    loadDraft(row,original,false);
    baseline=previous;initialPhone=blank(previous[8])&&!blank(previous[9])?9:8;baseline[8]=previous[initialPhone];
    for (const key of phoneFields) baseline[key]=formatPhone(baseline[key]);
    // A restauração também descarta padrões automáticos do comprovante atual.
    updateEditor();notice('Dados originais restaurados no comprovante.');
  }
  function exportBase() {
    if (!rows.length) return;
    const url=URL.createObjectURL(csvBlob(rows));
    const a=el('a');a.href=url;a.download='rematricula-atualizada-'+new Date().toLocaleDateString('sv-SE')+'.csv';
    document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    changedBase=false;notice('CSV gerado com os cadastros salvos na base local.');
  }
  function openSettings() {
    for (const i of defaultKeys) $('d'+i).value=prefs.defaults[i] || '';
    $('scope').value=prefs.scope;$('bulk').checked=false;$('bulk').disabled=!rows.length;
    $('remember').checked=remember;
    $('settings-dialog').showModal();
  }
  async function applySettings() {
    const settings={scope:$('scope').value,defaults:Object.fromEntries(defaultKeys.map(i=>[i,$('d'+i).value]))};
    const keep=$('remember').checked, bulk=$('bulk').checked;
    const next=bulk?rows.map(row=>({...row,values:withDefaults(row.values,settings)})):rows;
    const changed=bulk?next.filter((r,i)=>r.values.some((v,k)=>v!==rows[i].values[k])).length:0;
    const settingsChanged=JSON.stringify(defaultKeys.map(i=>prefs.defaults[i]||''))!==JSON.stringify(defaultKeys.map(i=>settings.defaults[i])) || settings.scope!==prefs.scope;
    if ((settingsChanged || changed) && !canLeave()) return;
    if ((settings.scope==='all' && settingsChanged) || changed || keep!==remember) {
      const parts=[];
      if (settings.scope==='all' && settingsChanged) parts.push('Os padrões definidos poderão substituir valores existentes nos comprovantes.');
      if (changed) parts.push('Atualizar '+changed+' cadastro(s) da base carregada?');
      if (keep!==remember) parts.push(keep?'Gravar esta base neste perfil do navegador com autorização da escola?':'Apagar a cópia persistente e manter a sessão atual na memória?');
      if (!confirm(parts.join('\n\n'))) return;
    }
    await saveSnapshot(next,settings,keep);rows=next;prefs=settings;remember=keep;changedBase ||= changed>0;
    if (settingsChanged || changed) loadDraft(current());
    filterOptions();search(false);updateStats();$('settings-dialog').close();
    notice(changed?changed+' cadastro(s) atualizado(s) com os padrões.':'Configurações salvas.');
  }
  async function erase() {
    if (!confirm('Apagar todos os cadastros, o comprovante, os padrões e a cópia lembrada por este aplicativo neste navegador? Esta ação não pode ser desfeita.')) return;
    // Acesso recusado a IndexedDB não impede o encerramento de uma sessão em memória.
    let clearError=false;
    try { await storage.clear(); } catch { clearError=true; }
    rows=[];remember=false;revision=null;prefs={defaults:{},scope:'empty'};changedBase=false;
    for (const i of defaultKeys) $('d'+i).value='';
    $('remember').checked=false;$('bulk').checked=false;$('file').value='';
    resetSearch();loadDraft(null);updateStats();$('db-dialog').close();
    if (clearError) alert('A memória foi limpa. O navegador bloqueou a verificação da cópia persistente. Limpe os dados deste site nas configurações do navegador.');
    else notice('Todos os dados locais do aplicativo foram apagados.');
  }
  function resizePaper() {
    const stage=$('stage'),style=getComputedStyle(stage);
    const width=stage.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);
    const height=stage.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom);
    $('paper').style.width=Math.max(1,Math.floor(Math.min(width,height*210/297)*percent/100))+'px';
    $('zoom-fit').textContent=percent+'%';
    $('zoom-out').disabled=percent<=50;$('zoom-in').disabled=percent>=200;
  }
  buildForm();
  for (const view of ['editor','preview']) {
    on('show-'+view,'click',()=>{
      $('workspace').classList.toggle('show-preview',view==='preview');
      for (const target of ['editor','preview']) $('show-'+target).setAttribute('aria-pressed',String(target===view));
    });
  }
  on('import','click',()=>$('file').click());
  on('file','change',()=>{const file=$('file').files[0];$('file').value='';if(file)transaction(()=>importBase(file));});
  on('base','click',()=>$('db-dialog').showModal());
  on('count','click',()=>$('db-dialog').showModal());
  on('settings','click',openSettings);
  on('save-settings','click',()=>transaction(applySettings));
  on('erase','click',()=>transaction(erase));
  on('export','click',exportBase);on('restore','click',restore);on('save','click',()=>transaction(saveStudent));
  on('new','click',()=>{if(canLeave()){loadDraft(null);notice('Novo comprovante em branco.');}});
  on('previous','click',()=>choose(matches[matches.findIndex(r=>r.id===selectedId)-1]));
  on('next','click',()=>choose(matches[matches.findIndex(r=>r.id===selectedId)+1]));
  on('query','input',()=>search(true));on('query','focus',()=>search(true));on('query','click',()=>{if(!visibleResults())search(true);});
  on('run-search','click',focusSearch);
  on('hide-results','click',()=>showResults(false));
  on('filters-btn','click',()=>{
    const panel=$('filters');panel.hidden=!panel.hidden;$('filters-btn').setAttribute('aria-expanded',String(!panel.hidden));
  });
  on('reset-filters','click',()=>{$('inactive').checked=false;filterOptions(true);search(true);});
  on('inactive','change',()=>{if (!$('inactive').checked) $('f24').value='';search(true);});
  on('print','click',printReceipt);on('pdf','click',printReceipt);
  on('zoom-in','click',()=>{percent=Math.min(200,percent+25);resizePaper();});
  on('zoom-out','click',()=>{percent=Math.max(50,percent-25);resizePaper();});
  on('zoom-fit','click',()=>{percent=100;resizePaper();});
  $('notice').lastElementChild.onclick=()=>{$('notice').hidden=true;};
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
  on('db-dialog','close',()=>{if(!busy && rows.length) $('query').focus();});
  document.addEventListener('keydown',e=>{
    if (busy) return;
    if (document.querySelector('dialog[open]')) return;
    const mod=e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase()==='k') {e.preventDefault();focusSearch();return;}
    if (mod && e.key.toLowerCase()==='p') {e.preventDefault();printReceipt();return;}
    if (e.key==='Escape') {showResults(false);$('filters').hidden=true;$('filters-btn').setAttribute('aria-expanded','false');return;}
    if (e.target!==$('query') || e.isComposing) return;
    if (['ArrowDown','ArrowUp'].includes(e.key)) {
      e.preventDefault();
      if(!visibleResults()) search(true);
      else cursor=Math.max(0,Math.min(matches.length-1,cursor+(e.key==='ArrowDown'?1:-1)));
      highlight();
    } else if(e.key==='Enter') {e.preventDefault();if (!visibleResults()) search(true);choose(matches[cursor]);}
  });
  document.addEventListener('click',e=>{if (!e.target.closest('.search-card'))showResults(false);});
  window.addEventListener('beforeunload',e=>{
    if(dirty() || (changedBase && !remember)) {e.preventDefault();e.returnValue='';}
  });
  const resize = new ResizeObserver(resizePaper);resize.observe($('stage'));
  async function start() {
    document.querySelector('.mast').inert=$('emissao').inert=true;
    let saved;
    try {saved=await storage.read();} catch {notice('Armazenamento persistente indisponível. A sessão funciona na memória.');}
    if (saved) {
      rows=saved.rows;prefs=saved.prefs;revision=saved.revision;remember=true;
    } else if (location.protocol === 'http:' || location.protocol === 'https:') {
      await loadSharedBase();
    }
    resetSearch();loadDraft(null);updateStats();ready=true;document.querySelector('.mast').inert=$('emissao').inert=false;
  }
  start().then(() => {
    setInterval(refreshRegistration,1000);
    window.addEventListener('beforeprint',refreshRegistration);
  });
})();
