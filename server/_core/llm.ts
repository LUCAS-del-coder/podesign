import { ENV } from "./env";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4" ;
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

const normalizeContentPart = (
  part: MessageContent
): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }

  if (part.type === "text") {
    return part;
  }

  if (part.type === "image_url") {
    return part;
  }

  if (part.type === "file_url") {
    return part;
  }

  throw new Error("Unsupported message content part");
};

const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map(part => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");

    return {
      role,
      name,
      tool_call_id,
      content,
    };
  }

  const contentParts = ensureArray(message.content).map(normalizeContentPart);

  // If there's only text content, collapse to a single string for compatibility
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text,
    };
  }

  return {
    role,
    name,
    content: contentParts,
  };
};

const normalizeToolChoice = (
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined
): "none" | "auto" | ToolChoiceExplicit | undefined => {
  if (!toolChoice) return undefined;

  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }

  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }

    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }

    return {
      type: "function",
      function: { name: tools[0].function.name },
    };
  }

  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name },
    };
  }

  return toolChoice;
};

const assertApiKey = () => {
  if (!ENV.googleGeminiApiKey) {
    throw new Error("GOOGLE_GEMINI_API_KEY must be configured");
  }
};

const normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}):
  | { type: "json_schema"; json_schema: JsonSchema }
  | { type: "text" }
  | { type: "json_object" }
  | undefined => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (
      explicitFormat.type === "json_schema" &&
      !explicitFormat.json_schema?.schema
    ) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }

  const schema = outputSchema || output_schema;
  if (!schema) return undefined;

  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }

  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...(typeof schema.strict === "boolean" ? { strict: schema.strict } : {}),
    },
  };
};

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  assertApiKey();

  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
  } = params;

  // Use Google Gemini API
  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema,
  });

  // Convert messages to Gemini format
  const geminiMessages = messages.map(msg => {
    const normalized = normalizeMessage(msg);
    const content = typeof normalized.content === "string" 
      ? normalized.content 
      : JSON.stringify(normalized.content);
    
    // Gemini uses different role names
    let role = normalized.role;
    if (role === "system") {
      // System messages need to be converted to user messages with special formatting
      return {
        role: "user" as const,
        parts: [{ text: `[系統指令] ${content}` }],
      };
    }
    
    return {
      role: role === "assistant" ? "model" : "user" as "user" | "model",
      parts: [{ text: content }],
    };
  });

  // Build request payload
  const payload: any = {
    contents: geminiMessages,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096, // Reduced for faster response
    },
  };

  // Note: gemini-pro doesn't support responseMimeType in generationConfig
  // We'll request JSON format in the prompt instead
  if (normalizedResponseFormat?.type === "json_object") {
    // Add instruction to return JSON in the last user message
    const lastMessage = geminiMessages[geminiMessages.length - 1];
    if (lastMessage && lastMessage.role === "user" && lastMessage.parts) {
      const lastPart = lastMessage.parts[lastMessage.parts.length - 1];
      if (lastPart && "text" in lastPart) {
        lastPart.text = `${lastPart.text}\n\n請以 JSON 格式回應。`;
      }
    }
  }

  // First, try to list available models to find the correct one
  // Use v1 API to list models, then use the first available one
  let apiUrl = `https://generativelanguage.googleapis.com/v1/models?key=${ENV.googleGeminiApiKey}`;
  
  try {
    const modelsResponse = await fetch(apiUrl);
    if (modelsResponse.ok) {
      const modelsData = await modelsResponse.json();
      const availableModels = modelsData.models || [];
      console.log(`[LLM] Available models: ${availableModels.map((m: any) => m.name).join(', ')}`);
      
      // Find a model that supports generateContent
      const generateContentModel = availableModels.find((m: any) => 
        m.supportedGenerationMethods?.includes('generateContent')
      );
      
      if (generateContentModel) {
        apiUrl = `https://generativelanguage.googleapis.com/v1/models/${generateContentModel.name}:generateContent?key=${ENV.googleGeminiApiKey}`;
        console.log(`[LLM] Using model: ${generateContentModel.name}`);
      } else {
        // Fallback to common model names
        throw new Error("No generateContent model found");
      }
    } else {
      throw new Error("Failed to list models");
    }
  } catch (error) {
    console.warn(`[LLM] Failed to list models, using fallback:`, error);
    // Fallback: try common model names
    apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${ENV.googleGeminiApiKey}`;
  }
  
  let response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  // If model not found, try alternative model names
  if (!response.ok) {
    const errorText = await response.text();
    const errorJson = JSON.parse(errorText);
    
    // Try gemini-1.5-flash if gemini-1.5-flash-latest fails
    if (errorJson.error?.code === 404 && apiUrl.includes("gemini-1.5-flash-latest")) {
      console.log(`[LLM] gemini-1.5-flash-latest not found, trying gemini-1.5-flash...`);
      apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${ENV.googleGeminiApiKey}`;
      response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    }
    
    // If still fails, try gemini-1.5-pro
    if (!response.ok) {
      const errorText2 = await response.text();
      const errorJson2 = JSON.parse(errorText2);
      if (errorJson2.error?.code === 404 && apiUrl.includes("gemini-1.5-flash")) {
        console.log(`[LLM] gemini-1.5-flash not found, trying gemini-1.5-pro...`);
        apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${ENV.googleGeminiApiKey}`;
        response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      }
    }
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} – ${errorText}`
    );
  }

  const geminiResponse = await response.json();
  
  // Convert Gemini response to our format
  const result: InvokeResult = {
    id: `gemini-${Date.now()}`,
    created: Math.floor(Date.now() / 1000),
    model: geminiResponse.model || modelName || "gemini-1.5-flash",
    choices: geminiResponse.candidates?.map((candidate: any, index: number) => ({
      index,
      message: {
        role: "assistant" as Role,
        content: candidate.content?.parts?.[0]?.text || "",
      },
      finish_reason: candidate.finishReason || null,
    })) || [],
    usage: geminiResponse.usageMetadata ? {
      prompt_tokens: geminiResponse.usageMetadata.promptTokenCount || 0,
      completion_tokens: geminiResponse.usageMetadata.candidatesTokenCount || 0,
      total_tokens: geminiResponse.usageMetadata.totalTokenCount || 0,
    } : undefined,
  };

  return result;
}
