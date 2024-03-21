import { TickerAddDialog } from "./dialog.js";
import { MODULE_ID } from "./settings.js";
import { PRIVACY_PUBLIC, PRIVACY_PRIVATE, PRIVACY_OBFUSCATE } from "./database.js";
import SortableJS from "./sortable.complete.esm.js";

export class TickerPanel extends Application {
    refresh = foundry.utils.debounce(this.render, 100);
    lastRendered = [];

    constructor(db, options) {
        super(options)
        this.db = db;
    }

    static get defaultOptions() {
        return {
            ...super.defaultOptions,
            id: "ticker-panel",
            popOut: false,
            template: "modules/simple-tickers/templates/ticker-panel.hbs",
        };
    }

    get verticalEdge() {
        const position = game.settings.get(MODULE_ID, "location");
        return position === "topRight" ? "top" : "bottom";
    }

    async getData(options) {
        const data = await super.getData(options);
        const tickers = await this.prepareTickers();

        const userTickers = [];
        const gmTickers = [];
        let bShow = false;
        for ( let i = 0; i < tickers.length; i++ )
        {
            // If the ticker is a GM ticker
            // AND
            // The user is a GM or the ticker is public.
            if ( tickers[i].GMTicker && (game.user.isGM || tickers[i].privacy != PRIVACY_PRIVATE))
            {
                let t = tickers[i];
                if ( t.privacy == PRIVACY_OBFUSCATE && !game.user.isGM)
                    t.name = "???"
                gmTickers.push(t);
            }
            else
            {
                tickers[i].ownedByUser = tickers[i].owner == game.user.id;
                userTickers.push(tickers[i]);
                bShow |= tickers[i].ownedByUser;
            }
        }
        
        return {
            ...data,
            options: {
                editable: true,
                isGM: game.user.isGM,
                id: game.user.id,
                showPersonal: bShow
            },
            verticalEdge: this.verticalEdge,
            GMTickers: this.verticalEdge === "bottom" ? gmTickers.reverse() : gmTickers,
            UserTickers: this.verticalEdge === "bottom" ? userTickers.reverse() : userTickers,
            offset: `${game.settings.get(MODULE_ID, "offset") / 16}rem`,
        };
    }

    async prepareTickers() {
        const tickers = this.db.contents;
        const tickerColors = game.settings.get(MODULE_ID, "tickerColors");
        const defaultColor = game.settings.get(MODULE_ID, "defaultColor");
        const maxSpokes = 28; // limit when to render spokes to not fill with black
        return tickers.map((data) => ({
            ...data,
            value: Math.clamped(data.value, 0, data.max),
            color: tickerColors.find((c) => c.id === data.colorId)?.color ?? defaultColor,
            spokes: data.max > maxSpokes ? [] : Array(data.max).keys(),
        }))
    }

    activateListeners($html) {
        // Fade in all new rendered tickers
        const rendered = [...$html.get(0).querySelectorAll("[data-id]")].map((el) => el.dataset.id);
        const newlyRendered = rendered.filter((r) => !this.lastRendered.includes(r));
        for (const newId of newlyRendered) {
            gsap.fromTo($html.find(`[data-id=${newId}]`), { opacity: 0 }, { opacity: 1, duration: 0.25 });
        }

        // Update the last rendered list (to get ready for next cycle)
        this.lastRendered = rendered;

        $html.find(".ticker").on("click", (event) => {
            const tickerId = event.target.closest("[data-id]").dataset.id;
            const ticker = this.db.get(tickerId);
            
            if (!ticker)
            
            // If the current user is not the ticket owner and the ticker is not
            // a GM ticker
            if ( ticker.owner !== game.user.id && !ticker.GMTicker)
                return;
            
            // The ticker is a GM ticker and the current user is not a GM.
            if ( ticker.GMTicker && !game.user.isGM)
                return;

            // If the value is above the max and the clock is cyclical
            // set the clock to 0. Otherwise, default behavior
            let val = ticker.value + 1;
            ticker.value = val > ticker.max ? 0 : Math.min(val, ticker.max);
            this.db.update(ticker);
        });

        $html.find(".ticker").on("contextmenu", (event) => {
            const tickerId = event.target.closest("[data-id]").dataset.id;
            const ticker = this.db.get(tickerId);
            
            if (!ticker)
            
            // If the current user is not the ticket owner and the ticker is not
            // a GM ticker
            if ( ticker.owner !== game.user.id && !ticker.GMTicker)
                return;
            
            // The ticker is a GM ticker and the current user is not a GM.
            if ( ticker.GMTicker && !game.user.isGM)
                return;

            let val = ticker.value-1;
            ticker.value = val < 0 ? ticker.max : Math.max(val, 0);
            this.db.update(ticker);
        });

        $html.find("[data-action=collapse]").on("click", async (event) => {
            console.log(event);
        })

        $html.find("[data-action=add-ticker]").on("click", async () => {
            new TickerAddDialog(null, (data) => this.db.addTicker(data)).render(true);
        });

        $html.find("[data-action=edit-ticker]").on("click", async (event) => {
            const tickerId = event.target.closest("[data-id]").dataset.id;
            const ticker = this.db.get(tickerId);
            if (!ticker || ticker.owner !== game.user.id) return;

            new TickerAddDialog(ticker, (data) => this.db.update(data)).render(true);
        });

        $html.find("[data-action=delete-ticker]").on("click", async (event) => {
            const tickerId = event.target.closest("[data-id]").dataset.id;
            const ticker = this.db.get(tickerId);
            if (!ticker)
            
            // If the current user is not the ticket owner and the ticker is not
            // a GM ticker
            if ( ticker.owner !== game.user.id && !ticker.GMTicker)
                return;
            
            // The ticker is a GM ticker and the current user is not a GM.
            if ( ticker.GMTicker && !game.user.isGM)
                return;

            const deleting = await Dialog.confirm({
                title: game.i18n.localize("SimpleTickers.DeleteDialog.Title"),
                content: game.i18n.format("SimpleTickers.DeleteDialog.Message", { name: ticker.name }),
            });
            
            if (deleting) {
                this.db.delete(tickerId, game.user.isGM);
            }
        });

        if ( game.user.isGM )
        {
            // Drag/drop reordering
            new SortableJS($html.find(".gm-ticker-list").get(0), {
                animation: 200,
                direction: "vertical",
                draggable: ".ticker-entry",
                dragClass: "drag-preview",
                ghostClass: "drag-gap",
                onEnd: (event) => {
                    const id = event.item.dataset.id;
                    const newIndex = event.newDraggableIndex;
                    const numItems = $html.find(".gm-ticker-entry").length;
                    this.db.move(id, this.verticalEdge === "top" ? newIndex : numItems - newIndex - 1, true);
                }
            });
        }
        
        else {
            // Drag/drop reordering
            new SortableJS($html.find(".user-ticker-list").get(0), {
                animation: 200,
                direction: "vertical",
                draggable: ".ticker-entry",
                dragClass: "drag-preview",
                ghostClass: "drag-gap",
                onEnd: (event) => {
                    const id = event.item.dataset.id;
                    const newIndex = event.newDraggableIndex;
                    const numItems = $html.find(".user-ticker-entry").length;
                    this.db.move(id, this.verticalEdge === "top" ? newIndex : numItems - newIndex - 1, false);
                }
            });
        }
    }
}