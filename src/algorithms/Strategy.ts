import {CandleChartResult} from "@jordanbonaldi/binancefetcher";
import {Trade} from "@jordanbonaldi/indicatorsapi";
import StrategyHandler from "../handlers/StrategyHandler";

export default  abstract class Strategy {
    name !: string;

    protected constructor(name: string) {
        this.name = name;

        StrategyHandler.add(this);
    }

    abstract algorithm(candles: CandleChartResult[], assetDetail: string, assetTimeFrame: string, params: any, trade: Trade | undefined): Trade;
}