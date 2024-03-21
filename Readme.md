# Simple Tickers

Blades in the Dark style progress clocks that show on the sidebar for Foundry VTT. Thank you to the original module [Global Progress Clocks](https://github.com/CarlosFdez/global-progress-clocks) Unlike the parent module, Simple Tickers allows players to have their own, personal tickers that they have full control of (creating, editing, and deleting).
For GMs the creation dialog appears as such:

![image](https://github.com/LadyDefile/simple-tickers/assets/67084868/d67aacfd-09d2-4c87-a2ca-c27867511bc5)

Name - The name that will be displayed with the clock
Size - The number of segments
Privacy - Allows the DM to customize clock privacy. Public allows everyone to see the clock. Private hides the clock from all but GMs. Hide Name replaces the clock name with "???" on non-GM screens.

In the screenshots below, you can see the privacy options in action. The left image is the GM's screen while the right image is a player's screen.

![image](https://github.com/LadyDefile/simple-tickers/assets/67084868/2a373fbd-3bf4-4a4e-9b5d-37cbd865104c)
![image](https://github.com/LadyDefile/simple-tickers/assets/67084868/552eee4b-afa5-41e5-924c-11e30eb5f7f8)

GM tickers can only be modified by a GM and player tickers can only be modified by the player.

## Scripting

There is no full api, but there is `window.clockDatabase` to mess with the clocks themselves. Here's an example to increment an existing clock.
```js
const clock = window.clockDatabase.getName("Test a cloc");
window.clockDatabase.update({ id: clock.id, value: clock.value + 1 });
```

## Credits
* Lunar-Dawn for converting from the original images to CSS generated
* CarlosFdez for the parent module [Global Progress Clocks](https://github.com/CarlosFdez/global-progress-clocks)
