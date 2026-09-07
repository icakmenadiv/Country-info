(() => {
  const TARGET_COUNTRIES = new Set([
    '러시아','루마니아','영국','우크라이나','조지아','체코','폴란드','헝가리',
    '우즈베키스탄','카자흐스탄','키르기스스탄','타지키스탄','투르크메니스탄'
  ]);

  const REGION = {
    Europe: { rgnCd: '40', slug: 'europe' },
    Asia: { rgnCd: '20', slug: 'asia' }
  };

  const COUNTRY_REGION = {
    '러시아':'Europe','루마니아':'Europe','영국':'Europe','우크라이나':'Europe','조지아':'Europe','체코':'Europe','폴란드':'Europe','헝가리':'Europe',
    '우즈베키스탄':'Asia','카자흐스탄':'Asia','키르기스스탄':'Asia','타지키스탄':'Asia','투르크메니스탄':'Asia'
  };

  function assertOCIS() {
    if (!location.hostname.endsWith('ocis.go.kr')) {
      throw new Error('이 스크립트는 ocis.go.kr 페이지에서 실행해야 합니다.');
    }
  }

  async function post(path, body) {
    const res = await fetch(path, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'logging-type': '01',
        'current-view-url': location.pathname
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`${path} HTTP ${res.status}`);
    const json = await res.json();
    if (json.code && json.code !== '200') throw new Error(json.message || `${path} API error`);
    return json;
  }

  function normalizeDate(v) {
    if (!v) return null;
    const s = String(v).replace(/[^0-9]/g, '');
    if (s.length >= 8) return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
    if (s.length >= 6) return `${s.slice(0,4)}-${s.slice(4,6)}`;
    return String(v);
  }

  function downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  async function getRegionRows(regionName) {
    const cfg = REGION[regionName];
    if (!cfg) throw new Error(`Unknown region: ${regionName}`);

    // Prefer the full export API because the region list UI is paginated.
    let r = await post('/environment/api/getNationEnvironmentListExcel', { rgnCd: cfg.rgnCd });
    let rows = Array.isArray(r.data) ? r.data : [];

    // Fallback to list API if the export payload is unexpectedly empty.
    if (!rows.length) {
      r = await post('/environment/api/getNationEnvironmentList', { rgnCd: cfg.rgnCd, offset: 0, limit: 5000 });
      rows = Array.isArray(r.data) ? r.data : [];
    }

    return rows.map(x => ({
      region: regionName,
      region_code: cfg.rgnCd,
      region_slug: cfg.slug,
      ntnCd: String(x.ntnCd ?? ''),
      country: x.kornNm || x.shrtKornNm || '',
      tocCd: String(x.tocCd ?? ''),
      title: x.tocTitl || '',
      author: x.userNm || '',
      ocis_updated_at: normalizeDate(x.updtYmd),
      view_count: x.viewCnt ?? null
    })).filter(x => TARGET_COUNTRIES.has(x.country));
  }

  function cleanMainText(doc) {
    const main = doc.querySelector('#printContent') || doc.querySelector('main.content') || doc.querySelector('main');
    if (!main) return '';
    const clone = main.cloneNode(true);
    clone.querySelectorAll('script,style,noscript,button,input,select,textarea,.floating-func').forEach(el => el.remove());
    let text = clone.innerText || clone.textContent || '';
    text = text.replace(/\r/g, '').replace(/[\t ]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    // Trim common feedback/footer text when present.
    for (const marker of ['이 페이지에서 제공하는 정보에 대하여 만족하십니까', '만족도', '소중한 의견']) {
      const i = text.indexOf(marker);
      if (i > 0) text = text.slice(0, i).trim();
    }
    return text;
  }

  async function fetchContent(row) {
    if (!row.ntnCd || !row.tocCd) return { ...row, content_error: 'ntnCd/tocCd missing' };
    const url = `/environment/${row.region_slug}-content?ntnCd=${encodeURIComponent(row.ntnCd)}&tocCd=${encodeURIComponent(row.tocCd)}`;
    try {
      const res = await fetch(url, { credentials: 'include', headers: { 'current-view-url': location.pathname } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      return {
        ...row,
        page_url: new URL(url, location.origin).href,
        current_text: cleanMainText(doc)
      };
    } catch (e) {
      return { ...row, page_url: new URL(url, location.origin).href, content_error: String(e.message || e) };
    }
  }

  async function exportMetadata() {
    assertOCIS();
    const [eu, asia] = await Promise.all([getRegionRows('Europe'), getRegionRows('Asia')]);
    const items = [...eu, ...asia]
      .filter(x => x.country && x.title)
      .sort((a,b) => a.country.localeCompare(b.country, 'ko') || String(a.ocis_updated_at || '').localeCompare(String(b.ocis_updated_at || '')) || a.title.localeCompare(b.title, 'ko'));
    const payload = {
      exported_at: new Date().toISOString(),
      source: location.origin,
      scope: 'OCIS Europe + Central Asia PoC',
      item_count: items.length,
      countries: [...new Set(items.map(x => x.country))],
      items
    };
    console.table(items.map(x => ({국가:x.country, 제목:x.title, 작성일:x.ocis_updated_at, ntnCd:x.ntnCd, tocCd:x.tocCd})));
    downloadJson('ocis-europe-central-asia-metadata.json', payload);
    return payload;
  }

  async function exportOldest5(countryName) {
    assertOCIS();
    const regionName = COUNTRY_REGION[countryName];
    if (!regionName) throw new Error(`PoC 대상국이 아닙니다: ${countryName}`);
    const rows = (await getRegionRows(regionName))
      .filter(x => x.country === countryName && x.tocCd)
      .sort((a,b) => {
        const da = a.ocis_updated_at || '0000-00-00';
        const db = b.ocis_updated_at || '0000-00-00';
        return da.localeCompare(db) || a.title.localeCompare(b.title, 'ko');
      })
      .slice(0, 5);
    const items = [];
    for (const row of rows) items.push(await fetchContent(row));
    const payload = {
      exported_at: new Date().toISOString(),
      source: location.origin,
      country: countryName,
      selection_rule: 'oldest OCIS updtYmd first',
      items
    };
    console.table(items.map(x => ({국가:x.country, 제목:x.title, 작성일:x.ocis_updated_at, 글자수:(x.current_text||'').length, 오류:x.content_error||''})));
    downloadJson(`ocis-${countryName}-oldest5.json`, payload);
    return payload;
  }

  window.OCISImporter = { exportMetadata, exportOldest5, getRegionRows };
  console.log('%cOCISImporter loaded', 'font-weight:bold;color:#6d28d9');
  console.log('1) 전체 메타데이터: await OCISImporter.exportMetadata()');
  console.log("2) 국가별 오래된 5개 본문: await OCISImporter.exportOldest5('우즈베키스탄')");
})();
