const $ = s => document.querySelector(s);
const state = {countries:[],taxonomy:[],imports:[],proposals:[],selected:null};

async function loadJSON(path, fallback=null){
  try{const r=await fetch(path,{cache:'no-store'});if(!r.ok)throw new Error(path);return await r.json()}
  catch(e){if(fallback!==null)return fallback;throw e}
}
function fmtDate(v){return v||'미점검'}
function ageKey(v){return v?new Date(v).getTime():0}
function statusRank(s){return {PENDING:0,REVIEW:1,NEEDS_IMPORT:2,OLD:3,VERIFIED:4}[s]??9}
function toast(t){const el=$('#toast');el.textContent=t;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),1800)}
async function copyText(t){try{await navigator.clipboard.writeText(t);toast('명령어를 복사했습니다.')}catch{toast(t)}}

function importedMap(){return new Map(state.imports.map(x=>[x.item_id,x]))}
function buildCountryItems(code){
  const map=importedMap();
  return state.taxonomy.map(t=>{
    const id=`${code}-${t.code}`;
    return map.get(id)||{
      item_id:id,country:code,category:t.category,item_name:t.item_name,
      current_value:'',data_as_of:null,last_verified:null,status:'NEEDS_IMPORT',
      current_source:'',source_date:null,notes:''
    };
  });
}
function getPending(code){return state.proposals.filter(x=>x.country===code&&x.status==='PENDING')}
function getOldestItems(code,n=5){
  const pendingIds=new Set(getPending(code).map(p=>p.item_id));
  return buildCountryItems(code)
    .filter(x=>!pendingIds.has(x.item_id))
    .sort((a,b)=>ageKey(a.last_verified)-ageKey(b.last_verified)||statusRank(a.status)-statusRank(b.status)||a.item_id.localeCompare(b.item_id))
    .slice(0,n);
}

