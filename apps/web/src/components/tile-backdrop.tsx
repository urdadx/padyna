import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

// Decorative panels for the auth and onboarding screens, drawn in code (the same tile and
// grain look as the marketing site's demo backdrop):
//   "equalizer" – soft tiles rising from the bottom, violet into warm accents
//   "mesh"      – a frosted glass grid over a colourful mesh blob
type Variant = "equalizer" | "mesh";
type RGB = [number, number, number];

const mix = (a: RGB, b: RGB, t: number): RGB =>
	a.map((v, i) => Math.round(v + (b[i] - v) * Math.min(1, Math.max(0, t)))) as RGB;

const rgb = ([r, g, b]: RGB, alpha = 1) => `rgb(${r} ${g} ${b} / ${alpha})`;

const WHITE: RGB = [255, 255, 255];

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, radius: number) {
	ctx.beginPath();
	ctx.roundRect(x, y, size, size, radius);
}

// Brand violet (primary) through fuchsia and pink into orange and amber.
const EQUALIZER_PALETTE: [number, RGB][] = [
	[0, [67, 56, 202]],
	[0.2, [91, 91, 214]],
	[0.38, [139, 92, 246]],
	[0.52, [217, 70, 239]],
	[0.66, [244, 114, 182]],
	[0.82, [251, 146, 60]],
	[1, [251, 191, 36]],
];

const paletteAt = (x: number): RGB => {
	for (let i = 1; i < EQUALIZER_PALETTE.length; i++) {
		const [stop, color] = EQUALIZER_PALETTE[i];
		const [prevStop, prevColor] = EQUALIZER_PALETTE[i - 1];
		if (x <= stop) return mix(prevColor, color, (x - prevStop) / (stop - prevStop));
	}
	return EQUALIZER_PALETTE[EQUALIZER_PALETTE.length - 1][1];
};

function drawEqualizer(ctx: CanvasRenderingContext2D, width: number, height: number) {
	const cell = Math.max(44, Math.min(110, width / 9));
	const cols = Math.ceil(width / cell);
	const rows = Math.ceil(height / cell);
	const gap = cell * 0.05;

	ctx.fillStyle = rgb([244, 244, 245]);
	ctx.fillRect(0, 0, width, height);

	// Soft glows behind the tiles so the colours bleed between them.
	const glows: [number, number, RGB, number][] = [
		[0.12, 0.6, [129, 140, 248], 0.55],
		[0.55, 0.85, [232, 121, 249], 0.35],
		[0.92, 0.7, [253, 186, 116], 0.5],
	];
	for (const [gx, gy, color, alpha] of glows) {
		const glow = ctx.createRadialGradient(gx * width, gy * height, 0, gx * width, gy * height, width * 0.45);
		glow.addColorStop(0, rgb(color, alpha));
		glow.addColorStop(1, rgb(color, 0));
		ctx.fillStyle = glow;
		ctx.fillRect(0, 0, width, height);
	}

	// Columns reach different heights: tall left, a dip, rising again right.
	const columnHeight = (x: number) => 0.42 + 0.2 * Math.cos(x * Math.PI * 1.6) + 0.08 * Math.sin(x * 23);

	for (let col = 0; col < cols; col++) {
		const along = cols > 1 ? col / (cols - 1) : 0;
		const filled = Math.round(rows * columnHeight(along));
		const hue = paletteAt(along);
		for (let row = 0; row < rows; row++) {
			const x = col * cell;
			const y = row * cell;
			const fromBottom = rows - 1 - row;
			let fill: RGB = WHITE;
			let alpha = 0.45;
			if (fromBottom < filled) {
				// Lighter near the top of each column, deeper toward the bottom.
				const depth = filled > 1 ? fromBottom / (filled - 1) : 0;
				fill =
					depth > 0.5
						? mix(hue, WHITE, (depth - 0.5) * 1.3)
						: mix(hue, [30, 27, 75], (0.5 - depth) * 0.45);
				alpha = 0.92;
			}
			const tile = ctx.createLinearGradient(0, y, 0, y + cell);
			tile.addColorStop(0, rgb(mix(fill, WHITE, 0.35), alpha));
			tile.addColorStop(1, rgb(fill, alpha));
			ctx.fillStyle = tile;
			roundRect(ctx, x + gap, y + gap, cell - gap * 2, cell * 0.2);
			ctx.fill();
		}
	}
}

// Colour blobs for the mesh: [x, y, radius (fraction of the short side), colour, strength].
const MESH_BLOBS: [number, number, number, RGB, number][] = [
	[0.27, 0.16, 0.2, [125, 196, 250], 0.85],
	[0.3, 0.24, 0.1, [99, 125, 235], 0.7],
	[0.18, 0.62, 0.26, [252, 211, 77], 1],
	[0.3, 0.7, 0.26, [250, 204, 21], 0.9],
	[0.43, 0.56, 0.2, [251, 146, 60], 1],
	[0.5, 0.5, 0.14, [249, 98, 38], 0.95],
	[0.53, 0.63, 0.18, [244, 63, 94], 1],
	[0.54, 0.76, 0.18, [236, 72, 153], 0.95],
	[0.64, 0.42, 0.14, [217, 249, 157], 0.55],
	[0.78, 0.47, 0.28, [251, 182, 206], 0.8],
	[0.86, 0.66, 0.18, [240, 171, 252], 0.6],
]

