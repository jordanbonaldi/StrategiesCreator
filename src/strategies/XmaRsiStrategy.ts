import Strategy, { Persistence, StrategyParams } from "./Strategy";
import { Alma, sma, reverseIndex, rsi, Zlema, atr, HeikinAshi, Smma, CandleCheck } from "@jordanbonaldi/indicatorsapi";
import { CandleModel } from "@jordanbonaldi/binancefetcher";
import { RiskType } from "../entity/BacktestParams";
import Trade from "../entity/Trade";
import { EntryType, TradeTypes } from "../entity/TradeTypes";
import { ExitTypes } from "../entity/ExitTypes";

export class XmaRsiInput implements StrategyParams {

    asset: string = 'BTCUSDT';
    timeframe: string[] = ['1d'];
    data = {
        rsiPeriod: 14,
        xmaPeriod: 21,
        xmaRsiPeriod: 21,
        useAntiLag: true,
        xmaAntiLagPeriod: 7,
        atrPeriod: 7,
    };
    stopPercentage: number = 2;
    useStopLoss: boolean = true;
    useAtrStopLoss: boolean = true;
    useHaCandle: boolean = true;
}

export interface XmaPersistence extends Persistence {
    value?: number;
}

export default new class XmaRsiStrategy extends Strategy<XmaRsiInput, XmaPersistence> {
    constructor() {
        super('XmaRsiStrategy', new XmaRsiInput(), {
            equity: 10000, riskInTrade: 90, riskType: RiskType.PERCENT, warm_up: 70
        });

        this.backTestParams.warm_up = this.defaultParams.data.xmaPeriod > this.defaultParams.data.xmaRsiPeriod + this.defaultParams.data.rsiPeriod ? this.defaultParams.data.xmaPeriod : this.defaultParams.data.xmaRsiPeriod + this.defaultParams.data.rsiPeriod;
    }

    /**
     *
     * @param candles Candle Model of type Candle
     *
     * Copy paste the code below inside brackets
     * @param trade possible current trade
     * @param timeFrame
     * @param params params taken
     */
    launchStrategy(candles: CandleModel[], trade: Trade | undefined, timeFrame: string, params: XmaRsiInput & StrategyParams): Trade {
        let source: CandleModel[] = params.useHaCandle ? HeikinAshi(candles) : candles;
        let lastCandle: CandleModel = reverseIndex(candles, 1);
        let liveCandle: CandleModel = reverseIndex(candles);

        let indicatorsCandles = source.map(c => c.close).slice(0, -1);
        let rsiCandles = source.map(c => c.close).slice(0, -1);

        let myXma: number[] = Alma({ period: params.data.xmaPeriod, values: indicatorsCandles, offset: 0.5, sigma: 6 });
        let myRsi = rsi({ period: params.data.rsiPeriod, values: rsiCandles });
        let myXmaRsi = Zlema({ period: params.data.xmaRsiPeriod, values: myRsi });
        let myXmaAntiLag = Smma({ period: params.data.xmaAntiLagPeriod, values: indicatorsCandles });
        // let myAtr = atr({
        //     low: source.map(c => c.low),
        //     high: source.map(c => c.high),
        //     close: source.map(c => c.close),
        //     period: params.data.atrPeriod,
        // })

        let isXmaBull = reverseIndex(myXma) > reverseIndex(myXma, 1);
        let isXmaRsiBull = reverseIndex(myXmaRsi) > reverseIndex(myXmaRsi, 1);
        let isXmaAntiLagBull = reverseIndex(myXmaAntiLag) > reverseIndex(myXmaAntiLag, 1);

        let entryLongCond = isXmaBull && isXmaRsiBull && isXmaAntiLagBull;
        let entryShortCond = !isXmaBull && !isXmaRsiBull && !isXmaAntiLagBull;
        let exitLongCond = !isXmaBull;
        let exitShortCond = isXmaBull;
        let stopLossLong: number = params.useStopLoss ? lastCandle.close * (1 - params.stopPercentage / 100) : 0;
        let stopLossShort: number = params.useStopLoss ? lastCandle.close * (1 + params.stopPercentage / 100) : 0;

        let currentTrade: Trade | undefined = undefined;

        if (!trade) {
            currentTrade = entryShortCond || entryLongCond ? {
                entryType: EntryType.ENTRY,
                type: entryLongCond ? TradeTypes.LONG : TradeTypes.SHORT,
                price: lastCandle.close,
                stoploss: entryLongCond ? stopLossLong : stopLossShort,
                exitType: ExitTypes.PROFIT,
                asset: params.asset,
                timeframe: timeFrame,
                date: new Date()
            } : undefined;
            this.data = this.data === undefined ? { entryCandle: lastCandle } as XmaPersistence & Persistence : {
                ...this.data,
                entryCandle: lastCandle
            };
        }
        else if (!CandleCheck(this.data?.entryCandle, lastCandle))
            currentTrade = trade.type === TradeTypes.LONG ? (
                params.useStopLoss && trade.stoploss > lastCandle.low ? {
                    entryType: EntryType.EXIT,
                    type: TradeTypes.LONG,
                    price: trade.stoploss,
                    stoploss: 0,
                    exitType: ExitTypes.STOPLOSS,
                    asset: params.asset,
                    timeframe: timeFrame,
                    date: new Date()
                } : exitLongCond ? {
                    entryType: EntryType.EXIT,
                    type: TradeTypes.LONG,
                    price: lastCandle.close,
                    stoploss: 0,
                    exitType: trade.price < lastCandle.close ? ExitTypes.PROFIT : ExitTypes.LOSS,
                    asset: params.asset,
                    timeframe: timeFrame,
                    date: new Date()
                } : undefined
            ) : trade.type === TradeTypes.SHORT ? (
                params.useStopLoss && trade.stoploss < lastCandle.high ? {
                    entryType: EntryType.EXIT,
                    type: TradeTypes.SHORT,
                    price: trade.stoploss,
                    stoploss: 0,
                    exitType: ExitTypes.STOPLOSS,
                    asset: params.asset,
                    timeframe: timeFrame,
                    date: new Date()
                } : exitShortCond ? {
                    entryType: EntryType.EXIT,
                    type: TradeTypes.SHORT,
                    price: lastCandle.close,
                    stoploss: 0,
                    exitType: trade.price > lastCandle.close ? ExitTypes.PROFIT : ExitTypes.LOSS,
                    asset: params.asset,
                    timeframe: timeFrame,
                    date: new Date()
                } : undefined
            ) : undefined;

        return currentTrade ? currentTrade : {
            entryType: EntryType.NOTHING,
            type: TradeTypes.LONG,
            price: 0,
            stoploss: 0,
            exitType: ExitTypes.PROFIT,
            asset: params.asset,
            timeframe: timeFrame,
            date: new Date()
        }
    }
}