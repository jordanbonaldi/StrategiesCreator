import Strategy, {StrategyParams} from "./Strategy";
import { EntryType, reverseIndex, rsi, sma, Trade, TradeTypes, Zlema } from "@jordanbonaldi/indicatorsapi";
import { CandleChartResult } from "@jordanbonaldi/binancefetcher";

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
    algorithm(candles: CandleChartResult[], assetDetail: string, assetTimeFrame: string, trade: Trade | undefined, params: XmaRsiInput): Trade {
        let printDebug: Function = (): void => {
            console.log(`Candles length: ${candles.length}`);
            console.log("candles: " + candles.map(c => c.close)[998]);
            console.log("xMA: " + myXma);
            console.log("xMA LEN: " + myXma.length);
            console.log("RSI: " + myRsi.slice(myRsi.length - 4, 999));
            console.log("xMA RSI: " + myXmaRsi.slice(myXmaRsi.length - 4, 999));
        };

        let Alma: Function = (input: { period: number, values: number[], offset: number, sigma: number }): number[] => {
            let almaValues: number[] = [];

            let almaCandle: Function = (candleIndex: number): number => {
                let m: number = Math.floor(input.offset * (input.period - 1));
                let s: number = input.period / input.sigma;
                let weight: number = 0, norm: number = 0, sum: number = 0;
                for (let a = 0; a < input.period; a++) {
                    weight = Math.exp(-1 * Math.pow(a - m, 2) / (2 * Math.pow(s, 2)))
                    norm = norm + weight
                    sum = sum + (reverseIndex(input.values, candleIndex + input.period - 1 - a) * weight)
                }
                return (sum / norm)
            }

            for (let candleIndex: number = input.values.length - input.period; candleIndex >= 0; candleIndex--)
                almaValues.push(almaCandle(candleIndex));
            return almaValues.reverse();
        }

        let xmaCandles = candles.map(c => parseFloat(c.close)).slice(0, -1);
        let rsiCandles = candles.map(c => parseFloat(c.close)).slice(0, -1);
        let myXma: number[] = Alma({ period: params.xmaPeriod, values: xmaCandles, offset: 0.5, sigma: 6 });
        let myRsi = rsi({ period: params.rsiPeriod, values: rsiCandles });
        let myXmaRsi = sma({ period: params.xmaRsiPeriod, values: myRsi });
        //printDebug()

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