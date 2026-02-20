import { NextResponse } from 'next/server';
import { client } from "@gradio/client";

export async function POST(req) {
    try {
        const formData = await req.formData();
        const imageFile = formData.get('image');

        if (!imageFile) {
            return NextResponse.json({ error: 'No image provided' }, { status: 400 });
        }

        console.log("Image received. Establishing direct neural bridge to JeffreyXiang/TRELLIS...");

        // Connect to the autonomous HuggingFace TRELLIS agent
        const app = await client("JeffreyXiang/TRELLIS", {
            hf_token: process.env.HF_TOKEN // Verified Hub Auth
        });

        // Parse Blob from file for Gradio
        const blob = new Blob([await imageFile.arrayBuffer()], { type: imageFile.type });

        console.log("Vectorizing input via preprocess_image node...");
        const preRes = await app.predict("/preprocess_image", [blob]);
        const processedImage = preRes.data[0];

        if (!processedImage) throw new Error("Preprocessing agent execution failed.");

        console.log("Engaging 3D Lattice Generation matrix (image_to_3d)...");
        // Warning: This queue step can take 10s -> 5mins depending on concurrency. NextJS API route may timeout 
        // if deployed on Vercel Edge. Running locally is fine.
        const res = await app.predict("/image_to_3d", [
            processedImage,
            [{ image: processedImage }],
            null,
            0,
            7.5,
            12,
            3,
            12,
            "stochastic"
        ]);

        console.log("Lattice synthesized. Extracting GLB mesh...");
        const glbRes = await app.predict("/extract_glb", [
            null,
            0.95,
            1024
        ]);

        const glbUrl = glbRes.data[0]?.url;
        if (!glbUrl) throw new Error("Decoupled GLB extraction failed.");

        console.log(`GLB Extracted at Node: ${glbUrl}. Fetching payload direct to client...`);

        // Fetch the generated Mesh from HF blob storage
        const glbResponse = await fetch(glbUrl);
        if (!glbResponse.ok) throw new Error("Failed to download finalized GLB payload.");

        const fileBuffer = await glbResponse.arrayBuffer();

        // Return the GLB binary straight back to the client natively
        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': 'model/gltf-binary',
                'Content-Disposition': 'attachment; filename="yaceavatar_inference.glb"'
            },
        });
    } catch (error) {
        console.error('Sovereign 3D API Agent failure:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
