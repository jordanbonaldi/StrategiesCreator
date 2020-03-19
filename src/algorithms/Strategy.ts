import {CandleChartResult} from "@jordanbonaldi/binancefetcher";
import {Trade} from "@jordanbonaldi/indicatorsapi";
import StrategyHandler from "../handlers/StrategyHandler";

export interface StrategyParams {}

export default  abstract class Strategy<T> {
    name !: string;
    defaultParams !: T & StrategyParams;

    protected constructor(name: string, defaultParams: T & StrategyParams) {
        this.name = name;
        this.defaultParams = defaultParams;

        StrategyHandler.add(this);
    }

    launchBootstrapAlgorithm(
        candles: CandleChartResult[],
        assetDetail: string,
        assetTimeFrame: string,
        trade: Trade | undefined = undefined,
        params: T & StrategyParams = this.defaultParams,
    ): Trade {
        return this.algorithm(candles, assetDetail, assetTimeFrame, trade, params);
    }

    abstract algorithm(candles: CandleChartResult[], assetDetail: string, assetTimeFrame: string, trade: Trade | undefined, params: T & StrategyParams): Trade;
}