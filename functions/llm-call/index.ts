import { GoogleGenAI } from "@google/genai";

type RequestBody = {
  prompt?: string;
  systemPrompt?: string;
  model?: string;
};

type NhostRequest = {
  method: string;
  body?: RequestBody;
};

type NhostResponse = {
  setHeader: (
    name: string,
    value: string
  ) => void;
  status: (
    code: number
  ) => NhostResponse;
  json: (
    body: unknown
  ) => NhostResponse;
  send: (
    body?: unknown
  ) => NhostResponse;
};

function setCors(
  res: NhostResponse
) {
  res.setHeader(
    "Access-Control-Allow-Origin",
    "*"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "POST, OPTIONS"
  );
}

export default async function handler(
  req: NhostRequest,
  res: NhostResponse
): Promise<NhostResponse> {
  setCors(res);

  // Handle browser CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(204).send();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed.",
    });
  }

  try {
    const body = req.body;

    if (
      !body ||
      typeof body.prompt !== "string" ||
      !body.prompt.trim()
    ) {
      return res.status(400).json({
        success: false,
        error: "prompt is required.",
      });
    }

    const apiKey =
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error(
        "GEMINI_API_KEY is not configured."
      );

      return res.status(500).json({
        success: false,
        error:
          "GEMINI_API_KEY is not configured.",
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
    });

    const model =
      body.model?.trim() ||
      "gemini-2.5-flash";

    const response =
      await ai.models.generateContent({
        model,
        contents: body.prompt,
        config: body.systemPrompt?.trim()
          ? {
              systemInstruction:
                body.systemPrompt.trim(),
            }
          : undefined,
      });

    return res.status(200).json({
      success: true,
      model,
      text: response.text ?? "",
    });
  } catch (error) {
    console.error(
      "GEMINI FUNCTION ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gemini request failed.",
    });
  }
}