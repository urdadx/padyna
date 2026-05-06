export function browserSafeChatFetch(input: RequestInfo | URL, init?: RequestInit) {
	if (!init?.headers) {
		return fetch(input, init);
	}

	const headers = new Headers(init.headers);

	// Safari rejects browser fetches that try to set a forbidden user-agent header.
	headers.delete("user-agent");

	return fetch(input, {
		...init,
		headers,
	});
}
