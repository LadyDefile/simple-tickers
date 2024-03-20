import { TickerPanel } from "./ticker-panel.js";
import { TickerDatabase } from "./database.js";
import { registerSettings } from "./settings.js";
import { MODULE_ID } from "./settings.js";

Hooks.once("socketlib.ready", () => {
    window.tickerSocket = socketlib.registerModule(MODULE_ID);
    window.tickerSocket.register("addTicker", (data) => {
        tickerDatabase.addTicker(data);
    })
    window.tickerSocket.register("updateTicker", (data) => {
        tickerDatabase.update(data);
    })
    window.tickerSocket.register("deleteTicker", (id)=> {
        tickerDatabase.delete(id);
    })
})

Hooks.once("init", () => {
    registerSettings();

    window.tickerDatabase = new TickerDatabase();
    window.tickerPanel = new TickerPanel(window.tickerDatabase);
    window.tickerDatabase.refresh();

    // Create a spot for the ticker panel to render into
    const top = document.querySelector("#ui-top");
    if (top) {
        const template = document.createElement("template");
        template.setAttribute("id", "ticker-panel");
        top?.insertAdjacentElement("afterend", template);
    }
});

Hooks.on("canvasReady", () => {
    window.tickerPanel.render(true);
});

Hooks.on("createSetting", (setting) => {
    if (setting.key === "simple-tickers.activeTickers") {
        window.tickerDatabase.refresh();
    }
});

Hooks.on("updateSetting", (setting) => {
    if (setting.key === "simple-tickers.activeTickers") {
        window.tickerDatabase.refresh();
    }
});