const stages = ['Saved', 'Applied', 'Interviewing', 'Closed'];
const tracks = ['UEFN / Verse', 'Unity C#', 'Other'];
const fields = {
  company:'Company', position:'Position', location:'Location / remote policy',
  track:'Technology focus', status:'Status', posted:'Posting date', link:'Application link',
  requirements:'Key requirements', fit:'Fit notes', resume:'Résumé version used',
  follow:'Follow-up date', closes:'Closing date', availability:'Listing availability', notes:'Notes'
};
const samples = [
  ['Pineforge Games','UEFN Gameplay Developer','Remote',0,0],
  ['Moonlit Arcade','Unity Engineer','Hybrid',1,0],
  ['Signal Forge','Technical Designer','Remote',0,1],
  ['Orbit Lantern','Gameplay Programmer','On-site',1,2]
].map(([company,position,location,track,status],i)=>({id:'example-'+i,company,position,location,track:tracks[track],status:stages[status],availability:'Unknown'}));
const key='questlog.portfolio.v1';
const $=id=>document.getElementById(id);
let data;
try {data=JSON.parse(localStorage.getItem(key))??samples}
catch {data=samples;$('notice').textContent='Browser storage could not be read.'}
const selected=new Set();
let editing;
const dialog=document.querySelector('dialog');
const form=dialog.querySelector('form');
function node(tag, text, parent) {
  const el=document.createElement(tag);
  if(text!=null) el.textContent=text;
  if(parent) parent.append(el);
  return el;
}
function expired(role) {
  return role.availability==='Expired'||Boolean(role.closes&&new Date(role.closes+'T23:59:59.999')<new Date());
}
function value(role,field) {
  return field==='availability'&&expired(role)?'Expired':role[field]||'Unknown';
}
function table(head,lines) {
  const wrapper=node('div',null,$('output'));wrapper.className='scroll';
  const t=node('table',null,wrapper);
  const header=node('tr',null,node('thead',null,t));
  head.forEach(h=>node('th',h,header));
  const body=node('tbody',null,t);
  for(const cells of lines){
    const tr=node('tr',null,body);
    for(const cell of cells){
      const td=node('td',null,tr);
      if(cell instanceof Node) td.append(cell); else td.textContent=cell;
    }
  }
}
function render(){
  const roles=data.filter(r=>($('focus').value==='All roles'||r.track===$('focus').value)&&(!$('hide').checked||!expired(r)));
  const out=$('output');out.replaceChildren();
  if($('view').value==='Table'){
    table(Object.values(fields),roles.map(r=>Object.keys(fields).map(k=>{
      if(k==='company'){const b=node('button',r.company);b.onclick=()=>edit(r);return b}
      if(k==='link'&&/^https?:\/\//i.test(r.link)){const a=node('a','Open listing ↗');a.href=r.link;a.target='_blank';a.rel='noopener';return a}
      return value(r,k);
    })));
    if(!roles.length)node('p','No matching roles.',out);
  } else if($('view').value==='Compare'){
    node('p','Choose up to three roles to compare.',out);
    const choices=node('div',null,out);choices.className='choices';
    const comparing=roles.filter(r=>selected.has(r.id));
    for(const role of roles){
      const l=node('label',null,choices),c=node('input',null,l);c.type='checkbox';c.checked=selected.has(role.id);c.disabled=!c.checked&&comparing.length>=3;
      l.append(' '+role.position+' · '+role.company);
      c.onchange=()=>{if(c.checked)selected.add(role.id);else selected.delete(role.id);render()};
    }
    if(comparing.length)table(['Details',...comparing.map(r=>r.position)],Object.keys(fields).map(k=>[fields[k],...comparing.map(r=>value(r,k))]));
  } else {
    const board=node('div',null,out);board.className='board';
    for(const stage of stages){
      const lane=node('section',null,board);lane.className='lane';
      const group=roles.filter(r=>r.status===stage);
      node('h3',stage+' · '+group.length,lane);
      for(const role of group){
        const card=node('button',null,lane);card.className='card';card.onclick=()=>edit(role);
        node('small',role.company,card);node('strong',role.position,card);node('small',role.location||'Location unknown',card);
        node('span',role.track,card).className='tag';if(expired(role))node('small','Expired',card);
      }
    }
  }
}
function edit(role={}){
  editing=role.id;$('error').textContent='';$('fields').replaceChildren();
  for(const [k,title] of Object.entries(fields)){
    const l=node('label',title,$('fields'));
    const options={status:stages,track:tracks,availability:['Unknown','Open','Expired']}[k];
    const input=node(options?'select':['fit','notes','requirements'].includes(k)?'textarea':'input',null,l);
    if(options) options.forEach(o=>node('option',o,input));
    else if(input.tagName==='INPUT')input.type=['posted','follow','closes'].includes(k)?'date':k==='link'?'url':'text';
    input.name=k;input.required=['company','position'].includes(k);input.value=role[k]??(k==='track'?'Other':options?.[0]??'');
  }
  dialog.showModal();
}
function normalizedLink(link){
  if(!link)return '';
  const u=new URL(link);if(!['http:','https:'].includes(u.protocol))throw Error('Use an HTTP or HTTPS link.');
  u.hash='';for(const k of [...u.searchParams.keys()])if(/^utm_|^ref$|^source$/i.test(k))u.searchParams.delete(k);
  u.searchParams.sort();return u.href.replace(/\/$/,'');
}
const identity=r=>[r.company,r.position,r.location].map(v=>(v||'').trim().toLowerCase().replace(/\s+/g,' ')).join('|');
form.onsubmit=e=>{
  e.preventDefault();
  const role=Object.fromEntries([...new FormData(form)].map(([k,v])=>[k,v.trim()]));
  if(!role.company||!role.position){$('error').textContent='Enter a company and position.';return}
  try{
    const link=normalizedLink(role.link);
    if(data.some(r=>r.id!==editing&&(identity(r)===identity(role)||(link&&normalizedLink(r.link)===link))))throw Error('This listing is already on your board.');
    role.id=editing||crypto.randomUUID();
    const next=[role,...data.filter(r=>r.id!==role.id)];
    localStorage.setItem(key,JSON.stringify(next));data=next;dialog.close();render();$('notice').textContent='Role saved.';
  }catch(e){$('error').textContent=e.message}
};
$('add').onclick=()=>edit();$('cancel').onclick=()=>dialog.close();
for(const id of ['view','focus','hide'])$(id).onchange=()=>{selected.clear();render()};
render();
