import Config from "../config/Config";
import Strategy from "./strategies/Strategy";
import StrategyHandler from "./handlers/StrategyHandler";

let strategies: Strategy<any>[] = Config.strategies;

export default StrategyHandler;

export {
    strategies,
    Strategy as Strategy,
}