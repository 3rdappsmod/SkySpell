# SkySpell 검토 및 검증 기록

검토일: 2026-09-22. 검토 대상은 Claude Code가 작성한 0.1.0 초안입니다.

## 판정

UI 구성, Electron 메인/렌더러 분리, 코드포인트 기반 글자수 계산, 로컬 설정 저장은 소규모 데스크톱 앱에 적절했습니다. 그러나 초안은 배포 준비가 끝난 상태는 아니었습니다. 기존 14개 테스트는 계산/파서만 검증했고, 실제 네이버 통신·비동기 UI·패키징·자동 병합 설정은 별도 검증이 필요했습니다.

수정본은 Linux 실사용 및 공개 저장소의 초기 버전으로 사용할 수 있습니다. Windows 설치·실행과 공개 Release의 업데이트까지 검증한 정식 배포 완료 상태를 뜻하지는 않습니다.

## 발견 사항과 처리

| 중요도 | 초안의 문제 | 수정 |
|---|---|---|
| 높음 | Electron 31 등 오래된 의존성. npm audit 10건(critical 1, high 9) | Electron 44.4.3, electron-builder 26.15.3, ESLint 10 계열로 갱신. 검사 당시 audit 0건 |
| 높음 | 검사 중 원문 변경/파일 열기/초기화 뒤 이전 결과가 돌아와 새 문서를 덮어쓸 수 있음 | 문서 revision 확인, 결과 무효화, 중복 검사 방지, IPC 실패 후 버튼 복원 |
| 중간 | 긴 글의 모든 청크를 동시에 전송, 키 발급 중복, 무기한 네트워크 대기 | 순차 처리·200ms 간격·15초 요청 제한·메모리 키 캐시·제한된 인증 재시도 |
| 중간 | 분할 시 UTF-16 이모지 절단 가능, 줄바꿈/경계 공백 소실 위험 | 서로게이트 쌍 보호, 줄바꿈과 가장자리 공백 보존 |
| 중간 | 비정상 API 결과를 충분히 검증하지 않음 | 응답 HTTP 상태/구조/빈 결과 검사 및 한국어 오류 |
| 중간 | OS가 영어면 한글 메뉴 요구를 충족하지 않음 | 한국어 기본 UI/메뉴 고정 |
| 중간 | sandbox 비활성화 | sandbox 활성화, 새 창 및 탐색 차단, contextIsolation 유지 |
| 중간 | 자동 병합이 필수 CI를 기다린다는 보장/설명 부족 | 브랜치 보호 절차 문서화, 저장소 변수 명시적 활성화, patch/minor만 대상 |
| 중간 | Linux/Windows CI가 unpacked 출력만 검증 | AppImage/deb/NSIS 설치 파일 생성으로 강화 |
| 낮음 | 설정 전환 시 교정문 글자수 갱신 누락, 결과 없을 때 원문 복사 | 양쪽 글자수 갱신, 유효한 교정문이 있을 때만 결과 복사 |
| 낮음 | 파서가 작은따옴표 em 태그만 지원 | 큰따옴표/span/숫자 엔티티 대응, 태그를 DOM에 삽입하지 않음 |
| 낮음 | 릴리스 버전 검증·원격 저장소 정보 부족 | 태그/버전 일치 확인, publish 저장소 명시, Release 초안 생성 |

## 검증

- 단위 테스트 21개 통과: 기존 14개 + 청크 분할/공백 보존/키 갱신/잘못된 응답/타임아웃/중복 요청/파서 회귀.
- ESLint 통과.
- Linux x64 AppImage와 deb 설치 파일 생성 성공.
- 실제 Linux Electron 창으로 글자·바이트·공백 설정, 목표 초과, 교정·복사·적용, 오래된 응답 무효화, 메뉴 중복 요청, 오류 복구, 테마·설정 유지 검증.
- 파일 열기/저장은 실제 IPC와 파일 읽기/쓰기를 검증. 자동화에서 네이티브 파일 선택 대화상자만 임시 경로로 대체.
- 네이버 실서비스: `안녕하새요. 오늘은 날씨가 조아요.\n\n만나서 반갑슴니다.` → `안녕하세요. 오늘은 날씨가 좋아요.\n\n만나서 반갑습니다.` 확인.
- 밝은 테마, 어두운 테마, 최소 크기 화면을 캡처해 확인.
- 재현: Node.js 24에서 `npm ci`, `npm run lint`, `npm test`, `npm run test:gui -- --live`, `npm run dist:linux -- --publish never`.

## 남는 한계 및 배포 전 작업

- Windows 설치/실행은 Linux 환경에서 확인하지 않았습니다. 저장소 push 후 Windows CI 빌드 및 Windows에서 직접 설치·실행하세요.
- GitHub 저장소 생성, push, 브랜치 보호, Actions 변수, Release 공개는 로컬 작업으로 활성화되지 않습니다. README의 설정 절차를 따르세요.
- 자동 업데이트는 공개 Release와 이전 설치본이 있어야 끝까지 검증할 수 있습니다. 아직 실배포 업데이트는 미검증입니다.
- 네이버 비공식 서비스는 예고 없이 변경될 수 있습니다. Dependabot은 의존성 업데이트 도구이며 맞춤법 품질이나 서비스 변경을 자동 수정하지 않습니다.
- 2바이트 모드는 문서 작성 관례이며 UTF-8 바이트 용량이 아닙니다. 공백 제외는 줄바꿈·탭도 제외합니다.
- 이 PC의 시스템 Node.js 18은 새 개발 도구의 요구 버전보다 낮습니다. 검증에는 시스템을 변경하지 않고 임시 Node.js 24를 사용했습니다. 소스 개발 시 Node.js 24를 준비하세요. 패키징한 앱에는 별도 Node.js가 필요 없습니다.

참고 근거: [Electron 지원 정책](https://www.electronjs.org/docs/latest/tutorial/electron-timelines), [Electron clipboard 비동기 API](https://www.electronjs.org/docs/latest/api/clipboard), [GitHub 자동 병합과 필수 검사](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/automatically-merging-a-pull-request).

## 개발 환경 후속 수정 (2026-09-22)

일반 터미널이 시스템 Node.js 18을 사용하여 빌드 도구에서 `ERR_REQUIRE_ESM`이 발생했습니다. 사용자 계정의 `~/.local/share/nodejs`에 공식 Node.js 24.21.0을 SHA-256 확인 후 설치하고 `~/.local/bin/node`, `npm`, `npx`를 연결했습니다. 시스템 Node.js는 유지했습니다. 기존 터미널은 `hash -r` 후 `node -v`로 전환 여부를 확인할 수 있습니다.

앱 실행·검사·빌드 명령 앞에 Node.js 버전 검사를 추가했습니다. 이후 저장소에서 업데이트된 electron-store 11의 ESM default export에 맞춰 로딩 코드를 수정했고, 깨끗한 `npm ci` 이후 lint·테스트 21개·실제 GUI 검사를 통과했습니다.

일반 사용자 Node.js 24 환경에서 Linux AppImage/deb 빌드를 다시 완료했습니다. Windows 교차 빌드는 ESM 오류를 해결한 뒤 NSIS 단계까지 진행했으며 Wine이 필요합니다. Windows 실기기 설치/실행 검증은 별도입니다.
