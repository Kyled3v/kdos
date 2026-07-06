import { NextResponse } from "next/server";
import { aiGateway } from "@/core/workforce/gateway/AIGateway";
import { OpenAIProvider } from "@/core/workforce/gateway/OpenAIProvider";

interface ExecuteRequestBody {
  prompt?: unknown;
}

function ensureProviderRegistered(): void {
  if (aiGateway.listProviders().length === 0) {
    aiGateway.registerProvider(
      new OpenAIProvider({
        defaultModel: "gpt-5",
      })
    );
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: ExecuteRequestBody;

  try {
    body = (await request.json()) as ExecuteRequestBody;
  } catch {
    return NextResponse.json(
      { success: false, error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const { prompt } = body;

  if (typeof prompt !== "string") {
    return NextResponse.json(
      { success: false, error: "Field \"prompt\" is required and must be a string." },
      { status: 400 }
    );
  }

  if (prompt.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: "Field \"prompt\" must not be empty." },
      { status: 400 }
    );
  }

  try {
    ensureProviderRegistered();

    const aiResponse = await aiGateway.generate({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    return NextResponse.json(
      { success: true, response: aiResponse.content },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred.";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}