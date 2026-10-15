// Run before the page paints.
try {
  const saved = localStorage.getItem('hx-lang');
  document.documentElement.lang = saved === 'es' || saved === 'en' ? saved : navigator.language.toLowerCase().startsWith('es') ? 'es' : 'en';
} catch { document.documentElement.lang = 'es'; }
