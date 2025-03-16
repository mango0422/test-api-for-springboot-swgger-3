# My API Tester

<h2> $\color{#DD6565}간단한 사용 예시$ </h2>

[예제 사이트](https://mango0422.github.io/test-api-for-springboot-swgger-3/)

<p> 위 사이트는 nextjs 페이지와 $\color{#DD6565}무관하게$ 간단하게 테스트 가능한 $\color{#DD6565}별도의 사이트$입니다.</p>
<p>예제로 만들었기에 디자인이 다소 다릅니다.</p>

사용시 api 서버에서 `https://mango0422.github.io/` 도메인을 반드시 `cors exception` 처리하시기 바랍니다.

**참고: 프레임워크 별 기본 포트번호 + url 목록**
| 프레임워크 | 기본 포트 번호 | `/v3/api-docs` URL |
|------------|----------------|--------------------|
| **스프링 부트** | 8080 | `http://localhost:8080/v3/api-docs` |
| **Express.js** | 3000 | `http://localhost:3000/v3/api-docs` |
| **Django** | 8000 | `http://localhost:8000/v3/api-docs` |
| **Ruby on Rails** | 3000 | `http://localhost:3000/v3/api-docs` |
| **ASP.NET Core** | 5000 | `http://localhost:5000/v3/api-docs` |

My API Tester는 OpenAPI 문서를 기반으로 REST API 요청을 테스트하고 응답을 확인할 수 있는 웹 애플리케이션입니다. Next.js와 React를 기반으로 정적 빌드하여 배포할 수 있으며, 누구나 쉽게 API를 테스트할 수 있도록 사용자 친화적인 UI를 제공합니다.

## 주요 기능

- **API 문서 로드**  
  서버의 OpenAPI 문서를 가져와 엔드포인트 목록을 자동으로 구성합니다.

- **요청 구성 및 전송**  
  각 API 엔드포인트에 대해 Query 파라미터와 Request Body를 입력하고 요청을 전송할 수 있습니다.

- **미리보기 및 히스토리 기능**  
  전송할 요청을 미리 확인하고, 이전 요청 기록을 저장하여 재사용할 수 있습니다.

- **curl 명령 생성**  
  구성한 요청을 curl 명령어로 변환하여 복사할 수 있습니다.

- **반응형 UI 및 다크 모드 지원**  
  Tailwind CSS와 다양한 UI 컴포넌트를 활용해 깔끔한 인터페이스와 다크 모드를 지원합니다.

## 설치 및 실행

1. **프로젝트 클론**

   ```bash
   git clone https://github.com/mango0422/test-api-for-springboot-swgger-3.git
   cd my-api-tester
   ```

2. **의존성 설치**

   ```bash
   npm install
   # 또는
   yarn install
   # 또는
   pnpm install
   ```

3. **개발 서버 실행**

   ```bash
   npm run dev
   # 또는
   yarn dev
   # 또는
   pnpm run dev
   ```

   기본적으로 [http://localhost:3000](http://localhost:3000) 에서 애플리케이션을 확인할 수 있습니다.

4. **정적 빌드 및 배포**  
   GitHub Pages에 배포하려면 Next.js의 정적 HTML Export 기능을 활용하세요.
   ```bash
   npm run build
   # 또는
   yarn run build
   # 또는
   pnpm run build
   ```
   `out` 폴더에 정적 파일이 생성되며, 이를 GitHub Pages에 업로드하여 배포할 수 있습니다.

## 사용 방법

1. **API 서버 URL 및 OpenAPI 문서 경로 설정**

   - 기본 API 서버 URL과 문서 경로를 입력합니다.
   - "로드" 버튼을 눌러 OpenAPI 문서를 가져옵니다.

2. **엔드포인트 선택 및 요청 구성**

   - 드롭다운 메뉴에서 테스트할 API 엔드포인트를 선택합니다.
   - 해당 엔드포인트에 필요한 Query 파라미터 및 Request Body를 입력합니다.

3. **요청 미리보기 및 전송**

   - "미리보기" 탭에서 요청 URL, Headers, Body 정보를 확인합니다.
   - "요청 보내기" 버튼을 클릭하여 API 요청을 전송하고 응답을 확인합니다.

4. **요청 히스토리 확인**
   - 최근 API 요청 기록을 확인하고, 히스토리 항목을 클릭하여 이전 요청 정보를 재사용할 수 있습니다.

## 기여 방법

1. 이 저장소를 포크합니다.
2. 새로운 브랜치를 생성하여 기능 추가 또는 버그 수정을 진행합니다.
3. 변경 사항을 커밋하고 푸시한 후 Pull Request를 생성합니다.

## 라이선스

이 프로젝트는 [MIT 라이선스](LICENSE) 하에 배포됩니다.

---

많은 관심과 기여 부탁드립니다!
