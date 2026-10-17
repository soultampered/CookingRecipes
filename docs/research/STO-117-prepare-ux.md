# STO-117 — Is "Prepare a recipe" good UX?

Research only. Answers the five questions on the ticket and recommends what to build.
Code refs are against `main` @ `f93884d`.

## How it works today

1. Recipe detail → **Prepare** (`mobile/src/routes/recipes/[id]/+page.svelte`, `handlePrepare`).
2. `POST /recipes/:id/prepare` → `recipeInventoryService.deductIngredients` →
   `inventoryService.bulkAdjust` → `Promise.all(adjustQuantity(...))`.
3. Success: generic "Prepared" toast. Failure: *then* fetch missing ingredients and show a
   banner.

No preview, no confirm, no way to say "I used 1 egg not 2", no undo, no record that the
recipe was made.

## Bugs found (real, on `main`)

| # | Problem | Where | Effect |
|---|---------|-------|--------|
| 1 | **Partial deduction.** Each ingredient is checked + written independently inside `Promise.all`. One `INSUFFICIENT_STOCK` rejects the whole call, but every other ingredient's write still lands. | `inventory.service.ts` `bulkAdjust` | User sees "Not enough stock", believes nothing happened, but most of the inventory was already deducted. |
| 2 | **Lost updates.** `adjustQuantity` is read → compute → `$set`. Two concurrent prepares (or one recipe listing the same item twice) both read the old value; one write wins. | `inventory.service.ts` `adjustQuantity` | Under-deduction, silently. |
| 3 | **Units ignored.** `RecipeIngredient.unit` is never compared to `Inventory.unit`. A recipe asking for "2 cup" flour deducts 2 from an item stored as "1000 g". | `recipeInventory.service.ts` | Stock numbers drift into nonsense. |
| 4 | **Ambiguous 404.** `NOT_FOUND` means "recipe *or* some ingredient missing" (route comment admits it). A deleted inventory item makes the recipe unpreparable with no hint which one. | `recipes.route.ts` | Dead end for the user. |

## Answers to the ticket's questions

1. **Atomic?** Yes, required. Validate every ingredient first, then apply each with a
   conditional `$inc` (`{ _id, quantity: { $gte: amount } }`). If any conditional write
   misses, roll back the ones that landed. This is atomic per document (fixes #2) and
   all-or-nothing per prepare (fixes #1) without needing a replica-set transaction, so it
   also works on the local standalone Mongo.
2. **Show missing proactively?** Yes. `GET /recipes/:id/missing-ingredients` already
   exists. Call it when the recipe loads and badge short ingredients inline. The Prepare
   button then states what will happen instead of failing.
3. **Preview + edit before committing?** Yes, as a bottom sheet, not a modal dialog.
   It lists every deduction with an editable amount, includes a servings control (ties to
   STO-20 scaling), and has a "save leftovers" option (ties to STO-86). Default amounts come
   from the recipe, so the happy path is still two taps.
4. **Undo?** Yes, via a toast action for ~8s. The server returns the applied adjustments,
   and undo re-applies them negated. That's cheap because the adjustments are already
   computed.
5. **Is a confirm step friction?** A plain "Are you sure?" dialog would be. The preview
   sheet isn't, because it carries information the user needs (what's going to be
   subtracted, and what's short). Recommendation: the sheet replaces the one-tap prepare.
   No separate yes/no dialog.

## Recommendation (build order)

1. **Server**: make `deductIngredients` all-or-nothing with conditional `$inc` + rollback.
   Accept optional per-ingredient overrides and a `scale` factor. Return the applied
   adjustments. Distinguish `RECIPE_NOT_FOUND` from `INGREDIENT_NOT_FOUND` (with the id).
2. **Server**: log each prepare (recipe, time, scale) so nutrition rollup (STO-22) has data.
3. **Mobile**: replace one-tap Prepare with the preview sheet (servings stepper, editable
   amounts, short items flagged, leftovers option). Add Undo on the success toast.
4. **Later**: unit conversion between recipe and inventory units (shares the conversion
   table from STO-92). Until then, show a "unit differs" warning in the sheet when the
   units don't match, so the user can correct the amount by hand.

Items 1–3 land with STO-20 (scaling), STO-22 (prepare log) and STO-86 (leftovers) in this
stack, since those tickets touch the same code path.
