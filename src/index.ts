import { Trade } from "@jordanbonaldi/indicatorsapi";
import algorithmTest from "./tests/BinanceAlgorithmTests";
import StrategyHandler from "./handlers/StrategyHandler";
import Config from "../config/Config";

Config.strategies;

Promise.all(StrategyHandler.getAll().map(strategy => algorithmTest(strategy.algorithm).then((trade: Trade) => console.log(trade))));
