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

        const userTickers = {};
        const gmTickers = [];
        const collapsed = game.settings.get(MODULE_ID, "collapsedHeaders" );

        // For the purpose of organization, create an empty entry for the
        // current user in the userTickers option. This will ensure the
        // user's tickers are always next after the GM's in the list.
        userTickers[game.user.id] = {
            "id": game.user.id,
            "collapsed": collapsed.includes(game.user.id),
            "name": "Your Tickers",
            "tickers": [],
            "visCount": 0
        }

        let override_privacy = game.user.isGM && game.settings.get(MODULE_ID, "gmOverridePrivacy")

        // Categorize all of the tickers
        let bShow = false;
        for ( let i = 0; i < tickers.length; i++ )
        {
            let t = tickers[i];

            // Obfuscate the name if needed
            if ( t.privacy == PRIVACY_OBFUSCATE
                && !override_privacy
                && t.owner != game.user.id)
                t.name = "???"
            
            // This flag is to enable the "private" eye icon.
            t.private = t.privacy == PRIVACY_PRIVATE;

            // If the ticker is a GM ticker
            if ( t.GMTicker )
            {
                // If this is for GM's only and the user is not a GM
                // hide it from the user.
                if ( t.privacy == PRIVACY_PRIVATE && !game.user.isGM )
                    continue;

                // The clock is viewable by all
                t.viewable = true;

                // Push the clock to the GM list
                gmTickers.push(t);
            }
            else
            {
                t.ownedByUser = t.owner == game.user.id;
                
                t.viewable = t.ownedByUser;     // Start by saying only the user can view it
                t.viewable |= override_privacy  // If the user is a GM, it overrides the above
                t.viewable |= t.privacy != PRIVACY_PRIVATE; // If the privacy is not private, it's viewable.

                // If the user is already in the ticker data
                // add the ticker to the user otherwise create
                // the new data section
                if ( userTickers[t.owner] )
                {
                    userTickers[t.owner].tickers.push(t);
                    userTickers[t.owner].visCount +=  t.privacy == PRIVACY_PRIVATE && !t.viewable ? 0 : 1;
                }
                else
                {
                    userTickers[t.owner] = {
                        "id": t.owner,
                        "collapsed": collapsed.includes(t.owner),
                        "name": game.users.get(t.owner).name,
                        "tickers": [t],
                        "visCount": t.privacy == PRIVACY_PRIVATE && !t.viewable ? 0 : 1 }
                }

                bShow |= t.ownedByUser;
            }
        }

        if ( this.verticalEdge === "bottom" )
        {
            for ( let i = 0; i < userTickers.length; i++ )
            {
                userTickers[i].tickers = userTickers[i].ticker.reverse();
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
            UserTickers: userTickers,
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
            
            // If the current user is not the ticket owner and the user is not
            // the GM
            if ( ticker.owner !== game.user.id && !game.user.isGM)
                return;

            let val = ticker.value-1;
            ticker.value = val < 0 ? ticker.max : Math.max(val, 0);
            this.db.update(ticker);
        });

        $html.find("[data-action=collapse]").on("click", async (event) => {
            let target = event.target.dataset.target;
            let collapsed = game.settings.get(MODULE_ID, "collapsedHeaders" );

            if ( collapsed.includes(target) )
            {
                // Get the index
                const idx = collapsed.indexOf(target);
                if ( idx > -1 ) {
                    // Remove the index
                    collapsed.splice(idx, 1);
                    game.settings.set(MODULE_ID, "collapsedHeaders", collapsed);
                }
            }
            else {
                collapsed.push(target);
                game.settings.set(MODULE_ID, "collapsedHeaders", collapsed);
            }
        })

        $html.find("[data-action=add-ticker]").on("click", async () => {
            new TickerAddDialog(null, (data) => this.db.addTicker(data)).render(true);
        });

        $html.find("[data-action=edit-ticker]").on("click", async (event) => {
            const tickerId = event.target.closest("[data-id]").dataset.id;
            const ticker = this.db.get(tickerId);
            if (!ticker)
                return;
            
            // Only the ticker owner and GM can edit the ticker.
            if ( ticker.owner !== game.user.id && !game.user.isGM )
                return;

            new TickerAddDialog(ticker, (data) => this.db.update(data)).render(true);
        });

        $html.find("[data-action=delete-ticker]").on("click", async (event) => {
            const tickerId = event.target.closest("[data-id]").dataset.id;
            const ticker = this.db.get(tickerId);
            if (!ticker)
            
            // If the current user is not the ticket owner and not a GM
            // don't allow them to delete it.
            if ( ticker.owner !== game.user.id && !game.user.isGM)
                return;

            const deleting = await Dialog.confirm({
                title: game.i18n.localize("SimpleTickers.DeleteDialog.Title"),
                content: game.i18n.format("SimpleTickers.DeleteDialog.Message", { name: ticker.name }),
            });
            
            if (deleting) {
                this.db.delete(tickerId, ticker.GMTicker);
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