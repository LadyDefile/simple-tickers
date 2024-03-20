/** 
 * Implementation that saves/delete tickers from config settings.
 * Any system that wishes to poach this module should replace this to use world actors
 * or custom journal pages (perhaps with the ability to register the journal entry).
 * This function expects that hooks are registered to call the refresh method.
 */

import { MODULE_ID } from "./settings.js";
export class TickerDatabase extends Collection {
    addTicker(data={}) {
        const defaultTicker = { value: 0, max: 4, name: "New Ticker", id: randomID(), private: false, secret: false, owner: game.user.id, GMTicker: true, cycle: false };
        const newData = mergeObject(defaultTicker, data);

        // Use GM Proxy to create and show tickers
        if ( game.user !== game.users.activeGM )
        {
            newData.private = true;
            newData.GMTicker = false;
            window.tickerSocket.executeAsGM("addTicker", newData);
            return;
        }

        if (!this.#verifyTickerData(data)) return;

        const tickers = this.#getTickerData();
        tickers[newData.id] = newData;

        game.settings.set(MODULE_ID, "activeTickers", tickers);
    }

    delete(id) {
        const tickers = this.#getTickerData();

        // Use GM proxy to edit ticker.
        if ( game.user !== game.users.activeGM )
        {
            // Don't allow someone to delete a ticker that doesn't belong to them
            if ( tickers[id].owner != game.user.id )
                return;
            window.tickerSocket.executeAsGM("deleteTicker", id);
            return;
        }
        delete tickers[id];
        game.settings.set(MODULE_ID, "activeTickers", tickers);
    }

    update(data) {
        if (!this.#verifyTickerData(data)) return;

        const tickers = this.#getTickerData();
        const existing = tickers[data.id];
        if (!existing) return;

        mergeObject(existing, data);
        existing.value = Math.clamped(existing.value, 0, existing.max);

        // Use GM Proxy to edit ticker
        if ( game.user !== game.users.activeGM )
        {
            // Don't allow someone to delete a ticker that doesn't belong to them
            if ( existing.owner != game.user.id )
                return;
            
            window.tickerSocket.executeAsGM("updateTicker", data);
            return;
        }
        game.settings.set(MODULE_ID, "activeTickers", tickers);
    }

    move(id, idx) {
        const tickers = Object.values(this.#getTickerData());
        const item = tickers.find((c) => c.id === id);
        if (!item) return;

        tickers.splice(tickers.indexOf(item), 1);
        tickers.splice(idx, 0, item);
        
        const newData = Object.fromEntries(tickers.map((c) => [c.id, c]));
        game.settings.set(MODULE_ID, "activeTickers", newData);
    }

    #getTickerData() {
        return game.settings.get(MODULE_ID, "activeTickers");
    }

    refresh() {
        this.clear();
        for (const ticker of Object.values(this.#getTickerData())) {
            this.set(ticker.id, ticker);
        }

        if (canvas.ready) {
            window.tickerPanel.render(true);
        }
    }

    // Limit the ticker max size to 128
    #verifyTickerData(data) {
        const maxSize = 128;
        if (data.max > maxSize) {
            ui.notifications.error(game.i18n.format("Tickers.SizeTooBigError", { maxSize }));
            return false;
        }
        
        return true;
    }
}