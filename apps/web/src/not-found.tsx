export function NotFoundPage() {
	return (
		<div className="flex min-h-svh w-full items-center justify-center bg-background px-6 py-12 text-foreground">
			<div className="flex max-w-2xl flex-col items-center text-center">
				<img
					src="https://assets.padyna.com/assets/404.png"
					alt="Page not found"
					className="w-full max-w-md object-contain"
					loading="lazy"
				/>
				<h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
					Page not found
				</h1>
				<p className="mt-3 max-w-md text-sm text-muted-foreground sm:text-base">
					The page you are looking for does not exist or may have been moved.
				</p>
				<a
					href="/"
					className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90">
					Take me home
				</a>
			</div>
		</div>
	);
}
