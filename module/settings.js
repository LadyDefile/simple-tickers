const MODULE_ID = "simple-tickers";

function registerSettings() {
    game.settings.register(MODULE_ID, "location", {
        name: game.i18n.localize("SimpleTickers.Settings.location.name"),
        hint: game.i18n.localize("SimpleTickers.Settings.location.hint"),
        config: true,
        choices: {
            topRight: "Top Right",
            bottomRight: "Bottom Right"
        },
        default: "bottomRight",
        onChange: () => window.tickerPanel.render(true),
        type: String,
    });

    game.settings.register(MODULE_ID, "offset", {
        name: game.i18n.localize("SimpleTickers.Settings.offset.name"),
        hint: game.i18n.localize("SimpleTickers.Settings.offset.hint"),
        config: true,
        default: 0,
        onChange: () => window.tickerPanel.render(true),
        type: Number
    });

    game.settings.registerMenu(MODULE_ID, "settings", {
        name: "SimpleTickers.Settings.TickerTheme.name",
        hint: "SimpleTickers.Settings.TickerTheme.hint",
        label: "SimpleTickers.Settings.TickerTheme.label",
        icon: "fa-solid fa-cog",
        type: DisplaySettings,
        restricted: true
    });
    DisplaySettings.registerSettings();

    game.settings.register(MODULE_ID, "activeTickers", {
        name: "Active Tickers",
        scope: "world",
        type: Object,
        default: {},
        config: false
    });

    game.settings.register(MODULE_ID, "gmTickers", {
        name: "GM Tickers",
        scope: "world",
        type: Object,
        default: {},
        config: false
    });

    game.settings.register(MODULE_ID, "userTickers", {
        name: "User Tickers",
        scope: "world",
        type: Object,
        default: {},
        config: false
    });

    game.settings.register(MODULE_ID, "gmOverridePrivacy", {
        name: game.i18n.localize("SimpleTickers.Settings.gmOverridePrivacy.name"),
        hint: game.i18n.localize("SimpleTickers.Settings.gmOverridePrivacy.hint"),
        config: true,
        default: true,
        scope: "world",
        onChange: () => window.tickerPanel.render(true),
        type: Boolean
    });

    game.settings.register(MODULE_ID, "collapsedHeaders", {
        name: game.i18n.localize("SimpleTickers.Settings.hiddenTickers.name"),
        hint: game.i18n.localize("SimpleTickers.Settings.hiddenTickers.hint"),
        config: false,
        type: Array,
        default: [],
        onChange: () => {
            window.tickerPanel.render(true);
        }
    });
}

class DisplaySettings extends FormApplication {
    cache = {}

    static get defaultOptions() {
        const options = super.defaultOptions;
        options.title = "SimpleTickers.Settings.TickerTheme.label";
        options.id = `${MODULE_ID}-display-settings`;
        options.classes = [MODULE_ID, "settings", "theme"];
        options.template = "modules/simple-tickers/templates/settings.hbs";
        options.width = 500;
        options.height = "auto";
        options.closeOnSubmit = false;
        options.submitOnChange = true;
        return options;
    }

    static registerSettings() {
        game.settings.register(MODULE_ID, "defaultColor", {
            name: game.i18n.localize("SimpleTickers.Settings.defaultColor.name"),
            hint: game.i18n.localize("SimpleTickers.Settings.defaultColor.hint"),
            config: false,
            type: String,
            default: "#ff0000",
            onChange: () => {
                window.tickerPanel.render(true);
            }
        });

        game.settings.register(MODULE_ID, "tickerColors", {
            name: game.i18n.localize("SimpleTickers.Settings.tickerColors.name"),
            hint: game.i18n.localize("SimpleTickers.Settings.tickerColors.hint"),
            config: false,
            type: Array,
            default: [],
            onChange: () => {
                window.tickerPanel.render(true);
            }
        });
    }

    async getData() {
        if (Object.keys(this.cache).length === 0) {
            this.cache = {
                defaultColor: game.settings.get(MODULE_ID, "defaultColor"),
                tickerColors: game.settings.get(MODULE_ID, "tickerColors"),
            };
        }

        return {
            ...(await super.getData()),
            ...this.cache,
        };
    }

    activateListeners($html) {
        super.activateListeners($html);
        $html.find("a[data-action=reset-property][data-property=defaultColor]").on("click", () => {
            this.cache.defaultColor = "#ff0000";
            this.render();
        });

        $html.find("a[data-action=add-ticker-color]").on("click", () => {
            this.cache.tickerColors ??= [];
            this.cache.tickerColors.push({
                id: foundry.utils.randomID(),
                name: "New Ticker Type",
                color: "#ff0000"
            });
            this.render();
        });

        $html.find("a[data-action=remove-ticker-color]").on("click", (evt) => {
            const tickerId = evt.target.closest("[data-ticker-id]").dataset.tickerId;
            const idx = this.cache.tickerColors.findIndex((c) => c.id === tickerId);
            if (idx >= 0) {
                this.cache.tickerColors.splice(idx, 1);
            }
            this.render();
        });

        $html.find("button[type=reset]").on("click", () => {
            for (const key of Object.keys(this.cache)) {
                delete this.cache[key];
            }
            this.render();
        });
    }

    async _updateObject(event, data) {
        data = expandObject(data);
        this.cache.defaultColor = data.defaultColor;
        this.cache.tickerColors = Object.values(data.tickerColors ?? {});

        if (event.type === "submit") {
            await game.settings.set(MODULE_ID, "defaultColor", this.cache.defaultColor);
            await game.settings.set(MODULE_ID, "tickerColors", this.cache.tickerColors);
            this.close();
        } else {
            console.log("RENDER");
            this.render();
        }
    }
}

export { MODULE_ID, registerSettings };