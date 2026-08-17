import { GoogleGenAI } from "@google/genai";

type RequestBody = {
  prompt?: string;
  systemPrompt?: string;
  model?: string;
};

export default async function handler(
  req: Request
): Promise<Response> {
  try {
    if (req.method !== "POST") {
      return json(
        { error: "Method not allowed." },
        405
      );
    }

    const body = (await req.json()) as RequestBody;

    if (
      !body ||
      typeof body.prompt !== "string" ||
      !body.prompt.trim()
    ) {
      return json(
        { error: "prompt is required." },
        400
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return json(
        {
          error:
            "GEMINI_API_KEY is not configured.",
        },
        500
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
    });

    const model =
      body.model?.trim() || "gemini-2.5-flash";

    const response = await ai.models.generateContent({
      model,
      contents: body.prompt,
      config: body.systemPrompt?.trim()
        ? {
            systemInstruction:
              body.systemPrompt.trim(),
          }
        : undefined,
    });

    return json({
      success: true,
      model,
      text: response.text ?? "",
    });
  } catch (error) {
    console.error("GEMINI FUNCTION ERROR:", error);

    return json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Gemini request failed.",
      },
      500
    );
  }
}

function json(
  data: unknown,
  status = 200
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}