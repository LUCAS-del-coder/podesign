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
  // Use Gemini 2.x series models
  // 優先使用穩定版本，實驗版本可能不在免費層
  const modelNames = [
    "gemini-2.0-flash", // 穩定版本，優先使用
    "gemini-1.5-pro-latest", // Fallback
    "gemini-2.0-flash-exp", // 實驗版本，最後嘗試（可能不在免費層）
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
      const errorMessage = error.message || String(error);
      console.warn(`[LLM] Model ${modelName} failed:`, errorMessage);
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // 處理速率限制錯誤（429）- 嘗試下一個模型或等待重試
      if (errorMessage.includes("429") || 
          errorMessage.includes("quota") || 
          errorMessage.includes("rate limit") ||
          errorMessage.includes("Too Many Requests")) {
        console.warn(`[LLM] Rate limit exceeded for ${modelName}, trying next model...`);
        
        // 如果是第一個模型（穩定版本）也遇到速率限制，等待後重試
        if (modelName === "gemini-2.0-flash") {
          // 提取重試延遲時間
          const retryDelayMatch = errorMessage.match(/retry in ([\d.]+)s/i);
          if (retryDelayMatch) {
            const delaySeconds = Math.ceil(parseFloat(retryDelayMatch[1]));
            console.log(`[LLM] Waiting ${delaySeconds} seconds before retry...`);
            await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
            
            // 重試一次
            try {
              const model = client.getGenerativeModel({ 
                model: modelName,
                generationConfig: {
                  temperature: 0.7,
                  maxOutputTokens: 4096,
                },
              });
              
              const prompt = geminiMessages.map(msg => {
                const text = msg.parts.map(p => p.text).join(" ");
                return msg.role === "model" ? `Assistant: ${text}` : `User: ${text}`;
              }).join("\n\n");
              
              const response = await model.generateContent(prompt);
              const responseText = response.response.text();
              
              if (responseText) {
                usedModel = modelName;
                console.log(`[LLM] Successfully using model: ${modelName} after retry`);
                
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
              }
            } catch (retryError) {
              // 重試也失敗，繼續嘗試下一個模型
              console.warn(`[LLM] Retry also failed for ${modelName}, trying next model...`);
              continue;
            }
          } else {
            // 沒有重試延遲資訊，直接嘗試下一個模型
            continue;
          }
        } else {
          // 其他模型遇到速率限制，直接嘗試下一個
          continue;
        }
      }
      
      // 如果是 404 或模型不存在錯誤，嘗試下一個模型
      if (errorMessage.includes("404") || 
          errorMessage.includes("not found") || 
          errorMessage.includes("NOT_FOUND")) {
        continue;
      }
      
      // 對於其他錯誤，如果是第一個模型失敗，嘗試下一個；否則拋出
      if (modelName === modelNames[0]) {
        continue; // 第一個模型失敗，嘗試下一個
      } else {
        throw error; // 其他模型失敗，拋出錯誤
      }
    }
  }
  
  if (!result) {
    throw new Error(`LLM invoke failed: All models failed. Last error: ${lastError?.message}. Please check GOOGLE_GEMINI_API_KEY is correctly set in Railway.`);
  }
  
  return result;
}
