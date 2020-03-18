import Strategy from "./Strategy";
import {EntryType, reverseIndex, rsi, sma, Trade, TradeTypes, Zlema} from "@jordanbonaldi/indicatorsapi";
import {CandleChartResult} from "@jordanbonaldi/binancefetcher";

export default new class XmaRsiStrategy extends Strategy {


    constructor() {
        super('XmaRsiStrategy');
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
    algorithm(candles: CandleChartResult[], assetDetail: string, assetTimeFrame: string, params: any, trade: Trade | undefined): Trade {
        if (!params.hasOwnProperty('xmaPeriod'))
            params = {
                xmaPeriod: 350,
                xmaRsiPeriod: 350,
                rsiPeriod: 250,
                stopLoss: 3.5
            };

        let printDebug: Function = (): void => {
            console.log(`Candles length: ${candles.length}`);
            console.log("xmaCandles: " + xmaCandles[xmaCandles.length - 1]);
            console.log("candles: " + candles.map(c => c.close)[998]);
            console.log("xMA: " + myXma.slice(myXma.length - 4, 999));
            console.log("RSI: " + myRsi.slice(myRsi.length - 4, 999));
            console.log("xMA RSI: " + myXmaRsi.slice(myXmaRsi.length - 4, 999));
        };

        console.log(params);

        let xmaCandles = candles.map(c => parseFloat(c.close)).slice(0, -1);
        let rsiCandles = candles.map(c => parseFloat(c.close)).slice(0, -1);
        let myXma = Zlema({ period: params.xmaPeriod, values: xmaCandles });
        let myRsi = rsi({ period: params.rsiPeriod, values: rsiCandles });
        let myXmaRsi = sma({ period: params.xmaRsiPeriod, values: myRsi });

        let isXmaBull = reverseIndex(myXma) > reverseIndex(myXma, 1);
        let isXmaRsiBull = reverseIndex(myXmaRsi) > reverseIndex(myXmaRsi, 1);

        return isXmaBull && isXmaRsiBull ?
            {
                entryType: EntryType.ENTRY,
                type: TradeTypes.LONG,
                entry: parseFloat(reverseIndex(candles, 1).close),
                stop: parseFloat(reverseIndex(candles, 1).close) * (1 - params.stopLoss / 100),
                asset: assetDetail,
                timeframe: assetTimeFrame,
                exit: 0
            } : !isXmaBull && !isXmaRsiBull ?
                {
                    entryType: EntryType.ENTRY,
                    type: TradeTypes.SHORT,
                    entry: parseFloat(reverseIndex(candles, 1).close),
                    stop: parseFloat(reverseIndex(candles, 1).close) * (1 + params.stopLoss / 100),
                    asset: assetDetail,
                    timeframe: assetTimeFrame,
                    exit: 0
                } : {
                    entryType: EntryType.NOTHING,
                    type: TradeTypes.LONG,
                    entry: 0,
                    stop: 0,
                    asset: assetDetail,
                    timeframe: assetTimeFrame,
                    exit: 0
                };
    }

}