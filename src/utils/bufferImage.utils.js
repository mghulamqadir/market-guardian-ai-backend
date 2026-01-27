import fetch from "node-fetch";

export async function bufferImage(url) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (!response.ok) {
            throw new Error(`Failed to fetch image [${response.status}] from ${url}`);
        }

        const contentType = response.headers.get("content-type") || "image/jpeg";
        const buffer = await response.buffer();

        return { buffer, contentType };
    } catch (err) {
        console.error(`[bufferImage] Error fetching ${url}:`, err.message);
        throw err;
    }
}
