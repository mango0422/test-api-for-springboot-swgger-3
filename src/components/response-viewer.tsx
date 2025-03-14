// src/components/response-viewer.tsx

"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ResponseViewerProps {
  response: any;
}

export default function ResponseViewer({ response }: ResponseViewerProps) {
  const { toast } = useToast();

  const copyResponse = () => {
    if (!response) return;

    navigator.clipboard.writeText(JSON.stringify(response, null, 2));
    toast({
      title: "복사 완료",
      description: "응답이 클립보드에 복사되었습니다.",
    });
  };

  if (!response) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          아직 응답이 없습니다. API 요청을 보내면 여기에 결과가 표시됩니다.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={copyResponse}>
          <Copy className="h-4 w-4 mr-2" />
          응답 복사
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <pre className="text-xs font-mono bg-muted p-4 rounded-md overflow-x-auto max-h-[500px]">
            {JSON.stringify(response, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
