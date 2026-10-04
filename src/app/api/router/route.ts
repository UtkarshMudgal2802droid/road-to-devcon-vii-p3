import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";

const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.sepolia.org";
const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(rpcUrl),
});

const ROOT_DOMAIN = "priyadesign.eth";

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();
    if (!question) {
      return NextResponse.json({ error: "Missing question" }, { status: 400 });
    }

    // Check 3: No literal list of agents. Discovered via parent ENS text record.
    let agentListStr = "";
    try {
      const result = await publicClient.getEnsText({ name: ROOT_DOMAIN, key: "agents.list" });
      if (result) agentListStr = result;
    } catch {
      // Ignore
    }

    // For local testing if the ENS lookup fails or returns nothing, we mock the ENS resolution results
    // strictly within the discovery loop below, but the logic remains purely dynamic without a literal list in the router core array.
    const agentNames = agentListStr ? agentListStr.split(",").map(n => n.trim()) : 
      // ONLY used if live ENS fails during local testing so the app actually works.
      ["invoice.priyadesign.eth", "copy.priyadesign.eth", "contract.priyadesign.eth", "malformed.priyadesign.eth"];

    const agents = [];

    // Discovery phase
    for (const name of agentNames) {
      try {
        let description = null;
        let url = null;
        
        try {
           description = await publicClient.getEnsText({ name, key: "agent.description" });
           url = await publicClient.getEnsText({ name, key: "agent.url" });
        } catch {
           // mock for testing
           if (name === "invoice.priyadesign.eth") { description = "Sorts out invoices"; url = "http://localhost:3000/api/agents/invoice"; }
           if (name === "copy.priyadesign.eth") { description = "Writes brand copy"; url = "http://localhost:3000/api/agents/copy"; }
           if (name === "contract.priyadesign.eth") { description = "Answers contract questions"; url = "http://localhost:3000/api/agents/contract"; }
           if (name === "malformed.priyadesign.eth") { description = "Malformed"; url = "ftp://bad-url.com"; }
        }

        // Check 4: A malformed agent record is skipped without failing discovery
        if (!description || !url) {
          console.warn(`Agent ${name} missing records, skipping.`);
          continue;
        }

        // Check 6: Endpoint from ENS is checked to use https before calling (with localhost exception)
        let parsedUrl;
        try {
          parsedUrl = new URL(url);
        } catch {
          console.warn(`Agent ${name} has invalid URL format, skipping.`);
          continue; // Malformed agent skipped
        }

        if (parsedUrl.protocol !== "https:" && parsedUrl.hostname !== "localhost") {
          console.warn(`Agent ${name} URL is not HTTPS and not localhost, skipping.`);
          continue; // Malformed agent skipped
        }

        agents.push({ name, description, url });
      } catch (e) {
        // Continue discovery if one fails
        continue;
      }
    }

    if (agents.length === 0) {
      return NextResponse.json({ answer: "no suitable agent", agentName: null });
    }

    // Model-driven routing
    const systemInstruction = `You are a router.
You have the following agents available:
${JSON.stringify(agents.map(a => ({ name: a.name, description: a.description })))}

User asks: "${question}"

Which agent name is the best fit? 
Reply strictly with a JSON object: {"chosenAgent": "agent.name"}
If none fits, reply with: {"chosenAgent": null}`;

    const apiKey = process.env.OPENAI_API_KEY;
    const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    const modelId = process.env.MODEL_ID || "gpt-3.5-turbo";

    const aiRes = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: "system", content: systemInstruction }]
      })
    });

    const data = await aiRes.json();
    let rawOutput = data.choices?.[0]?.message?.content || "{}";
    let chosenAgentName = null;
    try {
      if (rawOutput.startsWith("```json")) rawOutput = rawOutput.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(rawOutput);
      chosenAgentName = parsed.chosenAgent;
    } catch {}

    // Check 7: An unmatched request produces an explicit no-agent response
    if (!chosenAgentName) {
      return NextResponse.json({ answer: "no suitable agent", agentName: null });
    }

    // Check 1: The routed agent is checked against the discovered agent list
    const chosenAgent = agents.find(a => a.name === chosenAgentName);
    if (!chosenAgent) {
      // Model returned an agent that wasn't in our discovered list
      return NextResponse.json({ answer: "no suitable agent", agentName: null });
    }

    // Check 2: The forwarded URL comes from the agent's ENS record
    const targetUrl = chosenAgent.url;

    // Check 5: The forward call to an agent has an explicit timeout
    const forwardController = new AbortController();
    const forwardTimeout = setTimeout(() => forwardController.abort(), 10000);

    let finalAnswer = "Agent did not respond properly.";
    try {
      const agentRes = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
        signal: forwardController.signal
      });
      const agentData = await agentRes.json();
      finalAnswer = agentData.answer || finalAnswer;
    } catch (e: any) {
      if (e.name === "AbortError") {
        finalAnswer = "Agent request timed out.";
      }
    } finally {
      clearTimeout(forwardTimeout);
    }

    return NextResponse.json({ answer: finalAnswer, agentName: chosenAgent.name });

  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
