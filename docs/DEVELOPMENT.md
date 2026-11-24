# 개발 가이드 (코드 컨벤션)

건강수첩 환자용 앱(MVP) 소스코드를 유지보수·확장하기 위한 규칙입니다.

## 기술 스택

| 영역 | 사용 기술 |
| --- | --- |
| 프레임워크 | Expo SDK 58 (React Native 0.88, React 19.3), TypeScript strict |
| 라우팅 | Expo Router 58 (파일 기반, typed routes) — `src/app/` |
| 서버 상태 | TanStack Query v5 — `src/hooks/api.ts` |
| 클라이언트 상태 | Zustand (+ AsyncStorage 영구 저장) — `src/store/` |
| 그래픽 | react-native-svg (검사 수치 그래프) |
| 파일 선택 | expo-image-picker (촬영·사진), expo-document-picker (PDF) |
| 아이콘 | @expo/vector-icons (Ionicons) — `@/components/ui/icon` |
| 테스트 | jest-expo, @testing-library/react-native |

> Expo는 SDK마다 API가 바뀝니다. Expo/React Native API를 쓰기 전에 반드시 SDK 58 문서(https://docs.expo.dev/versions/v58.0.0/)를 확인합니다.

## 폴더 구조

```
src/
  app/                  화면(라우트) — 파일 1개 = 화면 1개, _layout.tsx = 내비게이터
    (tabs)/             하단 탭: 홈 · 내 기록 · 타임라인 · 질문 노트 · 설정
    upload/             진료기록 등록 플로우(모달): 방법 선택 → 정보 입력 → 진행
    documents/[id]/     진료기록 상세: 정리 결과 · 원문 대조 해설 · 검사 수치
    labs/               검사 항목 목록 · 항목별 수치 변화
    questions/edit.tsx  질문 작성/수정(모달)
    onboarding.tsx      첫 실행 안내 + AI 해설 고지 동의
  api/                  API 계약(client.ts) · HTTP 구현 · 내장 데모 서버(mock/)
  components/
    ui/                 공통 UI (AppText, Button, Card, Badge, Chip, ChoiceChips, HeaderButton,
                        SegmentedTabs, TextField, Screen …)
    states/             로딩·오류·빈 상태, QueryState
    domain/             여러 화면이 공유하는 도메인 컴포넌트 (DocumentGate 등)
    <feature>/          화면별 전용 컴포넌트
  constants/theme.ts    디자인 토큰 (색상·간격·글꼴)
  hooks/                서버 데이터 훅 api.ts (useDocuments, useAnalysis …) · useManualRefresh · useToday
  lib/                  순수 함수 유틸 (format, labs, labels, icons, dialog, haptics, file-pickers)
  store/                Zustand 스토어 (settings, upload-draft)
  types/domain.ts       도메인 타입 (API 응답 스키마와 1:1)
```

## 규칙

### 데이터
- 화면은 `api` 를 직접 호출하지 않고 `@/hooks/api` 의 훅만 사용합니다. 당겨서 새로고침은 `useManualRefresh`(`@/hooks/use-manual-refresh`).
- 모든 데이터 화면은 **로딩 / 오류(다시 시도) / 빈 상태 / 정상** 4가지를 처리합니다.
  - 목록·단건 조회: `<QueryState query={...}>` 사용
  - 문서 상세 화면: `<DocumentGate documentId={id}>` 사용 (처리 중·실패 상태 포함)
  - 전체 오류 화면은 **보여 줄 데이터가 없을 때만** 씁니다. 데이터가 있는데 재조회만 실패하면(TanStack v5 는 이때도 `isError`)
    내용을 유지하고 `RefreshErrorBanner` 를 띄웁니다 — `QueryState`·`DocumentGate` 가 자동으로 처리하므로 직접 `isError` 로 분기할 때도 같은 규칙을 따릅니다.
  - 화면 렌더링 예외는 루트 레이아웃의 `screenErrorBoundary`(`RouteErrorBoundary`)가 그 화면만 오류 안내로 바꿉니다.
- 오류 문구는 `getErrorMessage(error)` 또는 `ApiError.userMessage` 를 사용합니다 (직접 작성 금지).
- 변경(mutation) 실패는 `notify()` 로 알리고, 성공 시 필요한 경우 `haptics.success()`.

### UI
- 색상·간격·글꼴은 `@/constants/theme` 토큰만 사용합니다. 16진수 색상 직접 사용 금지.
- 텍스트는 반드시 `AppText`(variant/color 지정), 버튼은 `Button`, 카드 컨테이너는 `Card`.
  입력칸은 `TextField`, 단일 선택 칩은 `ChoiceChips`, 세그먼트 탭은 `SegmentedTabs`, 헤더 버튼은 `HeaderButton`.
  누름 배경이 있는 목록 행을 카드에 넣을 때는 `<Card padding={0} clip>` 으로 모서리를 자릅니다.
- 글자색 토큰은 배경 위에서 4.5:1 이상이어야 합니다 (`src/constants/__tests__/theme.test.ts`).
- 화면 최상위는 `Screen` (스크롤·여백·하단 CTA·당겨서 새로고침 일원화).
  `FlatList`/`SectionList` 를 직접 쓰는 화면은 `<Screen scroll={false} padded={false}>`.
- 대화상자는 `@/lib/dialog` 의 `confirm()` / `notify()` (웹에서도 동작).
- 문구는 환자 눈높이의 해요체("~해요", "~하세요"). 의학 용어는 쉬운 말을 먼저, 원어는 보조로.
- AI 해설이 표시되는 화면 하단에는 `AiDisclaimer` 를 둡니다 — 홈, 진료기록 상세 3개 화면, 등록 완료 화면,
  내 검사 수치·수치 변화, 타임라인(진료·진단 설명이 AI 요약)이 해당합니다.
- 같은 대상은 같은 이름·아이콘으로 부릅니다: 등록한 항목은 '진료기록'(`RECORD_NOUN`), 등록 버튼은 `UPLOAD_CTA_LABEL`,
  진단·검사·처방 약 이름은 `SUMMARY_ITEM_LABEL`(`@/lib/labels`), 아이콘은 `@/lib/icons`. '문서'는 코드·API 용어로만 씁니다.

### 접근성
- 누를 수 있는 요소는 `accessibilityRole` + `accessibilityLabel`, 최소 44pt 터치 영역.
- 검사 판정은 색상만으로 구분하지 않고 아이콘·글자(`LabFlagBadge`)를 함께 표시합니다.
- 본문 해설 텍스트는 `AppText scalable` 로 '글자 크게 보기' 설정을 따릅니다.

### 내비게이션
- `useRouter()` 훅을 사용하고 완전한 href 로 이동합니다 (SDK 58 권장).
  ```ts
  router.push({ pathname: '/documents/[id]', params: { id } });
  ```
- 동적 화면 제목은 화면 안에서 `<Stack.Screen options={{ title }} />`.
- 문서 상세 3개 화면 이름은 `DOCUMENT_SECTION_LABEL`(`@/lib/labels`)을 씁니다 (헤더 제목·상단 탭·안내 문구 공통).
- 온보딩 동의 전 접근 차단은 루트 레이아웃의 `Stack.Protected` 가 담당합니다. 새 화면을 추가하면 그 안에 `Stack.Screen` 으로 선언하세요.

### 검증
```bash
npm run typecheck   # tsc --noEmit
npm run lint        # expo lint
npm test            # jest
```
