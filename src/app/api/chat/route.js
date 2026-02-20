import { NextResponse } from 'next/server';

export async function POST(req) {
    try {
        const body = await req.json();
        const { messages, model = "qwen2.5:3b" } = body;

        console.log(`Connecting to Sovereign Agent Core: ${model}`);

        // Routing to the mapped Ollama Daemon (Port 11434)
        const ollamaRes = await fetch("http://127.0.0.1:11434/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model,
                messages,
                stream: false
            })
        });

        if (!ollamaRes.ok) {
            throw new Error(`Sovereign Core Error: ${await ollamaRes.text()}`);
        }

        const data = await ollamaRes.json();

        return NextResponse.json({
            role: "assistant",
            content: data.message.content
        }, { status: 200 });

    } catch (error) {
        console.error("Agent Inference Failure:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
