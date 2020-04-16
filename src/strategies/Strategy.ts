import { CandleModel } from "@jordanbonaldi/binancefetcher";
import StrategyHandler from "../handlers/StrategyHandler";
import StrategyResult from "../entity/StrategyResult";
import BackTestParams, { RiskType } from "../entity/BacktestParams";
import TradeResult, { TradeStatus } from "../entity/TradeResult";
import Trade from "../entity/Trade";
import { EntryType, TradeTypes } from "../entity/TradeTypes";
import PersistenceManager, { PersistenceAllowanceInterface } from "../handlers/PersistenceHandler";
import { ExitTypes } from "../entity/ExitTypes";


export interface StrategyParams {
    asset: string;
    timeframe: string[];
    useStopLoss: boolean;
    stopPercentage: number;
}

export interface StrategyTradeInterface {
    entryTrade: Trade,
    exitTrade: Trade | undefined;
}

export interface Persistence {
    currentTrade: Trade | undefined,
    entryCandle: CandleModel | undefined
}

export default abstract class Strategy<T, U> {

    name !: string;
    defaultParams !: T & StrategyParams;
    backTestParams !: BackTestParams;

    data: U & Persistence | undefined;

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
     * @param callback
     */
    launchTrade(callback: () => Trade) {
        let pai: PersistenceAllowanceInterface<T, U & Persistence> | undefined = PersistenceManager.getPersistence<T, U & any>(this);
        this.data = pai == null ? undefined : pai.data;
        let trade: Trade = callback();

        if (trade !== undefined &&
            trade.entryType == EntryType.ENTRY
        ) {
            if (
                (this.data === undefined || this.data.currentTrade === undefined) ||
                (this.data.currentTrade.type !== trade.type || this.data.currentTrade.price !== trade.price)) {
                this.data = this.data === undefined ? { currentTrade: trade } as U & Persistence : {
                    ...this.data,
                    currentTrade: trade
                };
            }
            else if (this.data.currentTrade.type == trade.type
                && this.data.currentTrade.price == trade.price) {
                trade.entryType = EntryType.NOTHING;
            }
            else
                this.data.currentTrade = undefined
        }

        PersistenceManager.setPersistence<T, U>(this);
        return trade;
    }

    /**
     *
     * @param trades
     */
    private static tradeResultComputation(trades: StrategyTradeInterface): TradeResult | undefined {
        return !trades.exitTrade ? undefined : {
            entryTrade: trades.entryTrade,
            exitTrade: trades.exitTrade,
            pricePercent: (trades.exitTrade.price - trades.entryTrade.price) / trades.entryTrade.price * 100,
            tradeStatus: trades.entryTrade.type == TradeTypes.LONG ? (trades.entryTrade.price < trades.exitTrade.price ? TradeStatus.WIN : trades.entryTrade.price > trades.exitTrade.price ? TradeStatus.LOST : TradeStatus.BREAK_EVEN) : (trades.entryTrade.price > trades.exitTrade.price ? TradeStatus.WIN : trades.entryTrade.price < trades.exitTrade.price ? TradeStatus.LOST : TradeStatus.BREAK_EVEN),
        };
    }

    public static computeStrategyTrades(trades: StrategyTradeInterface[], asset: string, timeframe: string[]): StrategyResult {
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
            asset: asset,
            timeframe: timeframe
        };
        let equity = 1000;
        let riskInTrade = 90;
        let currentEquity: number = equity, losingStreak = 0, saveEquity = equity, drawDown = 0, equityPercent = 0, prevEquity = saveEquity;
        let tradeResult: TradeResult | undefined;

        trades.forEach(trade => {
            tradeResult = Strategy.tradeResultComputation(trade);
            if (tradeResult) {
                equityPercent = ((trade.entryTrade.type === TradeTypes.LONG ? tradeResult.pricePercent : - tradeResult.pricePercent) / 100);
                //if (backTestParams.riskType === RiskType.PERCENT) {
                currentEquity += (currentEquity * riskInTrade / 100) * equityPercent;
                // } else {
                //     currentEquity += backTestParams.riskInTrade * equityPercent;
                // }

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
                trade.entryTrade.type === TradeTypes.LONG ? strategyResult.totalLong++ : strategyResult.totalShort++;
                tradeResult.tradeStatus == TradeStatus.WIN ? strategyResult.win++ : strategyResult.lost++;
                strategyResult.tradeResults.push(tradeResult);
            }
        });

        drawDown = (saveEquity - prevEquity) / saveEquity * 100;
        strategyResult.maxDrawDown = drawDown > 0 && drawDown > strategyResult.maxDrawDown ? drawDown : strategyResult.maxDrawDown;
        strategyResult.equityPercent = (currentEquity - equity) / equity * 100;
        strategyResult.tradeResults = [];
        return strategyResult;
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
        let strategyTrades: StrategyTradeInterface[] = [];
        let currentTrade: Trade | undefined = undefined, candleTrade = undefined;

        for (let a = backTestParams.warm_up; a < candles.length; a++) {
            for (let b = 0; b < 2; b++) {
                let candleTrade: Trade = this.launchTrade(() => this.launchStrategy(
                    candles.slice(0, a), currentTrade, timeFrame, params
                ));
                if (candleTrade.entryType == EntryType.ENTRY && !currentTrade) {
                    currentTrade = candleTrade;
                }
                else if (candleTrade.entryType == EntryType.EXIT && currentTrade) {
                    strategyTrades.push({ entryTrade: currentTrade, exitTrade: candleTrade });
                    currentTrade = undefined;
                }
            }
        }
        return Strategy.computeStrategyTrades(strategyTrades, this.defaultParams.asset, this.defaultParams.timeframe)
    }
}