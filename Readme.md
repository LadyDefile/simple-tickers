# Simple Tickers

Blades in the Dark style progress clocks that show on the sidebar for Foundry VTT. Thank you to the original module [Global Progress Clocks](https://github.com/CarlosFdez/global-progress-clocks) Unlike the parent module, Simple Tickers allows players to have their own, personal tickers that they have full control of (creating, editing, and deleting).
For GMs the creation dialog appears as such:
![image](https://github.com/LadyDefile/simple-tickers/assets/67084868/d67aacfd-09d2-4c87-a2ca-c27867511bc5)
Name - The name that will be displayed with the clock
Size - The number of segments
Is Cyclical - When enabled, the timer can go from full -> zero and zero -> full



![image](https://user-images.githubusercontent.com/1286721/232355007-becf4713-ee84-49df-9803-1724f7fd8684.png)

These clocks are only editable by the gamemaster, and can either be edited with a dialog or ticked by left or right clicking.

## Scripting

There is no full api, but there is `window.clockDatabase` to mess with the clocks themselves. Here's an example to increment an existing clock.
```js
const clock = window.clockDatabase.getName("Test a cloc");
window.clockDatabase.update({ id: clock.id, value: clock.value + 1 });
```

## Credits
* Lunar-Dawn for converting from the original images to CSS generated
