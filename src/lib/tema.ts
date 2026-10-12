/** Where the chosen theme is saved in the browser. */
export const CHAVE_TEMA = "tema";

/**
 * Runs before the first paint (inlined in <head>), so a saved theme never flashes the other one.
 * Kept tiny and dependency free on purpose.
 */
export const SCRIPT_TEMA = `try{var t=localStorage.getItem("${CHAVE_TEMA}");if(t==="claro"||t==="escuro")document.documentElement.dataset.theme=t==="claro"?"light":"dark"}catch(e){}`;
