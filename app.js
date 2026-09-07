const $ = s => document.querySelector(s);
const state = {countries:[],updates:[],selected:null,snapshotAt:null};

async function loadJSON(path, fallback=null){
  try{const r=await fetch(path,{cache:'no-store'});if(!r.ok)throw new Error(path);return await r.json()}
  catch(e){if(fallback!==null)return fallback;throw e}
}
function ageKey(v){return v?new Date(v).getTime():Number.POSITIVE_INFINITY}
function fmtDate(v){return v||'날짜 미확인'}
function toast(t){const el=$('#toast');el.textContent=t;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),1800)}
async function copyText(t){try{await navigator.clipboard.writeText(t);toast('명령어를 복사했습니다.')}catch{toast(t)}}
function countryItems(code){return state.updates.filter(x=>x.country_code===code)}
function rankedCountryItems(code){return countryItems(code).filter(x=>x.ocis_updated_at).sort((a,b)=>ageKey(a.ocis_updated_at)-ageKey(b.ocis_updated_at)||String(a.title).localeCompare(String(b.title),'ko'))}
function unknownCountryItems(code){return countryItems(code).filter(x=>!x.ocis_updated_at)}
function oldestDate(code){return rankedCountryItems(code)[0]?.ocis_updated_at||null}
function nextCountry(){
  return state.countries.filter(c=>c.enabled&&oldestDate(c.code))
    .sort((a,b)=>ageKey(oldestDate(a.code))-ageKey(oldestDate(b.code))||a.name_ko.localeCompare(b.name_ko,'ko'))[0]||null;
}
function renderSummary(){
  const enabled=state.countries.filter(c=>c.enabled);
  const dated=state.updates.filter(x=>x.ocis_updated_at);
  const unknown=state.updates.length-dated.length;
  const covered=new Set(state.updates.map(x=>x.country_code)).size;
  $('#summary').innerHTML=[
    ['대상 국가',enabled.length+'개'],
    ['수정일 확보 국가',covered+'개'],
    ['수정일 확보 항목',dated.length+'개'],
    ['날짜 미확인',unknown+'개']
  ].map(([k,v])=>`<div class="metric"><span>${k}</span><strong>${v}</strong></div>`).join('');
}
function renderNext(){
  const c=nextCountry();
  if(!c){
    $('#nextTarget').innerHTML='<div class="empty">아직 OCIS 수정일 메타데이터가 없습니다. data/updates.json에 메타데이터가 들어오면 자동 추천됩니다.</div>';
    return;
  }
  const items=rankedCountryItems(c.code).slice(0,5);
  $('#nextTarget').innerHTML=`
    <div class="next-country"><span>NEXT COUNTRY</span><strong>${c.name_ko}</strong><span>가장 오래된 수정일: ${fmtDate(oldestDate(c.code))}</span></div>
    <div><div class="target-items">${items.map((x,i)=>`<span class="target-chip">${i+1}. ${x.title} · ${fmtDate(x.ocis_updated_at)}</span>`).join('')}</div>
    <p class="hint">추천은 OCIS 수정일만 사용합니다.</p></div>`;
}
function renderCountries(){
  const region=$('#regionFilter').value,q=$('#countrySearch').value.trim().toLowerCase();
  const list=state.countries.filter(c=>c.enabled&&(region==='ALL'||c.region===region)&&(!q||c.name_ko.toLowerCase().includes(q)||c.name_en.toLowerCase().includes(q)||c.code.toLowerCase().includes(q)));
  $('#countryGrid').innerHTML=list.map(c=>{
    const total=countryItems(c.code).length, known=rankedCountryItems(c.code).length, unknown=unknownCountryItems(c.code).length;
    return `<button class="country-card ${state.selected===c.code?'active':''}" data-code="${c.code}">
      <span class="region">${c.region}</span><h3>${c.name_ko}</h3><small>${c.name_en}</small>
      <div class="card-stat"><span>가장 오래된 수정일</span><b>${oldestDate(c.code)||'-'}</b></div>
      <div class="card-stat"><span>확보 항목</span><b>${known}/${total||0}</b></div>
      <div class="card-stat"><span>날짜 미확인</span><b>${unknown}</b></div>
    </button>`;
  }).join('')||'<div class="empty">검색 결과가 없습니다.</div>';
  document.querySelectorAll('.country-card').forEach(b=>b.onclick=()=>{state.selected=b.dataset.code;renderCountries();renderDetail();});
}
function renderDetail(){
  const c=state.countries.find(x=>x.code===state.selected);
  if(!c){$('#detailTitle').textContent='국가 상세';$('#detailSub').textContent='국가를 선택하세요.';$('#itemTable').innerHTML='<tr><td colspan="4"><div class="empty">표시할 국가를 선택하세요.</div></td></tr>';return}
  const ranked=rankedCountryItems(c.code), unknown=unknownCountryItems(c.code);
  $('#detailTitle').textContent=c.name_ko;
  $('#detailSub').textContent=`${c.region} · OCIS 수정일 오래된 순 · 상위 5개가 우선 추천 대상`;
  const datedRows=ranked.map((x,i)=>`<tr class="${i<5?'priority-row':''}"><td>${i+1}</td><td><b>${x.title||'-'}</b></td><td>${fmtDate(x.ocis_updated_at)}</td><td>${x.page_url?`<a href="${x.page_url}" target="_blank" rel="noreferrer">열기 ↗</a>`:'-'}</td></tr>`).join('');
  const unknownRows=unknown.map(x=>`<tr><td>-</td><td>${x.title||'-'}</td><td>날짜 미확인</td><td>${x.page_url?`<a href="${x.page_url}" target="_blank" rel="noreferrer">열기 ↗</a>`:'-'}</td></tr>`).join('');
  $('#itemTable').innerHTML=(datedRows+unknownRows)||'<tr><td colspan="4"><div class="empty">아직 이 국가의 수정일 메타데이터가 없습니다.</div></td></tr>';
}
async function init(){
  try{
    const [s,u]=await Promise.all([loadJSON('data/state.json'),loadJSON('data/updates.json',{items:[]})]);
    state.countries=s.countries||[];state.updates=u.items||[];state.snapshotAt=u.snapshot_at||null;
    state.selected=nextCountry()?.code||state.countries.find(c=>c.enabled)?.code||null;
    renderSummary();renderNext();renderCountries();renderDetail();
  }catch(e){document.body.innerHTML='<main class="wrap"><div class="panel"><h2>데이터를 불러오지 못했습니다.</h2><p>GitHub Pages 또는 로컬 웹서버에서 열어주세요.</p></div></main>'}
}
$('#regionFilter').addEventListener('change',renderCountries);
$('#countrySearch').addEventListener('input',renderCountries);
$('#copyRun').onclick=()=>copyText('Country-info 저장소 기준으로 국별환경 갱신 후보 5개 추천해줘');
init();
