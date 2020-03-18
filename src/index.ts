import { Trade, rsi, sma, ema, wma, Zlema, setConfig } from "@jordanbonaldi/indicatorsapi";
import { CandleChartResult } from '@jordanbonaldi/binancefetcher';
import { EntryType, TradeTypes } from "@jordanbonaldi/indicatorsapi";
import algorithmTest from "./Tests/BinanceAlgorithmTests";

/**
 *
 * @param candles Candle Model of type Candle
 * @param assetDetail Assets name
 * @param assetTimeFrame TimeFrame Used
 *
 * Copy paste the code below inside brackets
 */
function algorithm(candles: CandleChartResult[], assetDetail: string, assetTimeFrame: string): Trade {
    setConfig('precision', 10)

    let printDebug: Function = (): void => {
        console.log(`Candles length: ${candles.length}`);
        console.log("xmaCandles: " + xmaCandles[xmaCandles.length - 1])
        console.log("candles: " + candles.map(c => c.close)[998])
        console.log("xMA: " + myXma.slice(myXma.length - 4, 999))
        console.log("RSI: " + myRsi.slice(myRsi.length - 4, 999))
        console.log("xMA RSI: " + myXmaRsi.slice(myXmaRsi.length - 4, 999))
    }

    let reverseIndex: Function = <T>(array: T[], index: number=0): T => array[array.length - 1 - index];

    let xmaPeriod = 21
    let rsiPeriod = 14
    let xmaRsiPeriod = 21
    let stoploss = 3

    let xmaCandles = candles.map(c => parseFloat(c.close)).slice(0, -1)
    let rsiCandles = candles.map(c => parseFloat(c.close)).slice(0, -1)
    let myXma = Zlema({ period: xmaPeriod, values: xmaCandles })
    let myRsi = rsi({ period: rsiPeriod, values: rsiCandles })
    let myXmaRsi = sma({ period: xmaRsiPeriod, values: myRsi })

    let isXmaBull = reverseIndex(myXma).close > reverseIndex(myXma, 1).close ? true : false
    let isXmaRsiBull = reverseIndex(myXmaRsi).close > reverseIndex(myXmaRsi, 1).close ? true : false

    if (isXmaBull && isXmaRsiBull) {
        return {
            entryType: EntryType.ENTRY,
            type: TradeTypes.LONG,
            entry: parseFloat(reverseIndex(candles).close),
            stop: parseFloat(reverseIndex(candles).close) * (1 - stoploss / 100),
            asset: assetDetail,
            timeframe: assetTimeFrame,
            exit: 0 // optional
        }
    }
    else if (!isXmaBull && !isXmaRsiBull) {
        return {
            entryType: EntryType.ENTRY,
            type: TradeTypes.SHORT,
            entry: parseFloat(candles[candles.length - 1 - 1].close),
            stop: parseFloat(candles[candles.length - 1 - 1].close) * (1 + stoploss / 100),
            asset: assetDetail,
            timeframe: assetTimeFrame,
            exit: 0 // optional
        }
    }
    else
        return {
            entryType: EntryType.NOTHING,
            type: TradeTypes.LONG,
            entry: 0,
            stop: 0,
            asset: assetDetail,
            timeframe: assetTimeFrame,
            exit: 0 // optional
        }
}

algorithmTest(algorithm).then((trade: Trade) => console.log(trade));