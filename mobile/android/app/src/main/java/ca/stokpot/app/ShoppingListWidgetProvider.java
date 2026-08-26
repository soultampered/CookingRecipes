package ca.stokpot.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;

// STO-74: this widget carries no data of its own and makes no network/auth calls — it is
// purely a home-screen shortcut. Tapping it opens the app via the stokpot://widget-quick-add
// deep link (see AndroidManifest.xml's MainActivity intent-filter and +layout.svelte's
// appUrlOpen listener), which is what actually resolves "the active shopping list" and lands
// on its add-item field, fully authenticated inside the normal WebView app — duplicating that
// logic (and the auth/networking it requires) natively in the widget process was judged out of
// scope for what a "quick add" shortcut needs to deliver.
public class ShoppingListWidgetProvider extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("stokpot://widget-quick-add"));
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent pendingIntent = PendingIntent.getActivity(
                context,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_shopping_list);
            views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);
            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }
}
