# Country-info

OCIS 국별환경 최신정보 갱신을 위한 PoC 저장소입니다.

## 목적
- 대상: **유럽 8개국 + 중앙아시아 5개국 = 13개국**
- 실행: 예약 없이 사용자가 필요할 때 ChatGPT에 요청
- 기본 단위: **1개 국가의 가장 오래된 정보 5개**
- 결과: `UPDATE` / `KEEP` / `REVIEW`
- 원칙: 기존 OCIS 문구 형식 참고, 출처 필수, 자동 덮어쓰기 금지

## PoC 대상국
### 유럽
러시아, 루마니아, 영국, 우크라이나, 조지아, 체코, 폴란드, 헝가리

### 중앙아시아
우즈베키스탄, 카자흐스탄, 키르기스스탄, 타지키스탄, 투르크메니스탄

> 실제 운영 전에는 라이브 OCIS의 국가 목록과 한 번 더 대조합니다.

## 기본 사용 명령
- `Country-info 저장소 기준으로 국별환경 업데이트 실행`
- `Country-info 저장소 기준으로 우즈베키스탄 업데이트 실행`
- `Country-info 저장소 기준으로 폴란드 업데이트 후보 10개 보여줘`
- `Country-info 저장소 기준으로 미반영 업데이트 보여줘`
- `Country-info 저장소 기준으로 카자흐스탄 GDP 다시 검증해줘`

## 토큰 절약 구조
대시보드는 234개 행을 파일에 중복 저장하지 않습니다.

1. `data/state.json`에서 13개국의 점검 상태만 읽습니다.
2. `config/taxonomy.json`의 18개 관리항목을 조합해 화면 행을 생성합니다.
3. 실제 OCIS 기존값이 Import된 항목만 `data/items.json`에 저장합니다.
4. GPT 조사 시에는 선택된 국가의 **5개 항목만** 검색·검토합니다.

## 구조
- `index.html` : 대시보드
- `styles.css` : 화면 스타일
- `app.js` : 대시보드 동작
- `data/state.json` : 국가별 점검 상태
- `data/items.json` : 실제로 Import된 OCIS 기존값/메타데이터만 저장
- `data/proposals.json` : GPT 업데이트 제안 누적
- `config/taxonomy.json` : PoC 관리항목 18개
- `config/policy.json` : 조사/선정/출처 규칙
- `PROMPT.md` : ChatGPT 실행 규칙

## 상태
- `NEEDS_IMPORT` : OCIS 기존 문구를 아직 가져오지 않음
- `OLD` : 기존값은 있으나 재검증 필요
- `PENDING` : 새 업데이트 제안이 있어 검토 대기
- `VERIFIED` : 최신성 확인 완료
- `REVIEW` : 자료 충돌/근거 부족으로 사람 확인 필요

## 중요
OCIS의 현재 문구와 날짜는 임의로 만들지 않습니다. 실제 OCIS 값을 최초 Import한 뒤 최신 공식자료와 비교합니다.
