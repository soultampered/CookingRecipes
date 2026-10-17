import {
	BarcodeFormat,
	BinaryBitmap,
	DecodeHintType,
	HybridBinarizer,
	MultiFormatReader,
	RGBLuminanceSource
} from '@zxing/library';

// Decode a barcode from a photo: BarcodeDetector when available, else zxing.
const FORMATS = [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E];
const MAX_EDGE = 1400;

interface NativeDetector {
	detect(source: ImageBitmap): Promise<{ rawValue: string }[]>;
}

async function detectNative(bitmap: ImageBitmap): Promise<string | null> {
	const Ctor = (globalThis as unknown as { BarcodeDetector?: new (o: object) => NativeDetector }).BarcodeDetector;
	if (!Ctor) return null;
	try {
		const found = await new Ctor({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] }).detect(bitmap);
		return found[0]?.rawValue ?? null;
	} catch {
		return null;
	}
}

function decodeCanvas(canvas: HTMLCanvasElement): string | null {
	const { width, height } = canvas;
	const rgba = canvas.getContext('2d')!.getImageData(0, 0, width, height).data;
	const luma = new Uint8ClampedArray(width * height);
	for (let i = 0, j = 0; i < rgba.length; i += 4, j++) {
		luma[j] = (rgba[i] * 299 + rgba[i + 1] * 587 + rgba[i + 2] * 114) / 1000;
	}
	const reader = new MultiFormatReader();
	const hints = new Map<DecodeHintType, unknown>([
		[DecodeHintType.POSSIBLE_FORMATS, FORMATS],
		[DecodeHintType.TRY_HARDER, true]
	]);
	try {
		return reader.decode(new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(luma, width, height))), hints).getText();
	} catch {
		return null;
	}
}

function draw(bitmap: ImageBitmap, rotate: boolean): HTMLCanvasElement {
	const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
	const w = Math.round(bitmap.width * scale);
	const h = Math.round(bitmap.height * scale);
	const canvas = document.createElement('canvas');
	canvas.width = rotate ? h : w;
	canvas.height = rotate ? w : h;
	const ctx = canvas.getContext('2d')!;
	if (rotate) {
		ctx.translate(h, 0);
		ctx.rotate(Math.PI / 2);
	}
	ctx.drawImage(bitmap, 0, 0, w, h);
	return canvas;
}

export async function decodeBarcode(file: Blob): Promise<string | null> {
	const bitmap = await createImageBitmap(file);
	try {
		return (await detectNative(bitmap)) ?? decodeCanvas(draw(bitmap, false)) ?? decodeCanvas(draw(bitmap, true));
	} finally {
		bitmap.close();
	}
}
