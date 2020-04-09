import { CandleModel } from "@jordanbonaldi/binancefetcher";
import StrategyHandler from "../handlers/StrategyHandler";
import StrategyResult from "../entity/StrategyResult";
import BackTestParams, { RiskType } from "../entity/BacktestParams";
import TradeResult, { TradeStatus } from "../entity/TradeResult";
import Trade from "../entity/Trade";
import { EntryType, TradeTypes } from "../entity/TradeTypes";
import PersistenceManager, { PersistenceAllowanceInterface } from "../handlers/PersistenceHandler";


export interface StrategyParams {
    asset: string;
    timeframe: string[];
    useStopLoss: boolean;
    stopPercentage: number;
}

export interface Persistence { }

export default abstract class Strategy<T, U> {

    name !: string;
    defaultParams !: T & StrategyParams;
    backTestParams !: BackTestParams;

    data: U | undefined;

    /**
     *
     * @param name
     * @param defaultParams
     * @param backTestParams
     */
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
        timeFrame: string,
        trade: Trade | undefined = undefined,
        params: T & StrategyParams = this.defaultParams,
    ): Trade {
        return this.launchTrade(() => this.launchStrategy(candles, trade, timeFrame, params));
    }

    /**
     *
     * @param candles
     * @param trade
     * @param timeFrame
     * @param params
     */
    abstract launchStrategy(candles: CandleModel[], trade: Trade | undefined, timeFrame: string, params: T & StrategyParams): Trade;

    /**
     *
     * @param entryTrade
     * @param exitTrade
     */
    private static tradeResultComputation(entryTrade: Trade, exitTrade: Trade): TradeResult {
        return {
            entryTrade: entryTrade,
            exitTrade: exitTrade,
            pricePercent: (exitTrade.price - entryTrade.price) / entryTrade.price * 100,
            tradeStatus: entryTrade.type == TradeTypes.LONG ? (entryTrade.price < exitTrade.price ? TradeStatus.WIN : entryTrade.price > exitTrade.price ? TradeStatus.LOST : TradeStatus.BREAK_EVEN) : (entryTrade.price > exitTrade.price ? TradeStatus.WIN : entryTrade.price < exitTrade.price ? TradeStatus.LOST : TradeStatus.BREAK_EVEN),
        };
    }

    /**
     *
     * @param callback
     */
    launchTrade(callback: () => Trade) {
        let pai: PersistenceAllowanceInterface<T, U> | undefined = PersistenceManager.getPersistence<T, U>(this);
        this.data = pai == null ? undefined : pai.data;
        let trade: Trade = callback();
        PersistenceManager.setPersistence<T, U>(this);

        return trade;
    }

    /**
     *
     * @param candles
     * @param timeFrame
     * @param backTestParams
     * @param params
     */
    tryStrategy(
        candles: CandleModel[],
        timeFrame: string,
        backTestParams: BackTestParams = this.backTestParams,
        params: T & StrategyParams = this.defaultParams
    ): StrategyResult {
        let strategyResult: StrategyResult = {
            total: 0,
            totalLong: 0,
            totalShort: 0,
            win: 0,
            lost: 0,
            equityPercent: 0,
            maxDrawDown: 0,
            maxLosingStreak: 0,
            tradeResults: [],
            asset: this.defaultParams.asset,
            timeframe: this.defaultParams.timeframe
        };
        let tradeResult: TradeResult;
        let currentTrade: Trade | undefined = undefined, candleTrade = undefined;
        let currentEquity: number = backTestParams.equity, losingStreak = 0, saveEquity = backTestParams.equity, drawDown = 0, equityPercent = 0, prevEquity = saveEquity;

        for (let a = backTestParams.warm_up; a < candles.length; a++) {
            let candleTrade: Trade = this.launchTrade(() => this.launchStrategy(
                candles.slice(0, a), currentTrade, timeFrame, params
            ));
            if (candleTrade.entryType == EntryType.ENTRY && !currentTrade) {
                currentTrade = candleTrade;
            }
            else if (candleTrade.entryType == EntryType.EXIT && currentTrade) {
                tradeResult = Strategy.tradeResultComputation(currentTrade, candleTrade);
                console.log(tradeResult)
                console.log()
                equityPercent = ((currentTrade.type === TradeTypes.LONG ? tradeResult.pricePercent : - tradeResult.pricePercent) / 100);
                if (backTestParams.riskType === RiskType.PERCENT) {
                    currentEquity += (currentEquity * backTestParams.riskInTrade / 100) * equityPercent;
                } else {
                    currentEquity += backTestParams.riskInTrade * equityPercent;
                }

                if (tradeResult.tradeStatus === TradeStatus.LOST) {
                    losingStreak++;
                } else if (tradeResult.tradeStatus === TradeStatus.WIN) {
                    drawDown = (saveEquity - prevEquity) / saveEquity * 100;
                    strategyResult.maxDrawDown = drawDown > 0 && drawDown > strategyResult.maxDrawDown ? drawDown : strategyResult.maxDrawDown;
                    strategyResult.maxLosingStreak = losingStreak > strategyResult.maxLosingStreak ? losingStreak : strategyResult.maxLosingStreak;
                    saveEquity = currentEquity;
                    losingStreak = 0;
                    drawDown = 0;
                }
                prevEquity = currentEquity;

                strategyResult.total++;
                currentTrade.type === TradeTypes.LONG ? strategyResult.totalLong++ : strategyResult.totalShort++;
                tradeResult.tradeStatus == TradeStatus.WIN ? strategyResult.win++ : strategyResult.lost++;
                strategyResult.tradeResults.push(tradeResult);
                currentTrade = undefined;
            }
        }
        drawDown = (saveEquity - prevEquity) / saveEquity * 100;
        strategyResult.maxDrawDown = drawDown > 0 && drawDown > strategyResult.maxDrawDown ? drawDown : strategyResult.maxDrawDown;
        strategyResult.equityPercent = (currentEquity - backTestParams.equity) / backTestParams.equity * 100;
        strategyResult.tradeResults = [];
        return strategyResult;
    }
}