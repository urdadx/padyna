import type { SVGProps } from "react";

export function FolderIconLinear(props: SVGProps<SVGSVGElement>) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="1em"
			height="1em"
			viewBox="0 0 24 24"
			{...props}>
			{/* Icon from Huge Icons by Hugeicons - undefined */}
			<path
				fill="none"
				stroke={props.color || "#888888"}
				strokeLinecap="round"
				strokeWidth="1.5"
				d="M8 7h8.75c2.107 0 3.16 0 3.917.506a3 3 0 0 1 .827.827C22 9.09 22 10.143 22 12.25c0 3.511 0 5.267-.843 6.528a5 5 0 0 1-1.38 1.38C18.518 21 16.762 21 13.25 21H12c-4.714 0-7.071 0-8.536-1.465C2 18.072 2 15.715 2 11V7.944c0-1.816 0-2.724.38-3.406A3 3 0 0 1 3.538 3.38C4.22 3 5.128 3 6.944 3C8.108 3 8.69 3 9.2 3.191c1.163.436 1.643 1.493 2.168 2.542L12 7"
			/>
		</svg>
	);
}

export function FolderOpenIconLinear(props: SVGProps<SVGSVGElement>) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="1em"
			height="1em"
			viewBox="0 0 24 24"
			{...props}>
			{/* Icon from Huge Icons by Hugeicons - undefined */}
			<g
				fill="none"
				stroke={props.color || "#888888"}
				strokeLinejoin="round"
				strokeWidth="1.5">
				<path
					strokeLinecap="round"
					d="M2 19V7.549c0-1.444 0-2.166.243-2.733a3 3 0 0 1 1.573-1.573C4.383 3 5.098 3 6.55 3h.494a2 2 0 0 1 1.557.745L10.418 6m0 0H16c1.4 0 2.1 0 2.635.272a2.5 2.5 0 0 1 1.092 1.093C20 7.9 20 8.6 20 10v1m-9.582-5H7"
				/>
				<path d="m3.158 15.514l.298-.742c.734-1.827 1.101-2.74 1.866-3.256S7.076 11 9.052 11h8.06c2.688 0 4.033 0 4.63.879c.598.879.098 2.121-.9 4.607l-.298.742c-.734 1.827-1.101 2.74-1.866 3.256s-1.754.516-3.73.516h-8.06c-2.688 0-4.033 0-4.63-.879c-.598-.878-.098-2.121.9-4.607Z" />
			</g>
		</svg>
	);
}
