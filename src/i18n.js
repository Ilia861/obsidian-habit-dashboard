function createI18n(requested,catalogs,fallback='ru'){
 const candidate=typeof requested==='string'?requested.trim().toLowerCase():requested;
 const supported=typeof candidate==='string'&&Object.hasOwn(catalogs,candidate);
 const language=supported?candidate:fallback;
 function t(key,params={}){
  const value=catalogs[language]?.[key];
  if(Array.isArray(value))return value.slice();
  if(typeof value!=='string')throw new Error('Missing translation: '+language+'.'+key);
  return value.replace(/\{([A-Za-z_]\w*)\}/g,(match,name)=>Object.hasOwn(params,name)?String(params[name]):match);
 }
 const warning=requested!=null&&!supported?t('unsupportedLanguage',{language:typeof requested==='string'?requested:JSON.stringify(requested),fallback:language}):null;
 return {language,locale:language==='en'?'en-US':'ru-RU',t,warning};
}
