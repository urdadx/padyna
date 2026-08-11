import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";

const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
] as const;

export interface DitherImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src: string;
  pixelSize?: number;
  colorLevels?: number;
}

export function DitherImage({
  src,
  alt = "",
  className,
  pixelSize = 2,
  colorLevels = 5,
  ...imageProps
}: DitherImageProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return;

    setRendered(false);
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = src;

    const paint = () => {
      if (!image.naturalWidth || !image.naturalHeight) return;

      const { width, height } = wrapper.getBoundingClientRect();
      const columns = Math.max(1, Math.round(width / pixelSize));
      const rows = Math.max(1, Math.round(height / pixelSize));
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;

      canvas.width = columns;
      canvas.height = rows;

      const sourceRatio = image.naturalWidth / image.naturalHeight;
      const targetRatio = columns / rows;
      let sourceX = 0;
      let sourceY = 0;
      let sourceWidth = image.naturalWidth;
      let sourceHeight = image.naturalHeight;

      if (sourceRatio > targetRatio) {
        sourceWidth = image.naturalHeight * targetRatio;
        sourceX = (image.naturalWidth - sourceWidth) / 2;
      } else {
        sourceHeight = image.naturalWidth / targetRatio;
        sourceY = (image.naturalHeight - sourceHeight) / 2;
      }

      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        columns,
        rows,
      );

      try {
        const imageData = context.getImageData(0, 0, columns, rows);
        const steps = Math.max(2, colorLevels) - 1;

        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < columns; x++) {
            const offset = (y * columns + x) * 4;
            const threshold = (BAYER_4X4[y % 4][x % 4] / 16 - 0.5) / steps;

            for (let channel = 0; channel < 3; channel++) {
              const value = imageData.data[offset + channel] / 255;
              imageData.data[offset + channel] =
                Math.round(Math.min(1, Math.max(0, value + threshold)) * steps) *
                (255 / steps);
            }
          }
        }

        context.putImageData(imageData, 0, 0);
        setRendered(true);
      } catch {
        setRendered(false);
      }
    };

    image.addEventListener("load", paint);
    const observer = new ResizeObserver(paint);
    observer.observe(wrapper);

    return () => {
      image.removeEventListener("load", paint);
      observer.disconnect();
    };
  }, [src, pixelSize, colorLevels]);

  return (
    <div ref={wrapperRef} className={className}>
      <img
        {...imageProps}
        src={src}
        alt={alt}
        className={`h-full w-full object-cover ${rendered ? "opacity-0" : "opacity-100"}`}
      />
      <canvas
        ref={canvasRef}
        role={alt ? "img" : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
        className={`absolute inset-0 h-full w-full ${rendered ? "opacity-100" : "opacity-0"}`}
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  );
}
