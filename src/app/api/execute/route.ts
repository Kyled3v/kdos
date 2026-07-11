import { aiGateway } from "@/core/workforce/gateway/AIGateway";
import { OpenRouterProvider } from "@/core/workforce/gateway/OpenRouterProvider";

interface ExecuteRequestBody {
  prompt?: unknown;
}

function ensureProviderRegistered(): void {
  if (aiGateway.listProviders().length === 0) {
    aiGateway.registerProvider(new OpenRouterProvider());
  }
}

export async function POST(request: Request): Promise<Response> {
  let body: ExecuteRequestBody;

  try {
    body = (await request.json()) as ExecuteRequestBody;
  } catch {
    return Response.json(
      { success: false, error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const { prompt } = body;

  if (typeof prompt !== "string") {
    return Response.json(
      { success: false, error: "Field \"prompt\" is required and must be a string." },
      { status: 400 }
    );
  }

  if (prompt.trim().length === 0) {
    return Response.json(
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

    return Response.json({ success: true, response: aiResponse.content });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred.";

    return Response.json({ success: false, error: message }, { status: 500 });
  }
}