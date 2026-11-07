export const THEME_KEY = 'beacon-theme';

// Runs inline in <head> before first paint so there is no flash of the wrong theme.
export const themeScript = `(function(){var t;try{t=localStorage.getItem('${THEME_KEY}')}catch(e){}if(t!=='light'&&t!=='dark')t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.classList.toggle('dark',t==='dark')})()`;
