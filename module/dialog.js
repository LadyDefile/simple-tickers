import { MODULE_ID } from "./settings.js";

const TICKER_MAX_SIZE = 32;
const TICKER_SIZES = [2, 3, 4, 5, 6, 8, 10, 12];

export class TickerAddDialog extends Application {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            title: "SimpleTickers.CreateDialog.Title",
            template: "modules/simple-tickers/templates/ticker-add-dialog.hbs",
            classes: ["dialog"],
            width: 400,
        });
    }

    get title() {
        return game.i18n.localize(`SimpleTickers.CreateDialog.${this.ticker ? "EditTitle" : "Title"}`);
    }

    constructor(ticker, complete) {
        super();
        this.ticker = ticker;
        this.complete = complete;
    }

    async getData() {
        const data = await super.getData();
        return {
            ...data,
            ticker: this.ticker,
            maxSize: TICKER_MAX_SIZE,
            presetSizes: TICKER_SIZES,
            isGM: game.user.isGM,
            tickerColors: game.settings.get(MODULE_ID, "tickerColors"),
        }
    }

    activateListeners($html) {
        super.activateListeners($html);

        // Autofocus the name. Move to _injectHTML if we need to re-render
        $html.find("[autofocus]")[0]?.focus();

        const inputElement = $html.find(".dropdown-wrapper input");
        $html.find(".dropdown li").on("mousedown", (event) => {
            inputElement.val(event.target.getAttribute("data-value"));
        });

        $html.find(".dialog-button").on("click", (evt) => {
            evt.preventDefault();
            const button = evt.target.dataset.button;
            if (button === "yes") {
                const form = $html[0].querySelector("form");
                const data = new FormDataExtended(form).object;
                if (this.ticker) {
                    data.id = this.ticker.id;
                    data.value = Math.clamped(this.ticker.value, 0, data.max);
                }

                this.complete(data);
            }

            this.close();
        });
    }
}