import { CandleModel } from "@jordanbonaldi/binancefetcher";
import { Trade } from "@jordanbonaldi/indicatorsapi";
import StrategyHandler from "../handlers/StrategyHandler";
import StrategyResult from "./StrategyResult";
import BacktestParams from "./BacktestParams";

export interface StrategyParams { }

export default abstract class Strategy<T> {
    name !: string;
    defaultParams !: T & StrategyParams;
    backtestParams !: BacktestParams;

    protected constructor(name: string, defaultParams: T & StrategyParams, backtestParams: BacktestParams) {
        this.name = name;
        this.defaultParams = defaultParams;
        this.backtestParams = backtestParams;

        StrategyHandler.add(this);
    }

    launchBootstrapAlgorithm(
        candles: CandleModel[],
        assetDetail: string,
        assetTimeFrame: string,
        trade: Trade | undefined = undefined,
        params: T & StrategyParams = this.defaultParams,
    ): Trade {
        return this.algorithm(candles, assetDetail, assetTimeFrame, trade, params);
    }

    launchBootstrapBacktest(
        candles: CandleModel[],
        assetDetail: string,
        assetTimeFrame: string,
        backtestParams: BacktestParams = this.backtestParams,
        params: T & StrategyParams = this.defaultParams,
    ): StrategyResult {
        return this.backtest(candles, assetDetail, assetTimeFrame, backtestParams, params);
    }

    abstract algorithm(candles: CandleModel[], assetDetail: string, assetTimeFrame: string, trade: Trade | undefined, params: T & StrategyParams): Trade;
    abstract backtest(candles: CandleModel[], assetDetail: string, assetTimeFrame: string, backtestParams: BacktestParams, params: T & StrategyParams): StrategyResult;

}