function renderSummary(){
  const enabled=state.countries.filter(c=>c.enabled);
  const all=enabled.flatMap(c=>buildCountryItems(c.code));
  const pending=state.proposals.filter(p=>p.status==='PENDING').length;
  const needs=all.filter(i=>['OLD','NEEDS_IMPORT','REVIEW'].includes(i.status)).length;
  const verified=all.filter(i=>i.status==='VERIFIED').length;
  $('#summary').innerHTML=[
    ['대상 국가',enabled.length+'개'],['관리 항목',all.length+'개'],['갱신/Import 필요',needs+'개'],['검토 대기',pending+'개'],['최신 검증 완료',verified+'개']
  ].map(([k,v])=>`<div class="metric"><span>${k}</span><strong>${v}</strong></div>`).join('');
}
function nextCountry(){
  return state.countries.filter(c=>c.enabled)
    .sort((a,b)=>ageKey(a.last_country_check)-ageKey(b.last_country_check)||a.name_ko.localeCompare(b.name_ko,'ko'))[0];
}
function renderNext(){
  const c=nextCountry();
  if(!c){$('#nextTarget').innerHTML='<div class="empty">대상 국가가 없습니다.</div>';return}
  const items=getOldestItems(c.code,5);
  $('#nextTarget').innerHTML=`
    <div class="next-country"><span>NEXT COUNTRY</span><strong>${c.name_ko}</strong><span>마지막 점검: ${fmtDate(c.last_country_check)}</span></div>
    <div><div class="target-items">${items.map((x,i)=>`<span class="target-chip">${i+1}. ${x.item_name}</span>`).join('')}</div>
    <p class="hint">현재값 미수집 항목은 먼저 OCIS 기존 문구를 Import한 뒤 최신자료와 비교합니다.</p></div>`;
}
function renderCountries(){
  const region=$('#regionFilter').value,q=$('#countrySearch').value.trim().toLowerCase();
  const list=state.countries.filter(c=>c.enabled&&(region==='ALL'||c.region===region)&&(!q||c.name_ko.toLowerCase().includes(q)||c.name_en.toLowerCase().includes(q)||c.code.toLowerCase().includes(q)));
  $('#countryGrid').innerHTML=list.map(c=>{
    const items=buildCountryItems(c.code),needs=items.filter(i=>['OLD','NEEDS_IMPORT','REVIEW'].includes(i.status)).length,pending=getPending(c.code).length;
    return `<button class="country-card ${state.selected===c.code?'active':''}" data-code="${c.code}">
      <span class="region">${c.region}</span><h3>${c.name_ko}</h3><small>${c.name_en}</small>
      <div class="card-stat"><span>마지막 점검</span><b>${fmtDate(c.last_country_check)}</b></div>
      <div class="card-stat"><span>갱신/Import 필요</span><b>${needs}</b></div>
      <div class="card-stat"><span>제안 대기</span><b>${pending}</b></div></button>`
  }).join('')||'<div class="empty">검색 결과가 없습니다.</div>';
  document.querySelectorAll('.country-card').forEach(b=>b.onclick=()=>{state.selected=b.dataset.code;renderCountries();renderDetail();});
}
function renderDetail(){
  const c=state.countries.find(x=>x.code===state.selected);
  if(!c){$('#detailTitle').textContent='국가 상세';$('#detailSub').textContent='국가를 선택하세요.';$('#itemTable').innerHTML='<tr><td colspan="6"><div class="empty">표시할 국가를 선택하세요.</div></td></tr>';return}
  const items=buildCountryItems(c.code).sort((a,b)=>ageKey(a.last_verified)-ageKey(b.last_verified)||statusRank(a.status)-statusRank(b.status));
  $('#detailTitle').textContent=c.name_ko;
  $('#detailSub').textContent=`${c.region} · 오래된 순 정렬 · 다음 조사 대상 5개 자동 선정`;
  $('#itemTable').innerHTML=items.map(x=>`<tr>
    <td><span class="status ${x.status}">${x.status}</span></td><td>${x.category}</td><td><b>${x.item_name}</b></td>
    <td>${x.current_value||'<span style="color:#7c3aed">OCIS 기존값 Import 필요</span>'}</td>
    <td>${x.data_as_of||'-'}</td><td>${fmtDate(x.last_verified)}</td></tr>`).join('');
}
function renderProposals(){
  const ps=[...state.proposals].reverse();
  $('#proposalList').innerHTML=ps.length?ps.map(p=>`<article class="proposal"><div class="proposal-top"><h3>${p.country_name||p.country} · ${p.item_name||p.item_id} · ${p.decision}</h3><span class="status ${p.status==='PENDING'?'PENDING':p.status==='REVIEW'?'REVIEW':'VERIFIED'}">${p.status}</span></div><p>${p.proposed_value||p.note||'제안 내용 없음'}</p>${p.source_url?`<p><a href="${p.source_url}" target="_blank" rel="noreferrer">출처 원문 ↗</a></p>`:''}</article>`).join(''):'<div class="empty">아직 저장된 업데이트 제안이 없습니다. ChatGPT에서 “국별환경 업데이트 실행”을 요청하면 여기에 누적됩니다.</div>';
}
async function init(){
  try{
    const [s,t,i,p]=await Promise.all([
      loadJSON('data/state.json'),loadJSON('config/taxonomy.json'),loadJSON('data/items.json',{items:[]}),loadJSON('data/proposals.json',{proposals:[]})
    ]);
    state.countries=s.countries||[];state.taxonomy=t.items||[];state.imports=i.items||[];state.proposals=p.proposals||[];
    state.selected=nextCountry()?.code||null;
    renderSummary();renderNext();renderCountries();renderDetail();renderProposals();
  }catch(e){document.body.innerHTML='<main class="wrap"><div class="panel"><h2>데이터를 불러오지 못했습니다.</h2><p>GitHub Pages 또는 로컬 웹서버에서 열어주세요.</p></div></main>'}
}
$('#regionFilter').addEventListener('change',renderCountries);
$('#countrySearch').addEventListener('input',renderCountries);
$('#copyRun').onclick=()=>copyText('Country-info 저장소 기준으로 국별환경 업데이트 실행');
$('#copyPending').onclick=()=>copyText('Country-info 저장소 기준으로 미반영 업데이트 보여줘');
init();
