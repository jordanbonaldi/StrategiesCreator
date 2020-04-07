import Config from "../config/Config";
import Strategy, {Persistence, StrategyParams} from "./strategies/Strategy";
import StrategyHandler from "./handlers/StrategyHandler";
import StrategyResult from "./entity/StrategyResult";
import Trade from "./entity/Trade"
import {TradeTypes, EntryType} from "./entity/TradeTypes"
import PersistenceHandler, { PersistenceAllowanceInterface } from "./handlers/PersistenceHandler";

let strategies: Strategy<any & StrategyParams, any & Persistence>[] = Config.strategies;

export default StrategyHandler;
export {
    strategies,
    PersistenceHandler as PersistenceHandler,
    PersistenceAllowanceInterface as PersistenceAllowanceInterface,
    Strategy as Strategy,
    StrategyResult as StrategyResult,
    StrategyParams as StrategyParams,
    Persistence as Persistence,
    Trade as Trade,
    TradeTypes as TradeTypes,
    EntryType as EntryType
}