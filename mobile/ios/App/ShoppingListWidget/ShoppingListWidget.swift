import WidgetKit
import SwiftUI

// STO-74: this widget carries no data of its own and makes no network/auth calls of its own —
// it is purely a home-screen shortcut. Tapping it opens the app via the
// stokpot://widget-quick-add deep link (see Info.plist's CFBundleURLTypes and
// +layout.svelte's appUrlOpen listener), which is what actually resolves "the active shopping
// list" and lands on its add-item field, fully authenticated inside the normal WebView app —
// duplicating that logic (and the auth/networking it requires) natively in the widget
// extension's own process was judged out of scope for what a "quick add" shortcut needs to
// deliver. That's also why the timeline below is a single static entry with no refresh policy.
struct ShoppingListEntry: TimelineEntry {
	let date: Date
}

struct ShoppingListProvider: TimelineProvider {
	func placeholder(in context: Context) -> ShoppingListEntry {
		ShoppingListEntry(date: Date())
	}

	func getSnapshot(in context: Context, completion: @escaping (ShoppingListEntry) -> Void) {
		completion(ShoppingListEntry(date: Date()))
	}

	func getTimeline(in context: Context, completion: @escaping (Timeline<ShoppingListEntry>) -> Void) {
		let timeline = Timeline(entries: [ShoppingListEntry(date: Date())], policy: .never)
		completion(timeline)
	}
}

struct ShoppingListWidgetView: View {
	var body: some View {
		ZStack {
			Color(red: 0x3f / 255, green: 0x9c / 255, blue: 0x7c / 255)
			HStack(spacing: 6) {
				Text("+")
					.font(.system(size: 22, weight: .bold))
				Text("Add to list")
					.font(.system(size: 13, weight: .semibold))
			}
			.foregroundColor(.white)
		}
		.widgetURL(URL(string: "stokpot://widget-quick-add"))
	}
}

struct ShoppingListWidget: Widget {
	let kind: String = "ShoppingListWidget"

	var body: some WidgetConfiguration {
		StaticConfiguration(kind: kind, provider: ShoppingListProvider()) { _ in
			ShoppingListWidgetView()
		}
		.configurationDisplayName("Quick Add")
		.description("Quickly add an item to your active shopping list.")
		.supportedFamilies([.systemSmall])
	}
}
