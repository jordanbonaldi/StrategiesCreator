import Strategy, { Persistence, StrategyParams } from "./Strategy";
import { Alma, ema, sma, reverseIndex, rsi, Zlema, atr, HeikinAshi, Smma, CandleCheck } from "@jordanbonaldi/indicatorsapi";
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
        atrPeriod: 14,
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

    myAtr(input: { period: number, values: CandleModel[] }): number[] {
        let tr: number[] = []
        for (var b = 1; b < input.values.length; b++) {
            tr.push(
                Math.max(
                    Math.abs(input.values[b].high - input.values[b].low),
                    Math.abs(input.values[b].high - input.values[b - 1].close),
                    Math.abs(input.values[b].low - input.values[b - 1].close),
                )
            )
        }
        return Smma({ period: input.period, values: tr })
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

        let indicatorsCandles: number[] = source.map(c => c.close).slice(0, -1);
        let rsiCandles: number[] = source.map(c => c.close).slice(0, -1);

        let myXma: number[] = Alma({ period: params.data.xmaPeriod, values: indicatorsCandles, offset: 0.5, sigma: 6 });
        let myRsi: number[] = rsi({ period: params.data.rsiPeriod, values: rsiCandles });
        let myXmaRsi: number[] = Zlema({ period: params.data.xmaRsiPeriod, values: myRsi });
        let myXmaAntiLag: number[] = Smma({ period: params.data.xmaAntiLagPeriod, values: indicatorsCandles });
        let myAtr: number[] = this.myAtr({ period: params.data.atrPeriod, values: candles.slice(0, -1) })

        let myXmaAtr: number[] = Smma({ period: params.data.atrPeriod, values: myAtr });
        let isXmaBull: boolean = reverseIndex(myXma) > reverseIndex(myXma, 1);
        let isXmaRsiBull: boolean = reverseIndex(myXmaRsi) > reverseIndex(myXmaRsi, 1);
        let isXmaAntiLagBull: boolean = reverseIndex(myXmaAntiLag) > reverseIndex(myXmaAntiLag, 1);

        let entryLongCond: boolean = isXmaBull && isXmaRsiBull && isXmaAntiLagBull;
        let entryShortCond: boolean = !isXmaBull && !isXmaRsiBull && !isXmaAntiLagBull;
        let exitLongCond: boolean = !isXmaBull;
        let exitShortCond: boolean = isXmaBull;
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