const LAVENDER: RGB = [233, 234, 250];

function drawMesh(ctx: CanvasRenderingContext2D, width: number, height: number) {
	const short = Math.min(width, height);
	ctx.fillStyle = rgb(LAVENDER);
	ctx.fillRect(0, 0, width, height);

	// The colour field, layered radial blobs that blend into each other.
	for (const [bx, by, radius, color, strength] of MESH_BLOBS) {
		const cx = bx * width;
		const cy = by * height;
		const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * short * 1.6);
		glow.addColorStop(0, rgb(color, strength));
		glow.addColorStop(0.55, rgb(color, strength * 0.55));
		glow.addColorStop(1, rgb(color, 0));
		ctx.fillStyle = glow;
		ctx.fillRect(0, 0, width, height);
	}

	// Fade the field back to lavender toward the edges.
	const vignette = ctx.createRadialGradient(width * 0.48, height * 0.52, short * 0.25, width * 0.48, height * 0.52, Math.max(width, height) * 0.62);
	vignette.addColorStop(0, rgb(LAVENDER, 0));
	vignette.addColorStop(1, rgb(LAVENDER, 0.92));
	ctx.fillStyle = vignette;
	ctx.fillRect(0, 0, width, height);

	// Sample the field per tile so each pane reads as one frosted colour.
	const cell = Math.max(40, Math.min(100, width / 10));
	const gap = cell * 0.09;
	const radius = cell * 0.18;
	const cols = Math.ceil(width / cell);
	const rows = Math.ceil(height / cell);
	const field = ctx.getImageData(0, 0, width, height).data;
	const sample = (x: number, y: number): RGB => {
		const i = (Math.min(height - 1, Math.round(y)) * width + Math.min(width - 1, Math.round(x))) * 4;
		return [field[i], field[i + 1], field[i + 2]];
	};

	// Gaps between panes: light lavender lines.
	ctx.fillStyle = rgb([238, 239, 252], 0.78);
	ctx.fillRect(0, 0, width, height);

	for (let col = 0; col < cols; col++) {
		for (let row = 0; row < rows; row++) {
			const x = col * cell + gap / 2;
			const y = row * cell + gap / 2;
			const size = cell - gap;
			const color = sample(x + size / 2, y + size / 2);
			// Glass pane: brighter rim on top, colour pooling toward the bottom.
			const pane = ctx.createLinearGradient(0, y, 0, y + size);
			pane.addColorStop(0, rgb(mix(color, WHITE, 0.45)));
			pane.addColorStop(0.18, rgb(mix(color, WHITE, 0.12)));
			pane.addColorStop(0.85, rgb(color));
			pane.addColorStop(1, rgb(mix(color, WHITE, 0.3)));
			ctx.fillStyle = pane;
			roundRect(ctx, x, y, size, radius);
			ctx.fill();
			// Bevel: a bright rim along the top, a soft shade along the bottom.
			const rim = ctx.createLinearGradient(0, y, 0, y + size);
			rim.addColorStop(0, rgb(WHITE, 0.85));
			rim.addColorStop(0.3, rgb(WHITE, 0));
			rim.addColorStop(0.75, rgb(mix(color, [40, 30, 70], 0.4), 0));
			rim.addColorStop(1, rgb(mix(color, [40, 30, 70], 0.4), 0.35));
			ctx.strokeStyle = rim;
			ctx.lineWidth = Math.max(1.5, cell * 0.03);
			roundRect(ctx, x + 1, y + 1, size - 2, radius);
			ctx.stroke();
		}
	}
}

const DRAW: Record<Variant, (ctx: CanvasRenderingContext2D, width: number, height: number) => void> = {
	equalizer: drawEqualizer,
	mesh: drawMesh,
};

const BLUR: Record<Variant, string> = {
	equalizer: "blur(6px) saturate(1.1)",
	mesh: "blur(1.2px) saturate(1.2)",
};

const GRAIN =
	"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 1.4 -0.2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export function TileBackdrop({ variant, className }: { variant: Variant; className?: string }) {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		let frame = 0;
		const draw = () => {
			const width = canvas.clientWidth;
			const height = canvas.clientHeight;
			if (!width || !height) return;
			// The canvas is blurred, so CSS-pixel resolution is plenty.
			canvas.width = width;
			canvas.height = height;
			const ctx = canvas.getContext("2d", { willReadFrequently: variant === "mesh" });
			if (ctx) DRAW[variant](ctx, width, height);
		};
		const observer = new ResizeObserver(() => {
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(draw);
		});
		observer.observe(canvas);
		return () => {
			cancelAnimationFrame(frame);
			observer.disconnect();
		};
	}, [variant]);

	return (
		<div aria-hidden="true" className={cn("pointer-events-none absolute inset-0 overflow-hidden bg-zinc-100", className)}>
			<canvas
				ref={canvasRef}
				className="absolute inset-0 h-full w-full scale-[1.04]"
				style={{ filter: BLUR[variant] }}
			/>
			<div
				className="absolute inset-0 opacity-55 mix-blend-overlay"
				style={{ backgroundImage: GRAIN }}
			/>
		</div>
	);
}
