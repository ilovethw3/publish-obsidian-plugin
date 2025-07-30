export type HTTPMethod = "GET" | "POST" | "PUT" | "DELETE";

export default async function (
	method: HTTPMethod,
	url: string,
	data: any = null
) {
	const headers = new Headers({
		Accept: "application/json",
	});
	if (data) {
		headers.set("Content-Type", "application/json");
	}

	const resp = await fetch(url, {
		method,
		headers,
		...(data ? { body: JSON.stringify(data) } : {}),
	});

	if (!resp.ok) {
		const errorText = await resp.text();
		console.error('HTTP Request failed:', {
			status: resp.status,
			statusText: resp.statusText,
			url: url,
			method: method,
			body: errorText
		});
		throw new Error(
			`Request failed: ${resp.status} ${resp.statusText} - ${errorText}`
		);
	}

	const contentType = resp.headers.get("Content-Type");
	return contentType && contentType.includes("application/json")
		? await resp.json()
		: null;
}
