import binanceAPI, {BinanceAPI, CandleChartResult} from "@jordanbonaldi/binancefetcher";
import {Trade} from "@jordanbonaldi/indicatorsapi";

export interface BinanceProperties {
    asset: string,
    timeframe: string,
}

export class BinanceAlgorithmTests {

    callback !: (candles: CandleChartResult[], assetDetail: string, assetTimeFrame: string, params: any, trade: Trade | undefined) => Trade;
    params !: any;
    binanceProperties !: BinanceProperties;

    constructor(callback: (candles: CandleChartResult[], assetDetail: string, assetTimeFrame: string, params: any, trade: Trade | undefined) => Trade, binanceProperties: BinanceProperties, params: {} = {}) {
        this.callback = callback;
        this.params = params;
        this.binanceProperties = binanceProperties;
    }

    load(): Promise<Trade> {
        return binanceAPI().launch().then((binanceAPI: BinanceAPI) =>
            binanceAPI.getCandles(
                this.binanceProperties.asset,
                this.binanceProperties.timeframe
            ).then((candles: CandleChartResult[]) => this.callback(candles, this.binanceProperties.asset, this.binanceProperties.timeframe, this.params, undefined))
        )
    }
}


export default function algorithmTest(
    callback: (candles: CandleChartResult[], assetDetail: string, assetTimeFrame: string, params: any, trade: Trade | undefined) => Trade,
    params: any = {},
    binanceProperties: BinanceProperties = {asset: 'BTCUSDT', timeframe: '4h'}
): Promise<Trade> {
    return new BinanceAlgorithmTests(callback, binanceProperties, params).load();
}
