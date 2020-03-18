import { Trade } from "@jordanbonaldi/indicatorsapi";
import algorithmTest from "./tests/BinanceAlgorithmTests";
import StrategyHandler from "./handlers/StrategyHandler";

import XmaRsiStrategy from "./algorithms/XmaRsiStrategy";

XmaRsiStrategy;

Promise.all(StrategyHandler.getAll().map(strategy => algorithmTest(strategy.algorithm).then((trade: Trade) => console.log(trade))));
