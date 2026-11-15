const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
function validate(provided){
 const catalogs=provided??Object.fromEntries(['ru','en'].map(lang=>[lang,JSON.parse(fs.readFileSync(path.join(root,'locales',lang+'.json'),'utf8'))]));
 const keys=Object.keys(catalogs.ru).sort();
 if(JSON.stringify(keys)!==JSON.stringify(Object.keys(catalogs.en).sort()))throw Error('Translation keys differ between ru and en');
 const placeholders=value=>[...new Set(String(value).match(/\{[A-Za-z_]\w*\}/g)||[])].sort().join('|');
 for(const key of keys){
  const ru=catalogs.ru[key],en=catalogs.en[key];
  if(typeof ru==='string'&&typeof en==='string'){
   if(!ru.trim()||!en.trim()||placeholders(ru)!==placeholders(en))throw Error('Invalid translation or placeholders: '+key);
  }else if(Array.isArray(ru)&&Array.isArray(en)){
   if(!ru.length||ru.length!==en.length||[...ru,...en].some(x=>typeof x!=='string'||!x.trim()))throw Error('Invalid translated array: '+key);
  }else throw Error('Translation type differs: '+key);
  if(/[А-Яа-яЁё]/.test(JSON.stringify(en)))throw Error('Russian text in English catalog: '+key);
 }
 for(const file of ['core.js','editor.js','view.js']){
  const source=fs.readFileSync(path.join(root,'src',file),'utf8');
  for(const match of source.matchAll(/\bt\('([^']+)'/g))if(!keys.includes(match[1]))throw Error('Missing key '+match[1]+' in '+file);
 }
 return catalogs;
}
module.exports={validate};
if(require.main===module){const catalogs=validate();console.log('Validated '+Object.keys(catalogs.ru).length+' keys in ru/en');}
