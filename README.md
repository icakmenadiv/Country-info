# Country-info

OCIS 국별환경 최신정보 갱신을 위한 PoC 저장소입니다.

## 목적
- 대상: OCIS 국별환경 중 유럽·중앙아시아
- 실행: 예약 없이 사용자가 필요할 때 ChatGPT에 요청
- 기본 단위: 1개 국가의 가장 오래된 정보 5개
- 결과: UPDATE / KEEP / REVIEW
- 원칙: 기존 OCIS 문구 형식 참고, 출처 필수, 자동 덮어쓰기 금지

## 기본 사용 명령
- `국별환경 업데이트 실행`
- `우즈베키스탄 업데이트 실행`
- `폴란드 업데이트 후보 10개 보여줘`
- `미반영 업데이트 보여줘`
- `카자흐스탄 GDP 다시 검증해줘`

## 구조
- `index.html` : 대시보드
- `styles.css` : 화면 스타일
- `app.js` : 대시보드 동작
- `data/state.json` : 국가별 점검 상태
- `data/items.json` : OCIS 기존값 및 항목별 최신성 메타데이터
- `data/proposals.json` : GPT 업데이트 제안 누적
- `config/policy.json` : 조사/선정/출처 규칙

> 현재는 PoC 초기 구조입니다. OCIS 기존값 전체 import 전까지 항목은 `NEEDS_IMPORT` 상태로 관리합니다.
