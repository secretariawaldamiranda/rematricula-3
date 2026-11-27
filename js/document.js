'use strict';
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.getElementById('receipt');
  const measure = document.createElement('canvas').getContext('2d');
  const template = [
    {bar:'DADOS DO ALUNO', y:163.23, top:153.33},
    {y:174.48, cells:[[0,'NOME:',12.3,39.0,573]]},
    {y:187.47, cells:[[1,'MATRÍCULA:',12.3,62.5,377],[2,'DATA DE NASCIMENTO:',380.3,474.5,573]]},
    {y:198.51, cells:[[5,'UNIDADE DE ENSINO:',12.3,97.6,573]]},
    {y:210.51, cells:[[7,'NOME DA MÃE:',12.3,72.7,377],[8,'TELEFONE MÃE:',380.3,445.5,573]]},
    {y:222.51, cells:[[10,'NOME DO RESPONSÁVEL:',12.3,115.8,377],[11,'TELEFONE RESP:',380.3,449.5,573]]},
    {bar:'ENDEREÇO', y:236.23, top:226.33},
    {y:247.5, cells:[[12,'ENDEREÇO:',13.3,61.3,573]]},
    {y:258.53, cells:[[13,'BAIRRO:',13.3,47.6,573]]},
    {y:270.53, cells:[[14,'CEP:',12.3,31.4,135],[15,'ESTADO:',138.2,174.3,300],[16,'CIDADE:',303.2,336.6,573]]},
    {y:282.53, cells:[[17,'TELEFONE:',12.3,57.7,573]]},
    {bar:'INFORMAÇÕES DA RE-MATRÍCULA', y:295.23, top:285.33},
    {y:306.53, cells:[[18,'CÓDIGO DA RE-MATRÍCULA:',12.3,124.8,573]]},
    {y:318.53, cells:[[19,'DATA DO CADASTRO:',12.3,99,285],[20,'HORA DE CADASTRO:',288.2,375.4,573]]},
    {y:330.17, cells:[[6,'COMPOSIÇÃO DE ENSINO:',12.3,116.7,378],[3,'SÉRIE ATUAL:',381.3,437.3,573]]},
    {y:341.93, cells:[[21,'DATA:',12.3,37.2,573]]}
  ];
  function element(kind, attrs, value) {
    const node = document.createElementNS(NS,kind);
    for (const [key,v] of Object.entries(attrs)) node.setAttribute(key,v);
    if (value !== undefined) node.textContent = value;
    svg.append(node);
    return node;
  }
  function label(x,y,value,attrs={}) { return element('text',{x,y,...attrs},value); }
  function rect(x,y,width,height,fill) { element('rect',{x,y,width,height,fill}); }
  function wrap(value,width) {
    const text = value.replace(/\s+/gu,' ').trim();
    if (!text || measure.measureText(text).width <= width) return [text];
    const lines = [];
    let line = '';
    for (const word of text.split(' ')) {
      const next = line ? line + ' ' + word : word;
      if (measure.measureText(next).width <= width) { line = next; continue; }
      if (line) { lines.push(line); line = ''; }
      for (const character of word) {
        if (line && measure.measureText(line + character).width > width) {
          lines.push(line); line = '';
        }
        line += character;
      }
    }
    lines.push(line);
    return lines;
  }
  function renderReceipt(values) {
    svg.replaceChildren();
    measure.font = '8px Arial';
    label(210.43,29.6,'PREFEITURA MUNICIPAL DE FORMOSA',{textLength:153.52,lengthAdjust:'spacingAndGlyphs'});
    element('image',{href:'assets/logo.png',x:12,y:45,width:78.845,height:20.25});
    label(218.03,71.1,'COMPROVANTE DE RE-MATRÍCULA',{textLength:139.14,lengthAdjust:'spacingAndGlyphs'});
    const header = 'CÓDIGO DA RE-MATRÍCULA' + (values[18] ? ' ' + values[18].replace(/\s+/gu,' ') : '');
    const head = label(287.65,107.6,header,{'text-anchor':'middle'});
    if (head.getComputedTextLength() > 560) {
      head.setAttribute('textLength','560'); head.setAttribute('lengthAdjust','spacingAndGlyphs');
    }
    let extra = 0;
    for (const row of template) {
      if (row.bar) {
        rect(11,row.top+extra+0.5,564.6,12.5,'#e9e9e9');
        rect(10.5,row.top+extra,565.6,0.5,'#000');
        rect(10.5,row.top+extra+13,565.6,0.5,'#000');
        label(12.3,row.y+extra,row.bar);
      } else {
        let count = 1;
        for (const [key,caption,x,end,right] of row.cells) {
          label(x,row.y+extra,caption,{textLength:end-x,lengthAdjust:'spacingAndGlyphs'});
          const start = end + 2.25;
          const lines = wrap(values[key] || '',right-start);
          lines.forEach((line,i) => label(start,row.y+extra+i*10,line,{'font-weight':'normal','data-value':key}));
          count = Math.max(count,lines.length);
        }
        extra += (count-1)*10;
      }
    }
    rect(10.5,153.33,0.5,191.42+extra,'black');
    rect(575.6,153.33,0.5,191.42+extra,'black');
    rect(10.5,343.75+extra,565.6,1,'black');
    rect(171,405.49+extra,259,1,'black');
    label(252.95,419.1+extra,'Assinatura do responsável',{'font-weight':'normal'});
    rect(10.75,790.86,565,1,'black');
    label(541.2,802,'Pag.: 1 / 1',{'font-weight':'normal','font-size':7});
    label(440.68,813.9,'PREFEITURA MUNICIPAL DE FORMOSA',{'font-weight':'normal','font-size':7});
    return 419.1+extra < 783;
  }
  Secretaria.renderReceipt = renderReceipt;
})();
