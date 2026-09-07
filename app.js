const $ = s => document.querySelector(s);
const state = {countries:[],updates:[],selected:null,snapshotAt:null,structure:{common:null,countries:{}}};

async function loadJSON(path, fallback=null){
  try{const r=await fetch(path,{cache:'no-store'});if(!r.ok)throw new Error(path);return await r.json()}
  catch(e){if(fallback!==null)return fallback;throw e}
}
function ageKey(v){return v?new Date(v).getTime():Number.POSITIVE_INFINITY}
function fmtDate(v){return v||'날짜 미확인'}
function toast(t){const el=$('#toast');el.textContent=t;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),1800)}
async function copyText(t){try{await navigator.clipboard.writeText(t);toast('명령어를 복사했습니다.')}catch{toast(t)}}
function structureFor(code){return state.structure?.countries?.[code]||state.structure?.common||null}
function classifyItem(item){
  const s=structureFor(item.country_code);
  if(!s||!s.verified)return {status:'unknown',merged_into:null};
  const active=new Set(s.active_titles||[]), retired=new Set(s.retired_titles||[]), merged=s.merged_map||{};
  if(active.has(item.title))return {status:'active',merged_into:null};
  if(Object.prototype.hasOwnProperty.call(merged,item.title))return {status:'merged',merged_into:merged[item.title]};
  if(retired.has(item.title))return {status:'retired',merged_into:null};
  return {status:'unknown',merged_into:null};
}
function countryItems(code){return state.updates.filter(x=>x.country_code===code)}
function activeCountryItems(code){return countryItems(code).filter(x=>classifyItem(x).status==='active')}
function rankedCountryItems(code){return activeCountryItems(code).filter(x=>x.ocis_updated_at).sort((a,b)=>ageKey(a.ocis_updated_at)-ageKey(b.ocis_updated_at)||String(a.title).localeCompare(String(b.title),'ko'))}
function unknownCountryItems(code){return countryItems(code).filter(x=>classifyItem(x).status==='unknown')}
function mergedCountryItems(code){return countryItems(code).filter(x=>classifyItem(x).status==='merged')}
function retiredCountryItems(code){return countryItems(code).filter(x=>classifyItem(x).status==='retired')}
function oldestDate(code){return rankedCountryItems(code)[0]?.ocis_updated_at||null}
function nextCountry(){
  return state.countries.filter(c=>c.enabled&&oldestDate(c.code))
    .sort((a,b)=>ageKey(oldestDate(a.code))-ageKey(oldestDate(b.code))||a.name_ko.localeCompare(b.name_ko,'ko'))[0]||null;
}
function renderSummary(){
  const enabled=state.countries.filter(c=>c.enabled);
  const active=state.updates.filter(x=>classifyItem(x).status==='active');
  const merged=state.updates.filter(x=>classifyItem(x).status==='merged');
  const retired=state.updates.filter(x=>classifyItem(x).status==='retired');
  const unknown=state.updates.filter(x=>classifyItem(x).status==='unknown');
  $('#summary').innerHTML=[
    ['대상 국가',enabled.length+'개'],
    ['현재 운영 항목',active.length+'개'],
    ['상위항목 통합',merged.length+'개'],
    ['폐지/미확인',(retired.length+unknown.length)+'개']
  ].map(([k,v])=>`<div class="metric"><span>${k}</span><strong>${v}</strong></div>`).join('');
}
function renderNext(){
  const c=nextCountry();
  if(!c){
    $('#nextTarget').innerHTML='<div class="empty">현재 운영 구조가 확인된 추천 대상이 없습니다.</div>';
    return;
  }
  const items=rankedCountryItems(c.code).slice(0,5);
  $('#nextTarget').innerHTML=`
    <div class="next-country"><span>NEXT COUNTRY</span><strong>${c.name_ko}</strong><span>가장 오래된 현재 운영 항목: ${fmtDate(oldestDate(c.code))}</span></div>
    <div><div class="target-items">${items.map((x,i)=>`<span class="target-chip">${i+1}. ${x.title} · ${fmtDate(x.ocis_updated_at)}</span>`).join('')}</div>
    <p class="hint">공통 OCIS 현행 항목체계를 적용해 독립 운영되는 active 항목만 추천합니다.</p></div>`;
}
function renderCountries(){
  const region=$('#regionFilter').value,q=$('#countrySearch').value.trim().toLowerCase();
  const list=state.countries.filter(c=>c.enabled&&(region==='ALL'||c.region===region)&&(!q||c.name_ko.toLowerCase().includes(q)||c.name_en.toLowerCase().includes(q)||c.code.toLowerCase().includes(q)));
  $('#countryGrid').innerHTML=list.map(c=>{
    const active=activeCountryItems(c.code).length, merged=mergedCountryItems(c.code).length, retired=retiredCountryItems(c.code).length, unknown=unknownCountryItems(c.code).length;
    return `<button class="country-card ${state.selected===c.code?'active':''}" data-code="${c.code}">
      <span class="region">${c.region}</span><h3>${c.name_ko}</h3><small>${c.name_en}</small>
      <div class="card-stat"><span>가장 오래된 운영 항목</span><b>${oldestDate(c.code)||'-'}</b></div>
      <div class="card-stat"><span>운영중</span><b>${active}</b></div>
      <div class="card-stat"><span>통합</span><b>${merged}</b></div>
      <div class="card-stat"><span>폐지/미확인</span><b>${retired+unknown}</b></div>
    </button>`;
  }).join('')||'<div class="empty">검색 결과가 없습니다.</div>';
  document.querySelectorAll('.country-card').forEach(b=>b.onclick=()=>{state.selected=b.dataset.code;renderCountries();renderDetail();});
}
function statusLabel(item){
  const c=classifyItem(item);
  if(c.status==='active')return '운영중';
  if(c.status==='merged')return `통합 → ${c.merged_into}`;
  if(c.status==='retired')return '폐지';
  return '구조확인필요';
}
function renderDetail(){
  const c=state.countries.find(x=>x.code===state.selected);
  if(!c){$('#detailTitle').textContent='국가 상세';$('#detailSub').textContent='국가를 선택하세요.';$('#itemTable').innerHTML='<tr><td colspan="5"><div class="empty">표시할 국가를 선택하세요.</div></td></tr>';return}
  const ranked=rankedCountryItems(c.code), merged=mergedCountryItems(c.code), retired=retiredCountryItems(c.code), unknown=unknownCountryItems(c.code);
  $('#detailTitle').textContent=c.name_ko;
  $('#detailSub').textContent=`현행 공통 OCIS 항목체계 적용 · 현재 운영 항목은 수정일 오래된 순`;
  const activeRows=ranked.map((x,i)=>`<tr class="${i<5?'priority-row':''}"><td>${i+1}</td><td><b>${x.title||'-'}</b></td><td>운영중</td><td>${fmtDate(x.ocis_updated_at)}</td><td>${x.page_url?`<a href="${x.page_url}" target="_blank" rel="noreferrer">열기 ↗</a>`:'-'}</td></tr>`).join('');
  const otherRows=[...merged,...retired,...unknown].map(x=>`<tr><td>-</td><td>${x.title||'-'}</td><td>${statusLabel(x)}</td><td>${fmtDate(x.ocis_updated_at)}</td><td>${x.page_url?`<a href="${x.page_url}" target="_blank" rel="noreferrer">열기 ↗</a>`:'-'}</td></tr>`).join('');
  $('#itemTable').innerHTML=(activeRows+otherRows)||'<tr><td colspan="5"><div class="empty">아직 이 국가의 메타데이터가 없습니다.</div></td></tr>';
}
function expandCatalog(catalog){
  const titles=catalog.titles||[];
  return Object.entries(catalog.countries||{}).flatMap(([code,dates])=>
    titles.map((title,i)=>dates[i]==null?null:{country_code:code,title,ocis_updated_at:dates[i],page_url:null}).filter(Boolean)
  );
}
async function init(){
  try{
    const [s,catalog,structure]=await Promise.all([loadJSON('data/state.json'),loadJSON('data/catalog.json'),loadJSON('data/structure.json',{common:null,countries:{}})]);
    state.countries=s.countries||[];
    state.updates=expandCatalog(catalog);
    state.structure=structure||{common:null,countries:{}};
    state.snapshotAt=catalog.snapshot_at||null;
    state.selected=nextCountry()?.code||state.countries.find(c=>c.enabled)?.code||null;
    renderSummary();renderNext();renderCountries();renderDetail();
  }catch(e){document.body.innerHTML='<main class="wrap"><div class="panel"><h2>데이터를 불러오지 못했습니다.</h2><p>GitHub Pages 또는 로컬 웹서버에서 열어주세요.</p></div></main>'}
}
$('#regionFilter').addEventListener('change',renderCountries);
$('#countrySearch').addEventListener('input',renderCountries);
$('#copyRun').onclick=()=>copyText('Country-info 저장소 기준으로 현재 OCIS 운영 구조를 반영해 국별환경 갱신 후보 5개 추천해줘');
init();
