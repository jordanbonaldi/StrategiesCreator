import {Trade} from "@jordanbonaldi/indicatorsapi";
import {CandleChartResult} from '@jordanbonaldi/binancefetcher';
import {EntryType, TradeTypes} from "@jordanbonaldi/indicatorsapi";
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
    console.log(`Candles length: ${candles.length}`);

    return {
        entryType: EntryType.ENTRY,
        entry: 0,
        stop: 0,
        type: TradeTypes.SHORT,
        asset: assetDetail,
        timeframe: assetTimeFrame,
        exit: 0 // optional
    }
}

algorithmTest(algorithm).then((trade: Trade) => console.log(trade));