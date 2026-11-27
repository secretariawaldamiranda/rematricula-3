'use strict';
(() => {
  // O caminho distingue repositórios Pages que compartilham a mesma origem.
  const name = 'rematricula-walda-v1-' + new URL('.', location.href).pathname;
  const table = 'sessao';
  function open() {
    return new Promise((resolve,reject) => {
      if (!window.indexedDB) return reject(Error('Armazenamento indisponível neste navegador.'));
      const request = indexedDB.open(name,1);
      request.onupgradeneeded = () => request.result.createObjectStore(table);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(Error('O navegador bloqueou o armazenamento local.'));
    });
  }
  async function run(mode, action) {
    const db = await open();
    try {
      return await new Promise((resolve,reject) => {
        const tx = db.transaction(table,mode);
        const store = tx.objectStore(table);
        let value, failure;
        tx.oncomplete = () => resolve(value);
        tx.onabort = () => reject(failure || Error('O navegador não concluiu a gravação local. Confira o espaço e as permissões.'));
        const request = store.get('base');
        request.onsuccess = () => {
          try { value = action(store,request.result); }
          catch (error) { failure = error; tx.abort(); }
        };
      });
    } finally { db.close(); }
  }
  const storage = {
    read: () => run('readonly', (_, saved) => saved),
    write: (payload, expected) => run('readwrite', (store,saved) => {
      if ((saved?.revision ?? null) !== expected) throw Error('A base gravada mudou em outra aba. Exporte a sessão atual antes de recarregar a página.');
      const revision = crypto.randomUUID ? crypto.randomUUID() : Date.now() + '-' + Math.random();
      store.put({...payload,revision},'base');
      return revision;
    }),
    clear: expected => run('readwrite',(store,saved) => {
      if (expected !== undefined && saved?.revision !== expected) {
        throw Error('Outra aba alterou a cópia persistente. Recarregue a base antes de desativar o armazenamento.');
      }
      store.clear();
    })
  };
  Secretaria.storage = storage;
})();
