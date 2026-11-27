'use strict';
window.Secretaria = window.Secretaria || {};
(() => {
  const headers = [
    'Nome do aluno', 'Matrícula', 'Data de nascimento', 'Série atual', 'Turma',
    'Unidade de ensino', 'Composição de ensino', 'Nome da mãe', 'Telefone da mãe',
    'Celular da mãe', 'Nome do responsável', 'Telefone do responsável', 'Endereço',
    'Bairro', 'CEP', 'Estado', 'Cidade', 'Telefone residencial', 'Código da rematrícula',
    'Data do cadastro', 'Hora do cadastro', 'Data do comprovante', 'Situação no livro',
    'Data da matrícula', 'Data de desativação', 'Cruzamento dos relatórios'
  ];
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
  const blank = value => !value.trim();
  async function readFile(file) {
    const bytes = await file.arrayBuffer();
    let text;
    try {
      text = new TextDecoder('utf-8', {fatal:true}).decode(bytes);
    } catch {
      text = new TextDecoder('windows-1252').decode(bytes);
    }
    if (text.includes('\u0000')) throw Error('Codificação incompatível. Salve o CSV em UTF-8 com BOM.');
    const parsed = Papa.parse(text, {delimiter:';', skipEmptyLines:true, dynamicTyping:false});
    if (parsed.errors.length) {
      const error = parsed.errors[0];
      throw Error('CSV inválido. Confira as aspas e os separadores no registro ' + ((error.row ?? 0) + 1) + '.');
    }
    const [first, ...rows] = parsed.data;
    const labels = (first || []).map(normalize);
    const order = headers.map(label => labels.indexOf(normalize(label)));
    if (labels.length !== headers.length || order.includes(-1)) {
      const missing = headers.filter((_, index) => order[index] === -1);
      throw Error('O CSV precisa conter os 26 cabeçalhos únicos e usar ponto e vírgula.' +
        (missing.length ? ' Colunas ausentes: ' + missing.join(', ') + '.' : ' Confira se há colunas adicionais.'));
    }
    if (!rows.length) throw Error('O arquivo contém apenas cabeçalhos. Selecione uma base com registros.');
    return rows.map((cells, index) => {
      if (cells.length !== headers.length) throw Error('O registro ' + (index + 1) + ' contém ' + cells.length + ' colunas. Eram esperadas 26.');
      const values = order.map(i => cells[i]);
      return {id:index + 1, original:values.slice(), values};
    });
  }
  function csvBlob(rows) {
    // Uma célula entre aspas ainda pode ser interpretada como fórmula pelo Excel.
    const formula = /^(?:[\t\r\n]|[\s\uFEFF]*[=+@\-＝＋＠－])/u;
    const body = Papa.unparse([headers, ...rows.map(row => row.values)], {
      delimiter:';', newline:'\r\n', escapeFormulae:formula
    });
    return new Blob(['\uFEFF', body, '\r\n'], {type:'text/csv;charset=utf-8'});
  }
  Object.assign(Secretaria, {headers, normalize, blank, readFile, csvBlob});
})();
