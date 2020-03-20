import Strategy, { StrategyParams } from "./Strategy";
import { Alma, EntryType, reverseIndex, rsi, sma, Trade, TradeTypes } from "@jordanbonaldi/indicatorsapi";
import { CandleChartResult, CandleModel } from "@jordanbonaldi/binancefetcher";

export interface XmaRsiInput extends StrategyParams {
    xmaPeriod: number,
    xmaRsiPeriod: number,
    rsiPeriod: number,
    stopLoss: number
}

export default new class XmaRsiStrategy extends Strategy<XmaRsiInput> {


    constructor() {
        super('XmaRsiStrategy', {
            xmaPeriod: 21,
            xmaRsiPeriod: 21,
            rsiPeriod: 14,
            stopLoss: 3.5
        });
    }

    /**
     *
     * @param candles Candle Model of type Candle
     * @param assetDetail Assets name
     * @param assetTimeFrame TimeFrame Used
     *
     * Copy paste the code below inside brackets
     * @param trade possible current trade
     * @param params params taken
     */
    algorithm(candles: CandleModel[], assetDetail: string, assetTimeFrame: string, trade: Trade | undefined, params: XmaRsiInput): Trade {
        let printDebug: Function = (): void => {
            console.log(`Candles length: ${candles.length}`);
            console.log("candles: " + candles.map(c => c.close)[998]);
            console.log("xMA: " + myXma);
            console.log("xMA LEN: " + myXma.length);
            console.log("RSI: " + myRsi.slice(myRsi.length - 4, 999));
            console.log("xMA RSI: " + myXmaRsi.slice(myXmaRsi.length - 4, 999));
        };
        let xmaCandles = candles.map(c => c.close).slice(0, -1);
        let rsiCandles = candles.map(c => c.close).slice(0, -1);
        let myXma: number[] = Alma({ period: params.xmaPeriod, values: xmaCandles, offset: 0.5, sigma: 6 });
        let myRsi = rsi({ period: params.rsiPeriod, values: rsiCandles });
        let myXmaRsi = sma({ period: params.xmaRsiPeriod, values: myRsi });
        printDebug();

        let isXmaBull = reverseIndex(myXma) > reverseIndex(myXma, 1);
        let isXmaRsiBull = reverseIndex(myXmaRsi) > reverseIndex(myXmaRsi, 1);

        console.log(isXmaBull)
        console.log(isXmaRsiBull)

        return isXmaBull && isXmaRsiBull ?
            {
                entryType: EntryType.ENTRY,
                type: TradeTypes.LONG,
                price: reverseIndex(candles, 1).close,
                stoploss: reverseIndex(candles, 1).close * (1 - params.stopLoss / 100),
                asset: assetDetail,
                timeframe: assetTimeFrame,
            } : !isXmaBull && !isXmaRsiBull ?
                {
                    entryType: EntryType.ENTRY,
                    type: TradeTypes.SHORT,
                    price: reverseIndex(candles, 1).close,
                    stoploss: reverseIndex(candles, 1).close * (1 + params.stopLoss / 100),
                    asset: assetDetail,
                    timeframe: assetTimeFrame,
                } : {
                    entryType: EntryType.NOTHING,
                    type: TradeTypes.LONG,
                    price: 0,
                    stoploss: 0,
                    asset: assetDetail,
                    timeframe: assetTimeFrame,
                };
    }
}