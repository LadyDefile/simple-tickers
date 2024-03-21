/** 
 * Implementation that saves/delete tickers from config settings.
 * Any system that wishes to poach this module should replace this to use world actors
 * or custom journal pages (perhaps with the ability to register the journal entry).
 * This function expects that hooks are registered to call the refresh method.
 */

import { MODULE_ID } from "./settings.js";

export const PRIVACY_PUBLIC = 0;
export const PRIVACY_PRIVATE = 1;
export const PRIVACY_OBFUSCATE = 2;

export class TickerDatabase extends Collection {
    addTicker(data={}) {
        const defaultTicker = { value: 0, max: 4, name: "New Ticker", id: randomID(), privacy: PRIVACY_PUBLIC, owner: game.user.id, GMTicker: true };
        const newData = mergeObject(defaultTicker, data);

        // Use GM Proxy to create and show tickers
        if ( !game.user.isGM )
        {
            newData.privacy = PRIVACY_PRIVATE;
            newData.GMTicker = false;
            window.tickerSocket.executeAsGM("addTicker", newData);
            return;
        }

        if (!this.#verifyTickerData(data)) return;

        if ( newData.GMTicker )
        {
            const tickers = this.#getTickerData(true);
            tickers[newData.id] = newData;

            game.settings.set(MODULE_ID, "gmTickers", tickers);
        }
        else
        {
            const tickers = this.#getTickerData(false);
            tickers[newData.id] = newData;

            game.settings.set(MODULE_ID, "userTickers", tickers);
        }
    }

    delete(id, GM) {
        const tickers = this.#getTickerData(GM);

        // Use GM proxy to edit ticker.
        if ( !game.user.isGM)
        {
            // Don't allow someone to delete a ticker that doesn't belong to them
            if ( tickers[id].owner != game.user.id )
                return;

            window.tickerSocket.executeAsGM("deleteTicker", id);
            return;
        }
        delete tickers[id];
        if ( GM )
        {
            game.settings.set(MODULE_ID, "gmTickers", tickers);
        }
        else
        {
            game.settings.set(MODULE_ID, "userTickers", tickers);
        }
    }

    update(data) {
        if (!this.#verifyTickerData(data)) return;
        const tickers = this.#getTickerData(data.GMTicker);
        const existing = tickers[data.id];
        if (!existing) return;

        mergeObject(existing, data);
        existing.value = Math.clamped(existing.value, 0, existing.max);

        // Use GM Proxy to edit ticker
        if ( !game.user.isGM)
        {
            // Don't allow someone to delete a ticker that doesn't belong to them
            if ( existing.owner != game.user.id )
                return;
            
            window.tickerSocket.executeAsGM("updateTicker", data);
            return;
        }

        if ( existing.GMTicker )
            game.settings.set(MODULE_ID, "gmTickers", tickers);
        else
            game.settings.set(MODULE_ID, "userTickers", tickers);
    }

    move(id, idx, GM) {
        const tickers = Object.values(this.#getTickerData(GM));
        const item = tickers.find((c) => c.id === id);
        if (!item) return;

        if ( !game.user.isGM )
        {
            window.tickerSocket.executeAsGM("moveTicker", id, idx);
            return;
        }

        tickers.splice(tickers.indexOf(item), 1);
        tickers.splice(idx, 0, item);
        
        const newData = Object.fromEntries(tickers.map((c) => [c.id, c]));

        if ( GM )
            game.settings.set(MODULE_ID, "gmTickers", newData);
        else
            game.settings.set(MODULE_ID, "userTickers", newData);
    }

    #getTickerData(GM) {
        if ( GM )
            return game.settings.get(MODULE_ID, "gmTickers" );
        else
            return game.settings.get(MODULE_ID, "userTickers");
        //return game.settings.get(MODULE_ID, "activeTickers");
    }

    refresh() {
        this.clear();
        for (const ticker of Object.values(this.#getTickerData(true))) {
            this.set(ticker.id, ticker);
        }

        for (const ticker of Object.values(this.#getTickerData(false))) {
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