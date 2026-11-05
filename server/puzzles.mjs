/** Third-party interoperability adapter. https://marcconrad.com/uob/fish/doc.php */
export async function fetchPuzzle() {
  const r=await fetch('https://marcconrad.com/uob/fish/api.php?out=json&base64=yes',{signal:AbortSignal.timeout(12000)});
  if(!r.ok)throw new Error('The Fish Game API is unavailable. Please retry.');
  const d=await r.json();
  if(!Number.isInteger(d.fish)||!Number.isInteger(d.chest)||d.fish<0||d.chest<0||d.fish>99||d.chest>99||typeof d.question!=='string'||d.question.length>3000000||!d.question.startsWith('iVBORw0KGgo'))throw new Error('Invalid puzzle response. Please retry.');
  return {imageUrl:'data:image/png;base64,'+d.question.replace(/\s/g,''),fish:d.fish,chests:d.chest};
}
