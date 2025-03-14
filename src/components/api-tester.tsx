"use client";

import type React from "react";
import { useEffect, useState } from "react";
import axios from "axios";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import RequestPreview from "./request-preview";
import ResponseViewer from "./response-viewer";
import RequestHistory from "./request-history";

// $ref 해석 함수: schema에 $ref가 있으면 apiDocs.components.schemas에서 찾아 반환
function resolveSchema(schema: any, apiDocs: any): any {
  if (schema && schema.$ref && apiDocs) {
    const refPath = schema.$ref.replace(/^#\//, "").split("/");
    let result = apiDocs;
    for (const part of refPath) {
      result = result[part];
      if (!result) break;
    }
    return result;
  }
  return schema;
}

interface ApiParameter {
  name: string;
  in: string;
  required: boolean;
  schema: {
    type: string;
    default?: any;
  };
  description?: string;
}

interface ApiEndpoint {
  method: string;
  path: string;
  details: {
    summary?: string;
    parameters?: ApiParameter[];
    requestBody?: {
      content?: {
        "application/json"?: {
          schema: any; // $ref 포함 가능
        };
      };
    };
  };
}

interface RequestHistoryItem {
  id: string;
  timestamp: number;
  endpoint: ApiEndpoint;
  formData: { query: Record<string, any>; body: Record<string, any> };
  response?: any;
  status?: number;
  duration?: number;
}

export default function ApiTester() {
  const { toast } = useToast();
  const [baseURL, setBaseURL] = useState("http://localhost:8080");
  const [apiDocsUrl, setApiDocsUrl] = useState("/v3/api-docs");
  const [apiDocs, setApiDocs] = useState<any>(null);
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(
    null
  );
  const [formData, setFormData] = useState<{
    query: Record<string, any>;
    body: Record<string, any>;
  }>({
    query: {} as Record<string, any>,
    body: {} as Record<string, any>,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [requestHistory, setRequestHistory] = useState<RequestHistoryItem[]>(
    []
  );
  const [requestPreview, setRequestPreview] = useState<{
    url: string;
    method: string;
    headers: Record<string, string>;
    data?: any;
  } | null>(null);
  const [activeTab, setActiveTab] = useState("request");

  // API 문서 로드
  const fetchApiDocs = async () => {
    setLoading(true);
    setApiError(null);
    try {
      const fullUrl = `${baseURL}${apiDocsUrl}`;
      const res = await axios.get(fullUrl);
      setApiDocs(res.data);
      const paths = res.data.paths || {};
      const processedEndpoints = Object.entries(paths).flatMap(
        ([path, methods]: [string, any]) =>
          Object.entries(methods).map(([method, details]: [string, any]) => ({
            method: method.toUpperCase(),
            path,
            details,
            summary: details.summary || `${method.toUpperCase()} ${path}`,
          }))
      );
      setEndpoints(processedEndpoints);
      toast({
        title: "API 문서 로드 완료",
        description: `${processedEndpoints.length}개의 엔드포인트를 찾았습니다.`,
      });
    } catch (error) {
      console.error("API 문서 가져오기 에러:", error);
      setApiError(
        `API 문서를 가져오는 데 실패했습니다: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      toast({
        title: "API 문서 로드 실패",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApiDocs();
  }, []);

  // 엔드포인트 선택 시 Query 파라미터와 Request Body 초기화 ($ref 해석 포함)
  const handleSelectEndpoint = (value: string) => {
    if (!value) {
      setSelectedEndpoint(null);
      setFormData({
        query: {} as Record<string, any>,
        body: {} as Record<string, any>,
      });
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
    const initialData = {
      query: {} as Record<string, any>,
      body: {} as Record<string, any>,
    };
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
        initialData.body[key] =
          requestBodySchema.properties[key].default !== undefined
            ? requestBodySchema.properties[key].default
            : getDefaultValueByType(requestBodySchema.properties[key].type);
      });
    }
    setFormData(initialData);
    setErrors({});
    setResponse(null);
    setApiError(null);
    updateRequestPreview(endpoint, initialData);
  };

  // URL, headers, data 구성
  const updateRequestPreview = (
    endpoint: ApiEndpoint,
    data: { query: Record<string, any>; body: Record<string, any> }
  ) => {
    let url = baseURL + endpoint.path;
    const headers = { "Content-Type": "application/json" };
    const queryParams: Record<string, any> = {};
    let bodyData: Record<string, any> = {};
    if (endpoint.details.parameters) {
      endpoint.details.parameters.forEach((param) => {
        if (
          data.query[param.name] !== undefined &&
          data.query[param.name] !== ""
        ) {
          // 경로, 쿼리 모두 처리
          queryParams[param.name] = data.query[param.name];
        }
      });
    }
    // URL 내 path 파라미터 대체
    Object.keys(data.query ?? {}).forEach((key) => {
      if (
        url.includes(`{${key}}`) &&
        data.query[key] !== undefined &&
        data.query[key] !== ""
      ) {
        url = url.replace(
          `{${key}}`,
          encodeURIComponent(String(data.query[key]))
        );
      }
    });
    if (endpoint.method !== "GET" && data.body) {
      bodyData = { ...data.body };
    }
    const queryString = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, value]) => {
      queryString.append(key, String(value));
    });
    if (queryString.toString()) {
      url += (url.includes("?") ? "&" : "?") + queryString.toString();
    }
    setRequestPreview({
      url,
      method: endpoint.method,
      headers,
      data: Object.keys(bodyData).length > 0 ? bodyData : undefined,
    });
  };

  // Query 파라미터 변경 처리
  const handleQueryChange = (key: string, value: any) => {
    let convertedValue = value;
    let error = null;
    if (selectedEndpoint) {
      const paramInfo = selectedEndpoint.details.parameters?.find(
        (p) => p.name === key
      );
      const paramType = paramInfo?.schema?.type || "string";
      const required = paramInfo?.required || false;
      if (value === "" && required) {
        error = "필수 입력 필드입니다.";
      } else if (value !== "") {
        switch (paramType) {
          case "integer":
            if (!/^-?\d+$/.test(value)) {
              error = "정수를 입력해주세요.";
            } else {
              convertedValue = Number.parseInt(value, 10);
            }
            break;
          case "number":
            if (!/^-?\d+(\.\d+)?$/.test(value)) {
              error = "숫자를 입력해주세요.";
            } else {
              convertedValue = Number.parseFloat(value);
            }
            break;
          case "boolean":
            if (typeof value === "string" && !/^(true|false)$/i.test(value)) {
              error = "true 또는 false를 입력해주세요.";
            } else if (typeof value === "string") {
              convertedValue = value.toLowerCase() === "true";
            }
            break;
          default:
            break;
        }
      }
    }
    const newFormData = {
      ...formData,
      query: { ...formData.query, [key]: convertedValue },
    };
    setFormData(newFormData);
    if (error) {
      setErrors((prev) => ({ ...prev, [key]: error }));
    } else {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
    if (selectedEndpoint) {
      updateRequestPreview(selectedEndpoint, newFormData);
    }
  };

  // Request Body 변경 처리 ($ref 해석 포함)
  const handleBodyChange = (key: string, value: any) => {
    let convertedValue = value;
    let error = null;
    if (selectedEndpoint) {
      const rawSchema =
        selectedEndpoint.details.requestBody?.content?.["application/json"]
          ?.schema;
      const requestBodySchema = rawSchema
        ? resolveSchema(rawSchema, apiDocs)
        : null;
      const properties = requestBodySchema?.properties;
      const paramType =
        properties && properties[key]
          ? properties[key].type || "string"
          : "string";
      const required =
        properties &&
        properties[key] &&
        requestBodySchema?.required?.includes(key);
      if (value === "" && required) {
        error = "필수 입력 필드입니다.";
      } else if (value !== "") {
        switch (paramType) {
          case "integer":
            if (!/^-?\d+$/.test(value)) {
              error = "정수를 입력해주세요.";
            } else {
              convertedValue = Number.parseInt(value, 10);
            }
            break;
          case "number":
            if (!/^-?\d+(\.\d+)?$/.test(value)) {
              error = "숫자를 입력해주세요.";
            } else {
              convertedValue = Number.parseFloat(value);
            }
            break;
          case "boolean":
            if (typeof value === "string" && !/^(true|false)$/i.test(value)) {
              error = "true 또는 false를 입력해주세요.";
            } else if (typeof value === "string") {
              convertedValue = value.toLowerCase() === "true";
            }
            break;
          default:
            break;
        }
      }
    }
    const newFormData = {
      ...formData,
      body: { ...formData.body, [key]: convertedValue },
    };
    setFormData(newFormData);
    if (error) {
      setErrors((prev) => ({ ...prev, [key]: error }));
    } else {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
    if (selectedEndpoint) {
      updateRequestPreview(selectedEndpoint, newFormData);
    }
  };

  // 전체 폼 검증 (Query와 Body)
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    let isValid = true;
    if (selectedEndpoint) {
      if (selectedEndpoint.details.parameters) {
        selectedEndpoint.details.parameters.forEach((param) => {
          if (
            param.required &&
            (!formData.query[param.name] || formData.query[param.name] === "")
          ) {
            newErrors[param.name] = "필수 입력 필드입니다.";
            isValid = false;
          }
        });
      }
      if (
        selectedEndpoint.details.requestBody?.content?.["application/json"]
          ?.schema
      ) {
        const requestBodySchema = resolveSchema(
          selectedEndpoint.details.requestBody.content["application/json"]
            .schema,
          apiDocs
        );
        if (requestBodySchema?.required) {
          requestBodySchema.required.forEach((key: string) => {
            if (
              !formData.body[key] &&
              formData.body[key] !== 0 &&
              formData.body[key] !== false
            ) {
              newErrors[key] = "필수 입력 필드입니다.";
              isValid = false;
            }
          });
        }
      }
    }
    setErrors((prev) => ({ ...prev, ...newErrors }));
    return isValid;
  };

  // 요청 전송
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEndpoint || !requestPreview) return;
    if (!validateForm()) return;
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
      const historyItem: RequestHistoryItem = {
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
      toast({
        title: "요청 성공",
        description: `${res.status} ${res.statusText} (${duration}ms)`,
      });
    } catch (error) {
      console.error("요청 에러:", error);
      const errorMessage = axios.isAxiosError(error)
        ? `${error.response?.status || ""} ${error.message}`
        : String(error);
      setApiError(`API 요청 실패: ${errorMessage}`);
      setResponse(null);
      toast({
        title: "요청 실패",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // 히스토리에서 선택 시 해당 기록 복원
  const loadFromHistory = (item: RequestHistoryItem) => {
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
    toast({
      title: "복사 완료",
      description: "curl 명령이 클립보드에 복사되었습니다.",
    });
  };

  // Helper: getDefaultValueByType
  const getDefaultValueByType = (type: string) => {
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

  // Helper: getBadgeVariant (HTTP 메소드별)
  const getBadgeVariant = (
    method: string
  ): "default" | "destructive" | "secondary" | "outline" | null | undefined => {
    switch (method) {
      case "GET":
        return "default";
      case "POST":
        return "secondary";
      case "PUT":
        return "outline";
      case "DELETE":
        return "destructive";
      default:
        return "default";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-2xl font-bold">REST API 테스트</CardTitle>
          <CardDescription>
            OpenAPI 문서를 기반으로 API 요청을 테스트하고 응답을 확인하세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="baseUrl">API 서버 URL</Label>
              <div className="flex gap-2">
                <Input
                  id="baseUrl"
                  value={baseURL}
                  onChange={(e) => setBaseURL(e.target.value)}
                  placeholder="http://localhost:8080"
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiDocsUrl">API 문서 경로</Label>
              <div className="flex gap-2">
                <Input
                  id="apiDocsUrl"
                  value={apiDocsUrl}
                  onChange={(e) => setApiDocsUrl(e.target.value)}
                  placeholder="/v3/api-docs"
                  className="flex-1"
                />
                <Button onClick={fetchApiDocs} disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "로드"
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <Label htmlFor="endpoint">API 엔드포인트</Label>
            <Select onValueChange={handleSelectEndpoint} disabled={loading}>
              <SelectTrigger id="endpoint" className="mt-1">
                <SelectValue placeholder="엔드포인트 선택" />
              </SelectTrigger>
              <SelectContent>
                {endpoints.map((ep, index) => (
                  <SelectItem key={index} value={`${ep.method} ${ep.path}`}>
                    <div className="flex items-center gap-2">
                      <Badge variant={getBadgeVariant(ep.method)}>
                        {ep.method}
                      </Badge>
                      <span>{ep.path}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {apiError && (
            <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              {apiError}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedEndpoint && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="request">요청</TabsTrigger>
            <TabsTrigger value="preview">미리보기</TabsTrigger>
            <TabsTrigger value="response">응답</TabsTrigger>
          </TabsList>

          {/* 요청 탭: Query Parameters와 Request Body 모두 표시 */}
          <TabsContent value="request" className="mt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {selectedEndpoint.details.parameters &&
                selectedEndpoint.details.parameters.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold mb-2">Parameters</h3>
                    {selectedEndpoint.details.parameters.map((param) => {
                      const paramType = param.schema?.type || "string";
                      const required = param.required;
                      const description = param.description || "";
                      const value =
                        formData.query[param.name] !== undefined
                          ? formData.query[param.name]
                          : "";
                      return (
                        <div key={param.name} className="space-y-1">
                          <Label htmlFor={`param-${param.name}`}>
                            {param.name}
                            {required && (
                              <span className="text-destructive ml-1">*</span>
                            )}
                          </Label>
                          {paramType === "boolean" ? (
                            <Select
                              value={
                                value === true
                                  ? "true"
                                  : value === false
                                  ? "false"
                                  : ""
                              }
                              onValueChange={(val) =>
                                handleQueryChange(param.name, val === "true")
                              }
                            >
                              <SelectTrigger id={`param-${param.name}`}>
                                <SelectValue placeholder="선택" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="true">true</SelectItem>
                                <SelectItem value="false">false</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              id={`param-${param.name}`}
                              value={value}
                              onChange={(e) =>
                                handleQueryChange(param.name, e.target.value)
                              }
                              placeholder={description || param.name}
                            />
                          )}
                          {description && (
                            <p className="text-xs text-muted-foreground">
                              {description}
                            </p>
                          )}
                          {errors[param.name] && (
                            <p className="text-xs text-destructive">
                              {errors[param.name]}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

              {(() => {
                const rawSchema =
                  selectedEndpoint.details.requestBody?.content?.[
                    "application/json"
                  ]?.schema;
                const requestBodySchema = rawSchema
                  ? resolveSchema(rawSchema, apiDocs)
                  : null;
                if (!requestBodySchema || !requestBodySchema.properties)
                  return null;
                return (
                  <div className="mt-4">
                    <h3 className="text-lg font-bold mb-2">Request Body</h3>
                    {Object.keys(requestBodySchema.properties).map((key) => {
                      const property = requestBodySchema.properties[key];
                      const paramType = property?.type ?? "string";
                      const required =
                        requestBodySchema.required?.includes(key) ?? false;
                      const description = property?.description ?? "";
                      const value =
                        formData.body[key] !== undefined
                          ? formData.body[key]
                          : "";
                      return (
                        <div key={key} className="space-y-1">
                          <Label htmlFor={`body-${key}`}>
                            {key}
                            {required && (
                              <span className="text-destructive ml-1">*</span>
                            )}
                          </Label>
                          {paramType === "boolean" ? (
                            <Select
                              value={
                                value === true
                                  ? "true"
                                  : value === false
                                  ? "false"
                                  : ""
                              }
                              onValueChange={(val) =>
                                handleBodyChange(key, val === "true")
                              }
                            >
                              <SelectTrigger id={`body-${key}`}>
                                <SelectValue placeholder="선택" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="true">true</SelectItem>
                                <SelectItem value="false">false</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              id={`body-${key}`}
                              value={
                                typeof value === "object"
                                  ? JSON.stringify(value)
                                  : value
                              }
                              onChange={(e) =>
                                handleBodyChange(key, e.target.value)
                              }
                              placeholder={description || key}
                            />
                          )}
                          {description && (
                            <p className="text-xs text-muted-foreground">
                              {description}
                            </p>
                          )}
                          {errors[key] && (
                            <p className="text-xs text-destructive">
                              {errors[key]}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab("preview")}
                >
                  미리보기
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      요청 중...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      요청 보내기
                    </>
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>

          {/* 미리보기 탭 */}
          <TabsContent value="preview" className="mt-4">
            {requestPreview ? (
              <RequestPreview
                request={requestPreview}
                onCopy={copyAsCurl}
                onSend={handleSubmit}
                loading={loading}
              />
            ) : (
              <p className="text-muted-foreground">요청 정보가 없습니다.</p>
            )}
          </TabsContent>

          {/* 응답 탭 */}
          <TabsContent value="response" className="mt-4">
            <ResponseViewer response={response} />
          </TabsContent>
        </Tabs>
      )}

      <RequestHistory history={requestHistory} onSelect={loadFromHistory} />
    </div>
  );
}

// Helper: getBadgeVariant (HTTP 메소드별)
const getBadgeVariant = (
  method: string
): "default" | "destructive" | "secondary" | "outline" | null | undefined => {
  switch (method) {
    case "GET":
      return "default";
    case "POST":
      return "secondary";
    case "PUT":
      return "outline";
    case "DELETE":
      return "destructive";
    default:
      return "default";
  }
};

// Helper: getDefaultValueByType
function getDefaultValueByType(type: string) {
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
}
