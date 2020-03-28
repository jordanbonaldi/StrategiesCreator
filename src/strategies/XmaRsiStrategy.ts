import Strategy, { StrategyParams } from "./Strategy";
import { Alma, reverseIndex, rsi, sma } from "@jordanbonaldi/indicatorsapi";
import { CandleModel } from "@jordanbonaldi/binancefetcher";
import { RiskType } from "../entity/BacktestParams";
import Trade from "../entity/Trade";
import { EntryType, TradeTypes } from "../entity/TradeTypes";

export class XmaRsiInput implements StrategyParams {
    asset = 'BTCUSDT';
    timeframe = '1h';
    data = {
        xmaPeriod: 21,
        xmaRsiPeriod: 21,
        rsiPeriod: 14,
    };
    exit = {
        useStopLoss: true,
        stopPerc: 3.5
    };
}

export default new class XmaRsiStrategy extends Strategy<XmaRsiInput> {
    constructor() {
        super('XmaRsiStrategy', new XmaRsiInput(), {
            equity: 100, riskInTrade: 90, riskType: RiskType.FIXED_AMOUNT, warm_up: 70
        });
    }

    /**
     *
     * @param candles Candle Model of type Candle
     *
     * Copy paste the code below inside brackets
     * @param trade possible current trade
     * @param params params taken
     */
    launchStrategy(candles: CandleModel[], trade: Trade | undefined, params: XmaRsiInput & StrategyParams): Trade {
        let printDebug: Function = (): void => {
            console.log(`Candles length: ${candles.length}`);
            console.log("candles: " + candles.map(c => c.close)[998]);
            console.log("xMA: " + myXma);
            console.log("xMA LEN: " + myXma.length);
            console.log("RSI: " + myRsi.slice(myRsi.length - 4, 999));
            console.log("xMA RSI: " + myXmaRsi.slice(myXmaRsi.length - 4, 999));
        };
        let lastCandle: CandleModel = reverseIndex(candles, 1);

        let xmaCandles = candles.map(c => c.close).slice(0, -1);
        let rsiCandles = candles.map(c => c.close).slice(0, -1);
        let myXma: number[] = Alma({ period: params.data.xmaPeriod, values: xmaCandles, offset: 0.5, sigma: 6 });
        let myRsi = rsi({ period: params.data.rsiPeriod, values: rsiCandles });
        let myXmaRsi = sma({ period: params.data.xmaRsiPeriod, values: myRsi });
        //printDebug();

        let isXmaBull = reverseIndex(myXma) > reverseIndex(myXma, 1);
        let isXmaRsiBull = reverseIndex(myXmaRsi) > reverseIndex(myXmaRsi, 1);

        let longCond = isXmaBull && isXmaRsiBull;
        let stoploss: number = params.exit.useStopLoss ? lastCandle.close * (1 - params.exit.stopPerc / 100) : 0;

        let currentTrade: Trade | undefined =
            longCond ? {
                entryType: EntryType.ENTRY,
                type: TradeTypes.LONG,
                price: lastCandle.close,
                stoploss: trade && trade.stoploss > 0 ? trade.stoploss : stoploss,
                asset: this.defaultParams.asset,
                timeframe: this.defaultParams.timeframe,
            } : (!longCond && trade || (trade && lastCandle.close < trade.stoploss)) && trade?.entryType == EntryType.ENTRY ? {
                entryType: EntryType.EXIT,
                type: TradeTypes.LONG,
                price: lastCandle.close < trade.stoploss ? trade.stoploss : lastCandle.close,
                stoploss: 0,
                asset: this.defaultParams.asset,
                timeframe: this.defaultParams.timeframe,
            } : undefined;

        return currentTrade ? currentTrade : {
            entryType: EntryType.NOTHING,
            type: TradeTypes.LONG,
            price: 0,
            stoploss: 0,
            asset: this.defaultParams.asset,
            timeframe: this.defaultParams.timeframe,

        }
    }
}