import { ENV } from "./env";
import { GoogleGenerativeAI } from "@google/generative-ai";

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

// Initialize Gemini client (singleton)
let geminiClient: GoogleGenerativeAI | null = null;

const getGeminiClient = (): GoogleGenerativeAI => {
  if (geminiClient) {
    return geminiClient;
  }
  assertApiKey();
  geminiClient = new GoogleGenerativeAI(ENV.googleGeminiApiKey);
  return geminiClient;
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

  // Use official SDK instead of direct REST API calls
  const client = getGeminiClient();
  
  // Note: Gemini 1.5 series was deprecated in September 2025
  // Use Gemini 2.x or 3.x series models
  const modelNames = [
    "gemini-2.0-flash-exp", // Experimental, latest
    "gemini-2.0-flash",
    "gemini-1.5-pro-latest", // Fallback (may still work)
  ];
  
  let lastError: Error | null = null;
  let usedModel = "";
  let result: InvokeResult | null = null;
  
  for (const modelName of modelNames) {
    try {
      console.log(`[LLM] Trying model: ${modelName}`);
      const model = client.getGenerativeModel({ 
        model: modelName,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
        },
      });
      
      // Use generateContent instead of chat for simpler API
      // Combine all messages into a single prompt
      const prompt = geminiMessages.map(msg => {
        const text = msg.parts.map(p => p.text).join(" ");
        return msg.role === "model" ? `Assistant: ${text}` : `User: ${text}`;
      }).join("\n\n");
      
      const response = await model.generateContent(prompt);
      const responseText = response.response.text();
      
      if (!responseText) {
        throw new Error("Gemini 未返回內容");
      }
      
      usedModel = modelName;
      console.log(`[LLM] Successfully using model: ${modelName}`);
      
      // Convert SDK response to our format
      result = {
        id: `gemini-${Date.now()}`,
        created: Math.floor(Date.now() / 1000),
        model: modelName,
        choices: [{
          index: 0,
          message: {
            role: "assistant" as Role,
            content: responseText,
          },
          finish_reason: response.response.candidates?.[0]?.finishReason || null,
        }],
        usage: response.response.usageMetadata ? {
          prompt_tokens: response.response.usageMetadata.promptTokenCount || 0,
          completion_tokens: response.response.usageMetadata.candidatesTokenCount || 0,
          total_tokens: response.response.usageMetadata.totalTokenCount || 0,
        } : undefined,
      };
      
      break;
    } catch (error: any) {
      console.warn(`[LLM] Model ${modelName} failed:`, error.message || error);
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // If it's a 404 or model not found error, try next model
      if (error.message?.includes("404") || 
          error.message?.includes("not found") || 
          error.message?.includes("NOT_FOUND") ||
          error.message?.includes("404")) {
        continue;
      }
      
      // For other errors, throw immediately
      throw error;
    }
  }
  
  if (!result) {
    throw new Error(`LLM invoke failed: All models failed. Last error: ${lastError?.message}. Please check GOOGLE_GEMINI_API_KEY is correctly set in Railway.`);
  }
  
  const geminiResponse = { model: usedModel, candidates: result.choices };
  
  // Convert Gemini response to our format
  const result: InvokeResult = {
    id: `gemini-${Date.now()}`,
    created: Math.floor(Date.now() / 1000),
    model: geminiResponse.model || usedModel || "gemini-1.5-flash",
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
