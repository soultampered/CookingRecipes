import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import type { Recipe } from '$lib/types/recipe';
import { formatQuantity } from './quantity';

// STO-85: web prints a clean page (browser "Save as PDF" works); native shares a printable
// .html file, whose share sheet offers Print / Save to Files / Drive. WebView print() is a
// no-op on both mobile platforms, so native can't use the web path.
export interface PrintableRecipe {
	recipe: Recipe;
	names: Record<string, string>;
	scale: number;
	unitLabel: (unit: string) => string;
	labels: { ingredients: string; instructions: string; servings: string };
}

function escape(s: string): string {
	return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function ingredientLines({ recipe, names, scale, unitLabel }: PrintableRecipe): string[] {
	return recipe.ingredients.map((ing) => {
		const qty = formatQuantity(ing.quantity * scale);
		const unit = ing.unit ? ` ${unitLabel(ing.unit)}` : '';
		return `${qty}${unit} ${names[ing.inventoryItemId] ?? ''}`.trim();
	});
}

export function recipeHtml(p: PrintableRecipe): string {
	const { recipe, scale, labels } = p;
	const servings = recipe.servings ? `<p class="meta">${escape(labels.servings)}: ${formatQuantity(recipe.servings * scale)}</p>` : '';
	return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escape(recipe.title)}</title>
<style>
body{font-family:Georgia,'Times New Roman',serif;max-width:640px;margin:2rem auto;padding:0 1rem;color:#111;line-height:1.5}
h1{margin:0 0 .25rem}h2{font-size:1.1rem;border-bottom:1px solid #ccc;padding-bottom:.2rem;margin-top:1.5rem}
.meta{color:#555;margin:.2rem 0}ul,ol{padding-left:1.3rem}li{margin:.25rem 0}
@media print{body{margin:0}}
</style></head><body>
<h1>${escape(recipe.title)}</h1>
${recipe.description ? `<p class="meta">${escape(recipe.description)}</p>` : ''}
${servings}
<h2>${escape(labels.ingredients)}</h2>
<ul>${ingredientLines(p).map((l) => `<li>${escape(l)}</li>`).join('')}</ul>
<h2>${escape(labels.instructions)}</h2>
<ol>${recipe.instructions.map((s) => `<li>${escape(s)}</li>`).join('')}</ol>
</body></html>`;
}

export function recipeText(p: PrintableRecipe): string {
	return [
		p.recipe.title,
		'',
		`${p.labels.ingredients}:`,
		...ingredientLines(p).map((l) => `• ${l}`),
		'',
		`${p.labels.instructions}:`,
		...p.recipe.instructions.map((s, i) => `${i + 1}. ${s}`)
	].join('\n');
}

export async function printOrShareRecipe(p: PrintableRecipe): Promise<void> {
	const html = recipeHtml(p);
	if (!Capacitor.isNativePlatform()) {
		const frame = document.createElement('iframe');
		frame.style.position = 'fixed';
		frame.style.width = '0';
		frame.style.height = '0';
		frame.style.border = '0';
		document.body.appendChild(frame);
		frame.srcdoc = html;
		await new Promise((resolve) => (frame.onload = resolve));
		frame.contentWindow?.print();
		setTimeout(() => frame.remove(), 1000);
		return;
	}
	const slug = p.recipe.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'recipe';
	const file = await Filesystem.writeFile({
		path: `${slug}.html`,
		data: html,
		directory: Directory.Cache,
		encoding: Encoding.UTF8
	});
	await Share.share({ title: p.recipe.title, text: recipeText(p), files: [file.uri] });
}
