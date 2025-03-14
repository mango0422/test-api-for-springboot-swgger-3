// src/components/request-preview.tsx

"use client";

import type React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Send, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface RequestPreviewProps {
  request: {
    url: string;
    method: string;
    headers: Record<string, string>;
    data?: any;
  };
  onCopy: () => void;
  onSend: (e: React.FormEvent) => void;
  loading: boolean;
}

export default function RequestPreview({
  request,
  onCopy,
  onSend,
  loading,
}: RequestPreviewProps) {
  // Format JSON with syntax highlighting
  const formatJson = (obj: any) => {
    return JSON.stringify(obj, null, 2);
  };

  // Generate curl command
  const getCurlCommand = () => {
    let curl = `curl -X ${request.method} "${request.url}"`;

    // Add headers
    Object.entries(request.headers).forEach(([key, value]) => {
      curl += ` \\\n  -H "${key}: ${value}"`;
    });

    // Add body
    if (request.data) {
      curl += ` \\\n  -d '${JSON.stringify(request.data)}'`;
    }

    return curl;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={getBadgeVariant(request.method)}>
            {request.method}
          </Badge>
          <span className="text-sm font-mono break-all">{request.url}</span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onCopy}>
            <Copy className="h-4 w-4 mr-2" />
            복사
          </Button>
          <Button size="sm" onClick={onSend} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                요청 중...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                요청 보내기
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="curl">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="curl">curl</TabsTrigger>
          <TabsTrigger value="headers">Headers</TabsTrigger>
          <TabsTrigger value="body">Body</TabsTrigger>
        </TabsList>
        <TabsContent value="curl">
          <Card>
            <CardContent className="p-4">
              <pre className="text-xs font-mono bg-muted p-4 rounded-md overflow-x-auto">
                {getCurlCommand()}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="headers">
          <Card>
            <CardContent className="p-4">
              <pre className="text-xs font-mono bg-muted p-4 rounded-md overflow-x-auto">
                {formatJson(request.headers)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="body">
          <Card>
            <CardContent className="p-4">
              {request.data ? (
                <pre className="text-xs font-mono bg-muted p-4 rounded-md overflow-x-auto">
                  {formatJson(request.data)}
                </pre>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  요청 본문이 없습니다.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper function to get badge variant based on HTTP method
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
