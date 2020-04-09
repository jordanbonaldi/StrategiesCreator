import Strategy, { Persistence, StrategyParams } from "./Strategy";
import { Alma, sma, reverseIndex, rsi, Zlema } from "@jordanbonaldi/indicatorsapi";
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
        xmaAntiLagPeriod: 7
    };
    stopPercentage: number =  0;
    useStopLoss: boolean = false;
}

export interface XmaPersistence extends Persistence {
    value: number;
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

    smma(input: any): number[] {
        var smmaData: number[] = []
        var smaData: number[] = sma(input);//sma({ values: input.values.slice(-input.period * 3, input.values.length - input.period * 2), period: input.period });
        smmaData.push(smaData[smaData.length - 1])
        for (var a = input.period; a < input.values.length; a++) {
            smmaData.push(
                (smmaData[smmaData.length - 1] * (input.period - 1) + input.values[a]) / input.period
            );
        }
        return smmaData;
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
        let myXmaAntiLag = this.smma({ period: params.data.xmaAntiLagPeriod, values: xmaCandles })

        let isXmaBull = reverseIndex(myXma) > reverseIndex(myXma, 1);
        let isXmaRsiBull = reverseIndex(myXmaRsi) > reverseIndex(myXmaRsi, 1);
        let isXmaAntiLagBull = reverseIndex(myXmaAntiLag) > reverseIndex(myXmaAntiLag, 1)

        let longCond = isXmaBull && isXmaRsiBull;
        let shortCond = !isXmaBull && !isXmaRsiBull;
        let stopLossLong: number = params.useStopLoss ? lastCandle.close * (1 - params.stopPercentage / 100) : 0;
        let stopLossShort: number = params.useStopLoss ? lastCandle.close * (1 + params.stopPercentage / 100) : 0;

        let currentTrade: Trade | undefined = undefined;

        if (!this.data)
            this.data = { value: 0 };
        this.data.value += 1;

        if (!trade)
            currentTrade = shortCond || longCond ? {
                entryType: EntryType.ENTRY,
                type: longCond ? TradeTypes.LONG : TradeTypes.SHORT,
                price: lastCandle.close,
                stoploss: longCond ? stopLossLong : stopLossShort,
                exitType: ExitTypes.PROFIT,
                asset: params.asset,
                timeframe: timeFrame,
                date: new Date()
            } : undefined;
        else
            currentTrade = trade.type === TradeTypes.LONG ? (
                params.useStopLoss && trade.stoploss > liveCandle.close ? { //lastCandle.low
                    entryType: EntryType.EXIT,
                    type: TradeTypes.LONG,
                    price: liveCandle.close, //trade.stoploss
                    stoploss: 0,
                    exitType: ExitTypes.STOPLOSS,
                    asset: params.asset,
                    timeframe: timeFrame,
                    date: new Date()
                } : !longCond ? {
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
                params.useStopLoss && trade.stoploss < liveCandle.close ? { //lastCandle.high
                    entryType: EntryType.EXIT,
                    type: TradeTypes.SHORT,
                    price: liveCandle.close, //trade.stoploss
                    stoploss: 0,
                    exitType: ExitTypes.STOPLOSS,
                    asset: params.asset,
                    timeframe: timeFrame,
                    date: new Date()
                } : !shortCond ? {
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