// Helper function to get default value by type
export function getDefaultValueByType(type: string) {
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

// Helper function to get badge variant based on HTTP method
export function getBadgeVariantByMethod(method: string) {
  switch (method.toUpperCase()) {
    case "GET":
      return "default";
    case "POST":
      return "success";
    case "PUT":
      return "warning";
    case "DELETE":
      return "destructive";
    default:
      return "secondary";
  }
}

// Helper function to get badge variant based on HTTP status
export function getBadgeVariantByStatus(status: number) {
  if (status >= 200 && status < 300) {
    return "success";
  } else if (status >= 300 && status < 400) {
    return "warning";
  } else if (status >= 400) {
    return "destructive";
  } else {
    return "secondary";
  }
}

// Format JSON with indentation
export function formatJson(obj: any) {
  return JSON.stringify(obj, null, 2);
}

// Generate curl command from request
export function generateCurlCommand(request: {
  url: string;
  method: string;
  headers: Record<string, string>;
  data?: any;
}) {
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
}
