import Strategy, {StrategyParams} from "./Strategy";
import {Alma, ema, reverseIndex, rsi, Zlema} from "@jordanbonaldi/indicatorsapi";
import {CandleModel} from "@jordanbonaldi/binancefetcher";
import {RiskType} from "../entity/BacktestParams";
import Trade from "../entity/Trade";
import {EntryType, TradeTypes} from "../entity/TradeTypes";
import {ExitTypes} from "../entity/ExitTypes";

export class XmaRsiInput implements StrategyParams {

    asset: string = 'BTCUSDT';
    timeframe: string[] = ['1d'];
    data = {
        xmaPeriod: 21,
        xmaRsiPeriod: 21,
        rsiPeriod: 14,
        useAntiLag: true,
        xmaAntiLagPeriod: 7
    };
    exit = {
        useStopLoss: false,
        stopPerc: 2.5
    };

}

export default new class XmaRsiStrategy extends Strategy<XmaRsiInput> {
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

    smma(input: any): number[] {
        var zlemaLag = (input.period - 1) / 2;
        var zlemaData = [];
        for (var a = input.values.length - 1; a > zlemaLag; a--)
            zlemaData.push(input.values[a] + (input.values[a] - input.values[a - zlemaLag]));
        return ema({ period: input.period, values: zlemaData.reverse() });
    }

    launchStrategy(candles: CandleModel[], trade: Trade | undefined, timeFrame: string, params: XmaRsiInput & StrategyParams): Trade {
        let printDebug: Function = (): void => {
            console.log(`Candles length: ${candles.length}`);
            console.log("candles: " + candles.map(c => c.close)[998]);
            console.log("xMA: " + myXma);
            console.log("xMA LEN: " + myXma.length);
            console.log("RSI: " + myRsi.slice(myRsi.length - 4, 999));
            console.log("xMA RSI: " + myXmaRsi.slice(myXmaRsi.length - 4, 999));
        };
        let lastCandle: CandleModel = reverseIndex(candles, 1);
        let liveCandle: CandleModel = reverseIndex(candles);

        let xmaCandles = candles.map(c => c.close).slice(0, -1);
        let rsiCandles = candles.map(c => c.close).slice(0, -1);
        let myXma: number[] = Alma({ period: params.data.xmaPeriod, values: xmaCandles, offset: 0.5, sigma: 6 });
        let myRsi = rsi({ period: params.data.rsiPeriod, values: rsiCandles });
        let myXmaRsi = Zlema({ period: params.data.xmaRsiPeriod, values: myRsi });
        //let myXmaAntiLag = this.smma({ period: params.data.xmaAntiLagPeriod, values: xmaCandles })
        //printDebug();

        let isXmaBull = reverseIndex(myXma) > reverseIndex(myXma, 1);
        let isXmaRsiBull = reverseIndex(myXmaRsi) > reverseIndex(myXmaRsi, 1);

        let longCond = isXmaBull && isXmaRsiBull;
        let shortCond = !isXmaBull && !isXmaRsiBull;
        let stopLossLong: number = params.exit.useStopLoss ? lastCandle.close * (1 - params.exit.stopPerc / 100) : 0;
        let stopLossShort: number = params.exit.useStopLoss ? lastCandle.close * (1 + params.exit.stopPerc / 100) : 0;

        let currentTrade: Trade | undefined = undefined

        if (!trade)
            currentTrade = longCond ? {
                entryType: EntryType.ENTRY,
                type: TradeTypes.LONG,
                price: lastCandle.close,
                stoploss: stopLossLong,
                exitType: ExitTypes.PROFIT,
                asset: params.asset,
                timeframe: timeFrame,
            } : shortCond ? {
                entryType: EntryType.ENTRY,
                type: TradeTypes.SHORT,
                price: lastCandle.close,
                stoploss: stopLossShort,
                exitType: ExitTypes.PROFIT,
                asset: params.asset,
                timeframe: timeFrame,
            } : undefined;
        else
            currentTrade = trade.type === TradeTypes.LONG ? (
                params.exit.useStopLoss && trade.stoploss > liveCandle.close ? { //lastCandle.low
                    entryType: EntryType.EXIT,
                    type: TradeTypes.LONG,
                    price: liveCandle.close, //trade.stoploss
                    stoploss: 0,
                    exitType: ExitTypes.STOPLOSS,
                    asset: params.asset,
                    timeframe: timeFrame,
                } : !longCond ? {
                    entryType: EntryType.EXIT,
                    type: TradeTypes.LONG,
                    price: lastCandle.close,
                    stoploss: 0,
                    exitType: ExitTypes.PROFIT,
                    asset: params.asset,
                    timeframe: timeFrame,
                } : undefined
            ) : trade.type === TradeTypes.SHORT ? (
                params.exit.useStopLoss && trade.stoploss < liveCandle.close ? { //lastCandle.high
                    entryType: EntryType.EXIT,
                    type: TradeTypes.SHORT,
                    price: liveCandle.close, //trade.stoploss
                    stoploss: 0,
                    exitType: ExitTypes.STOPLOSS,
                    asset: params.asset,
                    timeframe: timeFrame,
                } : !shortCond ? {
                    entryType: EntryType.EXIT,
                    type: TradeTypes.SHORT,
                    price: lastCandle.close,
                    stoploss: 0,
                    exitType: ExitTypes.PROFIT,
                    asset: params.asset,
                    timeframe: timeFrame,
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
        }
    }
}