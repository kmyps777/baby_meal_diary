# 이유식 플래너 앱 — CLAUDE.md

## 앱 개요
아기 이유식을 체계적으로 관리할 수 있는 iOS 앱.
재료 계획, 큐브 관리, 식단표 작성, 엑셀 내보내기 기능을 제공한다.
로그인 없이 익명으로 바로 사용 가능하며, 이메일 백업으로 기기 변경 시 데이터 복원 가능.

---

## 기술 스택

| 항목 | 내용 |
|------|------|
| 프론트엔드 | HTML / CSS / JavaScript |
| 데이터베이스 | Supabase (PostgreSQL) |
| 인증 | Supabase 익명 인증 + 이메일 백업 |
| 앱 래퍼 | Capacitor (iOS) |
| 배포 | Apple App Store |
| 웹 호스팅 | GitHub Pages |

---

## Supabase 설정

### 테이블 4개
- `plans` — 재료 플래너 (ingredient, date, memo)
- `meals` — 식단표 (date, time_label, type, order, cubes, snack_memo)
- `cubes` — 큐브 관리 (name, category, g, count, used_count, made_date, expire_days, ingredients, status)
- `settings` — 설정 저장 (key, value) — 시간이름 목록 보관

### 보안
- 모든 테이블 Row Level Security (RLS) 활성화
- 본인 데이터만 접근 가능 (auth.uid() = user_id)

---

## 구현된 기능

### 인증
- [x] Supabase 익명 자동 로그인 (로그인 화면 없음)
- [x] 이메일 + 비밀번호 백업 연결
- [x] 기존 데이터 복원 (이메일 로그인)
- [x] 로그아웃 (새 익명 세션으로 전환)
- [x] 복원 후 모든 탭 데이터 자동 갱신

### 재료 플래너 탭
- [x] 월별 달력 뷰
- [x] 날짜별 재료 계획 추가 / 수정 / 삭제
- [x] 달력에 재료명 인라인 표시
- [x] 여러 계획 있을 때 +N 표시

### 식단표 탭
- [x] 월별 달력 뷰 (이유식/간식 색상 점으로 표시)
- [x] 날짜 클릭 시 하단 패널에 식단 표시
- [x] 끼니/간식 추가 / 수정 / 삭제
- [x] 이유식: 베이스죽 / 단백질 / 기타 큐브 선택
- [x] 간식: 텍스트 메모
- [x] 시간이름 자동완성 드롭다운
- [x] 총 이유식 g 자동 계산
- [x] 식단 저장 시 큐브 used_count 자동 차감
- [x] CSV 엑셀 내보내기 (기간 선택)
- [x] iOS 공유 시트로 내보내기 (@capacitor/share)

### 큐브 관리 탭
- [x] 사용중 / 소진된 큐브 탭 분리
- [x] 큐브 등록 / 수정 / 삭제
- [x] 재료 태그 자동 큐브명 완성
- [x] 유통기한순 / 카테고리순 정렬
- [x] 베이스죽 / 단백질 / 기타 필터
- [x] 유통기한 D-Day 뱃지 (임박 시 빨간색)
- [x] 수정 모달에서 낱개 소진 / 전량 소진

### UI/UX
- [x] iPhone Safe Area 처리 (노치 / Dynamic Island)
- [x] iOS 앱스토어 심사 통과 (Guideline 4.8 준수 — 써드파티 로그인 없음)
- [x] 앱 아이콘 1024x1024 등록

---

## 파일 구조

```
baby_meal_planner_nologin/
├── index.html       — 앱 HTML 구조
├── style.css        — 스타일
├── app.js           — 앱 로직 (Supabase 연동)
├── www/             — Capacitor 웹 디렉토리 (빌드용)
│   ├── index.html
│   ├── style.css
│   └── app.js
├── ios/             — Xcode iOS 프로젝트
├── capacitor.config.json
└── package.json
```

---

## Capacitor 플러그인

```json
"@capacitor/core"
"@capacitor/ios"
"@capacitor/filesystem"
"@capacitor/share"
```

---

## 앱 정보

| 항목 | 내용 |
|------|------|
| Bundle ID | com.miyun.babymealplanner |
| 현재 버전 | 1.1.1 |
| 앱스토어 상태 | 출시 완료 |

---

## 코드 수정 후 앱 반영 순서

```bash
# 1. www 폴더에 복사
cp app.js www/
cp index.html www/
cp style.css www/

# 2. Capacitor 동기화
npx cap sync ios

# 3. Xcode 열기
npx cap open ios

# 4. 테스트: 내 아이폰으로 Run ▶️
# 5. 배포: Any iOS Device → Product → Archive
```

---

## 앞으로 할 것들

- [ ] 아기 정보 등록 (이름, 생년월일, 이유식 단계)
- [ ] 이유식 단계별 가이드 (초기/중기/후기/완료기)
- [ ] 알레르기 재료 표시 기능
- [ ] 푸시 알림 (유통기한 임박 알림)
- [ ] 큐브 통계 (가장 많이 사용한 재료 등)
- [ ] 사진 첨부 기능
- [ ] 다크 모드 지원
- [ ] 안드로이드 버전 출시

---

## 주의사항

- `app.js` 상단 Supabase URL / ANON KEY 는 직접 입력 필요, 'app.js' 변경시 supabase 값 고치라고 말해주기
- 파일 수정 후 반드시 `www/` 폴더에 복사 후 `npx cap sync ios` 실행
- 아카이브 시 반드시 **Any iOS Device (arm64)** 선택
- 빌드 번호는 업로드할 때마다 +1 증가 필요
