const { useState, useEffect } = React;

// 간단한 토스트 컴포넌트 (3초 후 자동 제거)
// ✅ 토스트 메시지에 페이드 아웃 애니메이션 추가
function Toast({ toast, onRemove }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLeaving(true);
      setTimeout(() => onRemove(toast.id), 300); // 애니메이션 후 제거
    }, 3000);
    return () => clearTimeout(timer);
  }, [toast, onRemove]);

  return (
    <div
      className={`fixed top-4 right-4 bg-card shadow-lg px-4 py-2 rounded-lg mb-2 transition-all ${
        leaving ? "toast-leave" : "toast"
      }`}
    >
      <div className="font-bold text-card-foreground">{toast.title}</div>
      <div className="text-sm text-card-foreground">{toast.description}</div>
    </div>
  );
}

function ToastContainer({ toasts, removeToast }) {
  return (
    <div>
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onRemove={removeToast} />
      ))}
    </div>
  );
}

// ✅ 탭 컨텐츠에 애니메이션 추가
function Tabs({ tabs, activeTab, onTabChange }) {
  return (
    <div className="mb-4">
      <div className="flex space-x-2 border-b-2 border-muted-foreground mb-2">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onTabChange(tab.value)}
            className={`px-4 py-2 transition-all ${
              activeTab === tab.value
                ? "border-b-2 border-primary text-primary-foreground font-bold tab-content"
                : "text-muted-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ✅ 버튼 클릭 시 살짝 눌리는 효과 추가
function AnimatedButton({ children, onClick }) {
  const [clicked, setClicked] = useState(false);

  const handleClick = (e) => {
    setClicked(true);
    setTimeout(() => setClicked(false), 150);
    if (onClick) onClick(e);
  };

  return (
    <button
      onClick={handleClick}
      className={`px-4 py-2 bg-primary text-primary-foreground rounded-lg transition ${
        clicked ? "button-click" : ""
      }`}
    >
      {children}
    </button>
  );
}

// HTTP 메소드에 따른 배지 스타일 (예시)
function getBadgeVariant(method) {
  switch (method) {
    case "GET":
      return "bg-primary text-primary-foreground";
    case "POST":
      return "bg-primary text-primary-foreground";
    case "PUT":
      return "bg-primary text-primary-foreground";
    case "DELETE":
      return "bg-destructive text-destructive-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

// 메인 App 컴포넌트 (기능: API문서 로드, 엔드포인트 선택, 폼, 미리보기, 응답, 기록)
function App() {
  const [baseURL, setBaseURL] = useState("http://localhost:8080");
  const [apiDocsUrl, setApiDocsUrl] = useState("/v3/api-docs");
  const [apiDocs, setApiDocs] = useState(null);
  const [endpoints, setEndpoints] = useState([]);
  const [selectedEndpoint, setSelectedEndpoint] = useState(null);
  const [formData, setFormData] = useState({ query: {}, body: {} });
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [activeTab, setActiveTab] = useState("request");
  const [toasts, setToasts] = useState([]);
  const [requestPreview, setRequestPreview] = useState(null);
  const [requestHistory, setRequestHistory] = useState([]);

  // 토스트 메시지 추가 함수
  const showToast = ({ title, description }) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, title, description }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // API 문서 불러오기
  const fetchApiDocs = async () => {
    setLoading(true);
    setApiError(null);
    try {
      const fullUrl = baseURL + apiDocsUrl;
      const res = await axios.get(fullUrl);
      setApiDocs(res.data);
      const paths = res.data.paths || {};
      let processed = [];
      Object.entries(paths).forEach(([path, methods]) => {
        Object.entries(methods).forEach(([method, details]) => {
          processed.push({
            method: method.toUpperCase(),
            path,
            details,
            summary: details.summary || `${method.toUpperCase()} ${path}`,
          });
        });
      });
      setEndpoints(processed);
      showToast({
        title: "API 문서 로드 완료",
        description: `${processed.length}개의 엔드포인트를 찾았습니다.`,
      });
    } catch (error) {
      console.error("API 문서 가져오기 에러:", error);
      setApiError("API 문서를 가져오는 데 실패했습니다: " + error.message);
      showToast({
        title: "API 문서 로드 실패",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApiDocs();
  }, []);

  // $ref 해석 함수
  const resolveSchema = (schema, apiDocs) => {
    if (schema && schema.$ref && apiDocs) {
      const refPath = schema.$ref.replace(/^#\//, "").split("/");
      let result = apiDocs;
      for (let part of refPath) {
        result = result[part];
        if (!result) break;
      }
      return result;
    }
    return schema;
  };

  // 기본값 반환 헬퍼
  const getDefaultValueByType = (type) => {
    switch (type) {
      case "integer":
      case "number":
        return "";
      case "boolean":
        return false;
      case "array":
        return [];
      case "object":
        return {};
      default:
        return "";
    }
  };

  // 엔드포인트 선택
  const handleSelectEndpoint = (value) => {
    if (!value) {
      setSelectedEndpoint(null);
      setFormData({ query: {}, body: {} });
      setRequestPreview(null);
      return;
    }
    const [method, ...pathParts] = value.split(" ");
    const path = pathParts.join(" ");
    const endpoint = endpoints.find(
      (ep) => ep.method === method && ep.path === path
    );
    if (!endpoint) return;
    setSelectedEndpoint(endpoint);

    let initialData = { query: {}, body: {} };
    // Query 파라미터 초기화
    if (endpoint.details.parameters) {
      endpoint.details.parameters.forEach((param) => {
        initialData.query[param.name] =
          param.schema?.default !== undefined ? param.schema.default : "";
      });
    }
    // Request Body 초기화 ($ref 해석)
    const rawSchema =
      endpoint.details.requestBody?.content?.["application/json"]?.schema;
    const requestBodySchema = rawSchema
      ? resolveSchema(rawSchema, apiDocs)
      : null;
    if (requestBodySchema && requestBodySchema.properties) {
      Object.keys(requestBodySchema.properties).forEach((key) => {
        const prop = requestBodySchema.properties[key];
        initialData.body[key] =
          prop.default !== undefined
            ? prop.default
            : getDefaultValueByType(prop.type);
      });
    }
    setFormData(initialData);
    setResponse(null);
    setApiError(null);
    updateRequestPreview(endpoint, initialData);
  };

  // 요청 미리보기 업데이트 (URL, 헤더, 데이터)
  const updateRequestPreview = (endpoint, data) => {
    let url = baseURL + endpoint.path;
    const headers = { "Content-Type": "application/json" };
    let queryParams = {};
    let bodyData = {};

    if (endpoint.details.parameters) {
      endpoint.details.parameters.forEach((param) => {
        if (
          data.query[param.name] !== undefined &&
          data.query[param.name] !== ""
        ) {
          queryParams[param.name] = data.query[param.name];
        }
      });
    }
    // URL 내 path 파라미터 대체
    Object.keys(data.query || {}).forEach((key) => {
      if (url.includes(`{${key}}`)) {
        url = url.replace(
          `{${key}}`,
          encodeURIComponent(String(data.query[key]))
        );
      }
    });
    // 쿼리스트링
    const qs = new URLSearchParams(queryParams).toString();
    if (qs) {
      url += (url.includes("?") ? "&" : "?") + qs;
    }

    // Body
    if (endpoint.method !== "GET" && data.body) {
      bodyData = { ...data.body };
    }

    setRequestPreview({
      url,
      method: endpoint.method,
      headers,
      data: Object.keys(bodyData).length > 0 ? bodyData : undefined,
    });
  };

  // 입력 값 변경 처리 (Query)
  const handleQueryChange = (key, value) => {
    const newData = {
      ...formData,
      query: { ...formData.query, [key]: value },
    };
    setFormData(newData);
    if (selectedEndpoint) updateRequestPreview(selectedEndpoint, newData);
  };

  // 입력 값 변경 처리 (Body)
  const handleBodyChange = (key, value) => {
    const newData = {
      ...formData,
      body: { ...formData.body, [key]: value },
    };
    setFormData(newData);
    if (selectedEndpoint) updateRequestPreview(selectedEndpoint, newData);
  };

  // 간단한 검증 함수
  const validateForm = () => {
    let valid = true;
    if (selectedEndpoint && selectedEndpoint.details.parameters) {
      selectedEndpoint.details.parameters.forEach((param) => {
        if (
          param.required &&
          (!formData.query[param.name] || formData.query[param.name] === "")
        ) {
          valid = false;
        }
      });
    }
    if (
      selectedEndpoint &&
      selectedEndpoint.details.requestBody?.content?.["application/json"]
        ?.schema
    ) {
      const schema = resolveSchema(
        selectedEndpoint.details.requestBody.content["application/json"].schema,
        apiDocs
      );
      if (schema?.required) {
        schema.required.forEach((key) => {
          if (
            !formData.body[key] &&
            formData.body[key] !== 0 &&
            formData.body[key] !== false
          ) {
            valid = false;
          }
        });
      }
    }
    return valid;
  };

  // 요청 전송
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEndpoint || !requestPreview) return;
    if (!validateForm()) {
      showToast({
        title: "검증 실패",
        description: "필수 필드를 확인하세요.",
      });
      return;
    }
    setLoading(true);
    setApiError(null);

    const startTime = performance.now();
    try {
      const res = await axios({
        method: requestPreview.method,
        url: requestPreview.url,
        headers: requestPreview.headers,
        data: requestPreview.data,
      });
      const duration = Math.round(performance.now() - startTime);
      setResponse(res.data);

      // 요청 히스토리 저장
      const historyItem = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        endpoint: selectedEndpoint,
        formData: { ...formData },
        response: res.data,
        status: res.status,
        duration,
      };
      setRequestHistory((prev) => [historyItem, ...prev]);

      setActiveTab("response");
      showToast({
        title: "요청 성공",
        description: `${res.status} ${res.statusText} (${duration}ms)`,
      });
    } catch (error) {
      console.error("요청 에러:", error);
      const errMsg = error.response
        ? `${error.response.status} ${error.message}`
        : error.message;
      setApiError("API 요청 실패: " + errMsg);
      setResponse(null);
      showToast({ title: "요청 실패", description: errMsg });
    } finally {
      setLoading(false);
    }
  };

  // 기록에서 선택 시 해당 요청 복원
  const loadFromHistory = (item) => {
    setSelectedEndpoint(item.endpoint);
    setFormData(item.formData);
    setResponse(item.response);
    updateRequestPreview(item.endpoint, item.formData);
    setActiveTab("request");
  };

  // curl 명령 복사
  const copyAsCurl = () => {
    if (!requestPreview) return;
    let curl = `curl -X ${requestPreview.method} "${requestPreview.url}"`;
    Object.entries(requestPreview.headers).forEach(([key, value]) => {
      curl += ` \\\n  -H "${key}: ${value}"`;
    });
    if (requestPreview.data) {
      curl += ` \\\n  -d '${JSON.stringify(requestPreview.data)}'`;
    }
    navigator.clipboard.writeText(curl);
    showToast({
      title: "복사 완료",
      description: "curl 명령이 클립보드에 복사되었습니다.",
    });
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4 text-foreground">
        REST API 테스터
      </h1>

      {/* 상단 입력 영역 */}
      <div className="mb-4 p-4 bg-card rounded-lg shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-medium mb-1 text-foreground">
              API 서버 URL
            </label>
            <input
              type="text"
              value={baseURL}
              onChange={(e) => setBaseURL(e.target.value)}
              placeholder="http://localhost:8080"
              className="border border-neutral-300 p-2 w-full rounded-lg bg-transparent text-foreground"
            />
          </div>
          <div>
            <label className="block font-medium mb-1 text-foreground">
              API 문서 경로
            </label>
            <div className="flex">
              <input
                type="text"
                value={apiDocsUrl}
                onChange={(e) => setApiDocsUrl(e.target.value)}
                placeholder="/v3/api-docs"
                className="flex-1 border border-neutral-300 p-2 rounded-lg bg-transparent text-foreground"
              />
              <AnimatedButton onClick={copyAsCurl}>복사</AnimatedButton>
            </div>
          </div>
        </div>

        {/* 에러 메시지 */}
        <div className="mt-4">
          <label className="block font-medium mb-1 text-foreground">
            API 엔드포인트
          </label>
          <select
            onChange={(e) => handleSelectEndpoint(e.target.value)}
            className="border border-neutral-300 p-2 w-full rounded-lg bg-transparent text-foreground"
          >
            <option value="">엔드포인트 선택</option>
            {endpoints.map((ep, i) => (
              <option key={i} value={`${ep.method} ${ep.path}`}>
                {ep.method} {ep.path}
              </option>
            ))}
          </select>
        </div>
        {apiError && (
          <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-lg">
            {apiError}
          </div>
        )}
      </div>

      {/* 선택된 엔드포인트 요청 영역 */}
      {selectedEndpoint && (
        <div className="bg-card p-4 rounded-lg shadow-lg mb-4">
          <Tabs
            tabs={[
              { value: "request", label: "요청" },
              { value: "preview", label: "미리보기" },
              { value: "response", label: "응답" },
            ]}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          {/* 요청 탭 */}
          {activeTab === "request" && (
            <form onSubmit={handleSubmit}>
              {selectedEndpoint.details.parameters &&
                selectedEndpoint.details.parameters.length > 0 && (
                  <div className="mb-4">
                    <h2 className="text-xl font-bold mb-2 text-foreground">
                      Parameters
                    </h2>
                    {selectedEndpoint.details.parameters.map((param) => (
                      <div key={param.name} className="mb-2">
                        <label className="block font-medium text-foreground">
                          {param.name}{" "}
                          {param.required && (
                            <span className="text-destructive">*</span>
                          )}
                        </label>
                        <input
                          type="text"
                          value={formData.query[param.name] || ""}
                          onChange={(e) =>
                            handleQueryChange(param.name, e.target.value)
                          }
                          placeholder={param.description || param.name}
                          className="border border-neutral-300 p-2 w-full rounded-lg bg-transparent text-foreground"
                        />
                      </div>
                    ))}
                  </div>
                )}
              {(() => {
                const rawSchema =
                  selectedEndpoint.details.requestBody?.content?.[
                    "application/json"
                  ]?.schema;
                const reqSchema = rawSchema
                  ? resolveSchema(rawSchema, apiDocs)
                  : null;
                if (!reqSchema || !reqSchema.properties) return null;
                return (
                  <div className="mb-4">
                    <h2 className="text-xl font-bold mb-2 text-foreground">
                      Request Body
                    </h2>
                    {Object.keys(reqSchema.properties).map((key) => {
                      const prop = reqSchema.properties[key];
                      return (
                        <div key={key} className="mb-2">
                          <label className="block font-medium text-foreground">
                            {key}{" "}
                            {reqSchema.required &&
                              reqSchema.required.includes(key) && (
                                <span className="text-destructive">*</span>
                              )}
                          </label>
                          <input
                            type="text"
                            value={formData.body[key] || ""}
                            onChange={(e) =>
                              handleBodyChange(key, e.target.value)
                            }
                            placeholder={prop.description || key}
                            className="border border-neutral-300 p-2 w-full rounded-lg bg-transparent text-foreground"
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("preview")}
                  className="px-4 py-2 border border-neutral-300 rounded-lg text-foreground"
                >
                  미리보기
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
                >
                  {loading ? "요청 중..." : "요청 보내기"}
                </button>
              </div>
            </form>
          )}

          {/* 미리보기 탭 */}
          {activeTab === "preview" && (
            <div>
              {requestPreview ? (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-1 rounded-lg ${getBadgeVariant(
                          requestPreview.method
                        )}`}
                      >
                        {requestPreview.method}
                      </span>
                      <span className="font-mono break-all text-foreground">
                        {requestPreview.url}
                      </span>
                    </div>
                    <div className="space-x-2">
                      <button
                        onClick={copyAsCurl}
                        className="px-2 py-1 border border-neutral-300 rounded-lg text-foreground"
                      >
                        복사
                      </button>
                      <AnimatedButton onClick={handleSubmit}>
                        {loading ? "요청 중..." : "요청 보내기"}
                      </AnimatedButton>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold mb-2 text-foreground">
                      curl 명령
                    </h3>
                    <pre className="bg-card p-2 rounded-lg text-xs overflow-x-auto text-card-foreground">
                      {(() => {
                        let curl = `curl -X ${requestPreview.method} "${requestPreview.url}"`;
                        Object.entries(requestPreview.headers).forEach(
                          ([key, value]) => {
                            curl += ` \\\n  -H "${key}: ${value}"`;
                          }
                        );
                        if (requestPreview.data) {
                          curl += ` \\\n  -d '${JSON.stringify(
                            requestPreview.data
                          )}'`;
                        }
                        return curl;
                      })()}
                    </pre>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">요청 정보가 없습니다.</p>
              )}
            </div>
          )}

          {/* 응답 탭 */}
          {activeTab === "response" && (
            <div>
              {response ? (
                <div>
                  <div className="flex justify-end mb-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          JSON.stringify(response, null, 2)
                        );
                        showToast({
                          title: "복사 완료",
                          description: "응답이 클립보드에 복사되었습니다.",
                        });
                      }}
                      className="px-2 py-1 border border-neutral-300 rounded-lg text-foreground"
                    >
                      응답 복사
                    </button>
                  </div>
                  <pre className="bg-card p-4 rounded-lg text-xs overflow-x-auto max-h-64 text-card-foreground">
                    {JSON.stringify(response, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="p-6 text-center text-muted-foreground">
                  아직 응답이 없습니다. API 요청을 보내면 결과가 표시됩니다.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 요청 히스토리 영역 */}
      {requestHistory.length > 0 && (
        <div className="bg-card p-4 rounded-lg shadow-lg">
          <h2 className="text-xl font-bold mb-2 text-foreground">
            요청 기록 ({requestHistory.length}개)
          </h2>
          <div className="max-h-64 overflow-y-auto">
            {requestHistory.map((item) => (
              <div
                key={item.id}
                className="p-3 border border-neutral-300 rounded-lg mb-2 cursor-pointer hover:bg-muted"
                onClick={() => loadFromHistory(item)}
              >
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-1 rounded-lg ${getBadgeVariant(
                        item.endpoint.method
                      )}`}
                    >
                      {item.endpoint.method}
                    </span>
                    <span className="truncate max-w-xs text-foreground">
                      {item.endpoint.path}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(item.timestamp).toLocaleTimeString()}{" "}
                    {item.duration && <span>{item.duration}ms</span>}
                    {item.status && (
                      <span className="ml-1 px-1 bg-primary/20 rounded-lg text-foreground">
                        {item.status}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {JSON.stringify(item.formData)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

// 렌더링
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
