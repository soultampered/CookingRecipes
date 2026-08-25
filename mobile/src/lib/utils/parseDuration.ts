// Best-effort extraction of a duration mention from free-text recipe step prose (e.g.
// "Simmer for 10 minutes" -> 600). Zero schema change, so it's fragile by nature — steps
// phrased unusually won't match, and that's an accepted tradeoff over restructuring
// Recipe.instructions from string[] into structured step objects (see STO-27).
export function parseDurationSeconds(text: string): number | null {
	const match = text.match(/(\d+(?:\.\d+)?)\s*(hours?|hrs?|minutes?|mins?|seconds?|secs?)\b/i);
	if (!match) return null;

	const value = parseFloat(match[1]);
	const unit = match[2].toLowerCase();

	if (unit.startsWith('h')) return Math.round(value * 3600);
	if (unit.startsWith('m')) return Math.round(value * 60);
	return Math.round(value);
}
