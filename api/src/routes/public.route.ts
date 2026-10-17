import { Hono } from "hono";
import { secureHeaders, NONCE, type SecureHeadersVariables } from "hono/secure-headers";
import { recipeShareService, type PublicRecipe } from "../services/recipeShare.service.js";
import { rateLimit } from "../middleware/rateLimit.middleware.js";

// STO-84: unauthenticated, read-only. Tokens are unguessable; the limiter just blunts scraping.
const publicRoute = new Hono();
// Separate router for the HTML page so mounting it at "/" can't expose anything else.
export const publicPages = new Hono<{ Variables: SecureHeadersVariables }>();

const publicLimiter = rateLimit({ windowMs: 60 * 1000, max: 60, prefix: "public-recipe" });

publicRoute.get("/recipes/:token", publicLimiter, async (c) => {
    const recipe = await recipeShareService.getPublic(c.req.param("token"));
    if (!recipe) return c.json({ error: "Recipe not found" }, 404);
    return c.json(recipe, 200);
});

function escape(s: string): string {
    return s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);
}

function renderRecipe(r: PublicRecipe, nonce: string): string {
    const meta = [
        r.servings ? `Serves ${r.servings}` : "",
        r.totalTimeMinutes ? `${r.totalTimeMinutes} min` : "",
        r.difficulty
    ].filter(Boolean).join(" · ");
    const n = r.nutritionPerServing;
    const nutrition = n && Object.keys(n).length
        ? `<p class="meta">Per serving: ${[n.calories != null ? `${n.calories} kcal` : "", n.protein != null ? `P ${n.protein}g` : "", n.carbs != null ? `C ${n.carbs}g` : "", n.fat != null ? `F ${n.fat}g` : ""].filter(Boolean).join(" · ")}</p>`
        : "";
    const desc = r.description ? escape(r.description) : `A recipe shared from Stokpot`;
    return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escape(r.title)} · Stokpot</title>
<meta property="og:title" content="${escape(r.title)}"><meta property="og:description" content="${desc}">
<style nonce="${nonce}">
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:640px;margin:2rem auto;padding:0 1rem;color:#212623;line-height:1.55;background:#eff4f1}
main{background:#fff;border:1px solid #d9e2dc;border-radius:14px;padding:1.5rem}
h1{margin:0 0 .25rem}h2{font-size:1.05rem;margin:1.4rem 0 .4rem}.meta{color:#57635d;margin:.2rem 0}
.hero{width:100%;max-height:340px;object-fit:cover;border-radius:10px;margin-bottom:1rem}
ul,ol{padding-left:1.3rem}li{margin:.3rem 0}footer{text-align:center;color:#57635d;font-size:.85rem;margin-top:1rem}
@media print{body{background:#fff}main{border:none}}
</style></head><body><main>
${r.photoUrl ? `<img class="hero" src="${escape(r.photoUrl)}" alt="">` : ""}
<h1>${escape(r.title)}</h1>
<p class="meta">${escape(meta)}${r.author ? ` · by ${escape(r.author)}` : ""}</p>
${r.description ? `<p>${escape(r.description)}</p>` : ""}${nutrition}
<h2>Ingredients</h2><ul>${r.ingredients.map((i) => `<li>${escape(`${i.quantity}${i.unit ? ` ${i.unit}` : ""} ${i.name}`)}</li>`).join("")}</ul>
<h2>Instructions</h2><ol>${r.instructions.map((s) => `<li>${escape(s)}</li>`).join("")}</ol>
</main><footer>Shared with Stokpot</footer></body></html>`;
}

publicPages.use(
    "/r/*",
    secureHeaders({
        contentSecurityPolicy: {
            defaultSrc: ["'none'"],
            styleSrc: [NONCE],
            imgSrc: ["'self'"],
            baseUri: ["'none'"],
            frameAncestors: ["'none'"]
        }
    })
);

publicPages.get("/r/:token", publicLimiter, async (c) => {
    const recipe = await recipeShareService.getPublic(c.req.param("token"));
    if (!recipe) return c.html("<!DOCTYPE html><title>Not found</title><p>This recipe isn't shared anymore.</p>", 404);
    return c.html(renderRecipe(recipe, c.get("secureHeadersNonce") ?? ""));
});

export default publicRoute;
