import Config from "../config/Config";
import Strategy from "./strategies/Strategy";
import StrategyHandler from "./handlers/StrategyHandler";
import StrategyResult from "./entity/StrategyResult";
import Trade from "./entity/Trade"
import {TradeTypes, EntryType} from "./entity/TradeTypes"

let strategies: Strategy<any>[] = Config.strategies;

export default StrategyHandler;

export {
    strategies,
    Strategy as Strategy,
    StrategyResult as StrategyResult,
    Trade as Trade,
    TradeTypes as TradeTypes,
    EntryType as EntryType
}