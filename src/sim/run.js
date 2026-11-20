// Vòng chạy headless dùng chung cho CLI và unit test.
import { createGame, stepGame, snapshotOf } from "./game.js";
import { applyFrame } from "./input.js";
import { snapshotLine, eventLine, endLine } from "./output.js";

/**
 * @param {{seed:number, scenario?:object, inputs?:{frames:object[]}, ticks:number, snapshotEvery?:number}} opts
 * @returns {{lines:string[], game:object}}
 */
export function runHeadless({ seed, scenario, inputs, ticks, snapshotEvery = 10 }) {
  const g = createGame({ seed, scenario });
  const frames = inputs ? inputs.frames : [];
  let fi = 0;
  const lines = [snapshotLine(snapshotOf(g))]; // tick 0: sau khi dựng scenario, trước input

  for (let k = 0; k < ticks && g.state === "playing"; k++) {
    const events = stepGame(g, (inp) => {
      // bước k đọc input của tick k
      while (fi < frames.length && frames[fi].tick <= k) applyFrame(inp, frames[fi++]);
    });
    for (const e of events) lines.push(eventLine(e));
    if (g.tick % snapshotEvery === 0) lines.push(snapshotLine(snapshotOf(g)));
  }
  lines.push(endLine(g));
  return { lines, game: g };
}
