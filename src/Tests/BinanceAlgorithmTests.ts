import binanceAPI, {BinanceAPI, CandleChartResult} from "@jordanbonaldi/binancefetcher";
import {Trade} from "@jordanbonaldi/indicatorsapi";

export interface BinanceProperties {
    asset: string,
    timeframe: string,
}

export class BinanceAlgorithmTests {

    callback !: (candles: CandleChartResult[], assetDetail: string, assetTimeFrame: string) => Trade;
    binanceProperties !: BinanceProperties;

    constructor(callback: (candles: CandleChartResult[], assetDetail: string, assetTimeFrame: string) => Trade, binanceProperties: BinanceProperties) {
        this.callback = callback;
        this.binanceProperties = binanceProperties;
    }

    load(): Promise<Trade> {
        return binanceAPI().launch().then((binanceAPI: BinanceAPI) =>
            binanceAPI.getCandles(
                this.binanceProperties.asset,
                this.binanceProperties.timeframe
            ).then((candles: CandleChartResult[]) => this.callback(candles, this.binanceProperties.asset, this.binanceProperties.timeframe))
        )
    }
}


export default function algorithmTest(
    callback: (candles: CandleChartResult[], assetDetail: string, assetTimeFrame: string) => Trade,
    binanceProperties: BinanceProperties = {asset: 'BTCUSDT', timeframe: '1m'}
): Promise<Trade> {
    return new BinanceAlgorithmTests(callback, binanceProperties).load();
}
