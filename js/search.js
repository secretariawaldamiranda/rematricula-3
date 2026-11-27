'use strict';
(() => {
  const {normalize, blank} = Secretaria;
  const cadastral = [0,1,2,3,5,6,7,10,11,12,13,14,15,16,17];
  function incomplete(v) {
    return cadastral.some(i => blank(v[i])) || (blank(v[8]) && blank(v[9]));
  }
  function statistics(rows) {
    const names = new Map(), numbers = new Map();
    for (const {values:v} of rows) {
      for (const [key, map] of [[normalize(v[0]), names], [normalize(v[1]), numbers]]) {
        if (key) map.set(key, (map.get(key) || 0) + 1);
      }
    }
    const inactive = rows.filter(r => !blank(r.values[24])).length;
    return [rows.length, rows.length - inactive, inactive, rows.filter(r => blank(r.values[1])).length,
      rows.filter(({values:v}) => names.get(normalize(v[0])) > 1 || numbers.get(normalize(v[1])) > 1).length,
      rows.filter(r => incomplete(r.values)).length];
  }
  function findRows(rows, query, criteria, showInactive) {
    const term = normalize(query);
    return rows.filter(({values:v}) =>
      (showInactive || blank(v[24])) &&
      criteria.every(([i,value]) => value === '' || v[i] === value) &&
      (!term || normalize(v[0]).includes(term) || normalize(v[1]).includes(term)));
  }
  Object.assign(Secretaria,{incomplete,statistics,findRows});
})();
