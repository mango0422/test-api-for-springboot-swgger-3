// src/components/request-history.tsx

"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, ChevronUp, Clock } from "lucide-react";

interface RequestHistoryItem {
  id: string;
  timestamp: number;
  endpoint: {
    method: string;
    path: string;
    details: any;
  };
  formData: { query: Record<string, any>; body: Record<string, any> }; // 수정된 부분
  response?: any;
  status?: number;
  duration?: number;
}

interface RequestHistoryProps {
  history: RequestHistoryItem[];
  onSelect: (item: RequestHistoryItem) => void;
}

export default function RequestHistory({
  history,
  onSelect,
}: RequestHistoryProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (history.length === 0) {
    return null;
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold">요청 기록</CardTitle>
              <CardDescription>
                최근 API 요청 기록 ({history.length}개)
              </CardDescription>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-md border cursor-pointer transition-colors ${
                      selectedId === item.id ? "bg-muted" : "hover:bg-muted/50"
                    }`}
                    onClick={() => {
                      setSelectedId(item.id);
                      onSelect(item);
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={getBadgeVariant(item.endpoint.method)}>
                          {item.endpoint.method}
                        </Badge>
                        <span className="font-medium truncate max-w-[300px]">
                          {item.endpoint.path}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{formatTime(item.timestamp)}</span>
                        {item.duration && <span>{item.duration}ms</span>}
                        {item.status && (
                          <Badge variant={getStatusBadgeVariant(item.status)}>
                            {item.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {JSON.stringify(item.formData)}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

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

const getStatusBadgeVariant = (
  status: number
): "default" | "destructive" | "secondary" | "outline" | null | undefined => {
  if (status >= 200 && status < 300) {
    return "default";
  } else if (status >= 300 && status < 400) {
    return "outline";
  } else if (status >= 400) {
    return "destructive";
  } else {
    return "secondary";
  }
};
