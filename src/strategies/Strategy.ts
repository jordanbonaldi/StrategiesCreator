import { CandleModel } from "@jordanbonaldi/binancefetcher";
import {EntryType, Trade} from "@jordanbonaldi/indicatorsapi";
import StrategyHandler from "../handlers/StrategyHandler";
import StrategyResult from "../entity/StrategyResult";
import BackTestParams, {RiskType} from "../entity/BacktestParams";
import TradeResult, {TradeStatus} from "../entity/TradeResult";

export interface StrategyParams {
    asset: string;
    timeframe: string | string[];
}

export default abstract class Strategy<T> {
    name !: string;
    defaultParams !: T & StrategyParams;
    backTestParams !: BackTestParams;

    protected constructor(
        name: string,
        defaultParams: T & StrategyParams,
        backTestParams: BackTestParams
    ) {
        this.name = name;
        this.defaultParams = defaultParams;
        this.backTestParams = backTestParams;

        StrategyHandler.add(this);
    }

    launchBootstrapStrategy(
        candles: CandleModel[],
        trade: Trade | undefined = undefined,
        params: T & StrategyParams = this.defaultParams,
    ): Trade {
        return this.launchStrategy(candles, trade, params);
    }

    abstract launchStrategy(candles: CandleModel[], trade: Trade | undefined, params: T & StrategyParams): Trade;

    private tradeResultComputation(entryTrade: Trade, exitTrade: Trade): TradeResult {
        return {
            entryTrade: entryTrade,
            exitTrade: exitTrade,
            pricePercent: ((exitTrade.price - entryTrade.price) / entryTrade.price * 100),
            tradeStatus: entryTrade.price < exitTrade.price ? TradeStatus.WIN : entryTrade.price > exitTrade.price ? TradeStatus.LOST : TradeStatus.BREAK_EVEN,
        };
    }

    tryStrategy(candles: CandleModel[], backTestParams: BackTestParams, params: T & StrategyParams): StrategyResult {
        let strategyResult: StrategyResult = {
            total: 0,
            win: 0,
            lost: 0,
            equityPercent: 100,
            maxDrawDown: 0,
            maxLosingStreak: 0,
            tradeResults: [],
            asset: this.defaultParams.asset,
            timeframe: this.defaultParams.timeframe
        };
        let tradeResult: TradeResult;
        let currentTrade: Trade | undefined = undefined, lastTrade = undefined;
        let currentEquity: number = backTestParams.equity, losingStreak = 0, saveEquity = backTestParams.equity, drawDown = 0;

        for (let a = backTestParams.warm_up; a < candles.length; a++) {
            currentTrade = this.launchStrategy(candles.slice(0, a), currentTrade, params);
            if (currentTrade.entryType == EntryType.ENTRY && !lastTrade) {
                lastTrade = currentTrade;
            }
            if (currentTrade.entryType == EntryType.EXIT && lastTrade) {
                tradeResult = this.tradeResultComputation(lastTrade, currentTrade);
                if (backTestParams.riskType == RiskType.PERCENT) {
                    currentEquity += (backTestParams.riskInTrade / 100 * currentEquity) / 100 * tradeResult.pricePercent;
                } else {
                    currentEquity += backTestParams.riskInTrade * (1 + tradeResult.pricePercent / 100);
                }
                tradeResult.tradeStatus == TradeStatus.WIN ? strategyResult.win++ : strategyResult.lost++;
                strategyResult.equityPercent = (currentEquity - backTestParams.equity) / backTestParams.equity * 100;
                strategyResult.total++;
                if (tradeResult.tradeStatus == TradeStatus.LOST && (strategyResult.tradeResults.length == 0 || (strategyResult.tradeResults.length > 0 && strategyResult.tradeResults[strategyResult.tradeResults.length - 1].tradeStatus == TradeStatus.LOST))) {
                    losingStreak++;
                }
                else if (tradeResult.tradeStatus == TradeStatus.WIN) {
                    drawDown = (saveEquity - currentEquity) / saveEquity * 100;
                    strategyResult.maxLosingStreak = losingStreak > strategyResult.maxLosingStreak ? losingStreak : strategyResult.maxLosingStreak;
                    strategyResult.maxDrawDown = drawDown > 0 && drawDown > strategyResult.maxDrawDown ? drawDown : strategyResult.maxDrawDown;
                    losingStreak = 0;
                    drawDown = 0;
                    saveEquity = currentEquity;
                }
                strategyResult.tradeResults.push(tradeResult);
                lastTrade = undefined;
            }
            currentTrade = lastTrade;
        }

        return strategyResult;
    }

}