# OCIS 붙여넣기용 HTML 포맷 기준

국별환경 수정안을 OCIS 편집기 소스에 붙여넣을 때 아래 형식을 기본값으로 적용한다.

## 기본 글꼴·크기·줄간격
- 본문 글꼴: `맑은 고딕`
- 본문 글자크기: `12pt`
- 문단 줄간격: `line-height: 1.6`
- 최상위 컨테이너는 기존 편집기 호환을 위해 다음 형태 유지:
  - `<div class="se-contents" style="font-family: Arial, Helvetica, sans-serif; font-size: 11pt; line-height: 1.2;">`
- 실제 보이는 제목·본문 span에는 반드시 `font-family: "맑은 고딕"; font-size: 12pt;` 적용

## 번호형 소제목
```html
<p style="line-height: 1.6;"><span style="font-family: &quot;맑은 고딕&quot;; font-size: 12pt;">1. 소제목</span></p>
```

## 목록 컨테이너
```html
<ul class="se-list" style="padding: 0px 0px 0px 40px; margin: 16px 0px;">
```

## 1단계 글머리 `●`
- `data-level="0"`
- `data-level-margin-left="0px"`
- `data-margin-left="0px"`
- `li margin-left: -3.316px`
- 글머리 span: Arial 12pt, `margin-left: -9.684px`
- 본문 span: 맑은 고딕 12pt
- 문단: `line-height: 1.6; margin: 0px;`

기본형:
```html
<li class="se-list-item" style="list-style: none; margin-left: -3.316px;" data-format="bullet" data-level="0" data-level-margin-left="0px" data-list-position="outside" data-margin-left="0px" data-multi="false" data-startval="1" data-text="●">
    <p style="line-height: 1.6; margin: 0px;"><span class="se-list-type" style="pointer-events: none; left: -10px; font-family: Arial; font-size: 12pt; display: inline-block; position: relative; margin-left: -9.684px;" data-multi="false">●</span><span style="font-family: &quot;맑은 고딕&quot;; font-size: 12pt;">1단계 본문</span></p>
</li>
```

## 2단계 글머리 `○`
- 반드시 상위 `●`보다 40px 들여쓰기
- `data-level="1"`
- `data-level-margin-left="40px"`
- `data-margin-left="40px"`
- `li margin-left: 36.684px`
- 글머리 span: Arial 12pt, `margin-left: -9.684px`
- 본문 span: 맑은 고딕 12pt
- 문단: `line-height: 1.6; margin: 0px;`

기본형:
```html
<li class="se-list-item" style="list-style: none; margin-left: 36.684px;" data-format="bullet" data-level="1" data-level-margin-left="40px" data-list-position="outside" data-margin-left="40px" data-multi="false" data-startval="1" data-text="○">
    <p style="line-height: 1.6; margin: 0px;"><span class="se-list-type" style="pointer-events: none; left: -10px; font-family: Arial; font-size: 12pt; display: inline-block; position: relative; margin-left: -9.684px;" data-multi="false">○</span><span style="font-family: &quot;맑은 고딕&quot;; font-size: 12pt;">2단계 본문</span></p>
</li>
```

## 출처 문단
- 일반 제목·본문과 동일하게 맑은 고딕 12pt, line-height 1.6 적용
- 예:
```html
<p style="line-height: 1.6;"><span style="font-family: &quot;맑은 고딕&quot;; font-size: 12pt;">&lt;출처: 기관명, 문서명&gt;</span></p>
```

## 작성 규칙
- 국별환경 최종본은 가능하면 위 HTML 소스 형식으로 제공한다.
- `●`는 1단계 핵심내용, `○`는 해당 `●`의 세부내용으로 계층화한다.
- `○`를 일반 `<p>`로 따로 두지 않는다.
- Markdown 글머리나 시스템 인라인 인용(`cite...`)은 OCIS 붙여넣기용 최종본에 넣지 않는다.
- 사용자가 별도 형식을 지정하지 않는 한 위 폰트·크기·간격·들여쓰기 값을 그대로 적용한다.
