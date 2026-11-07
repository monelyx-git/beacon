export const THEME_KEY = 'beacon-theme';
export const SIDEBAR_KEY = 'beacon-sidebar';

// Runs inline in <head> before first paint so there is no flash of the wrong theme or sidebar state.
export const themeScript = `(function(){var t,s,c=document.documentElement.classList;try{t=localStorage.getItem('${THEME_KEY}');s=localStorage.getItem('${SIDEBAR_KEY}')}catch(e){}if(t!=='light'&&t!=='dark')t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';c.toggle('dark',t==='dark');c.toggle('sidebar-hidden',s==='hidden')})()`;
