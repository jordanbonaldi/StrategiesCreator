import Strategy, { Persistence, StrategyParams } from "./Strategy";
import { ichimokucloud, reverseIndex } from "@jordanbonaldi/indicatorsapi";
import { CandleModel } from "@jordanbonaldi/binancefetcher";
import { RiskType } from "../entity/BacktestParams";
import Trade from "../entity/Trade";
import { EntryType, TradeTypes } from "../entity/TradeTypes";
import { ExitTypes } from "../entity/ExitTypes";

export class IchimokuLongInput implements StrategyParams {
    asset = 'BTCUSDT';
    timeframe = ['4h'];
    stopPercentage: number = 5;
    useStopLoss: boolean = true;
    ichimokuInput = {
        conversionPeriod: 10,
        basePeriod: 30,
        spanPeriod: 60,
        displacement: 30
    };
    entry = {
        entryCrossTKBull: true,
        entryPriceAboveTenkan: true,
        entryPriceAboveKijun: true,
        entryPriceAboveKumo: true,
        entryChikuAbovePrice: true,
        entryChikuAboveTenkan: true,
        entryChikuAboveKijun: true,
        entryChikuAboveKumo: false,
        entryFuturBright: true,
    };
    exit = {
        exitCrossTKBear: false,
        exitPriceUnderTenkan: false,
        exitPriceUnderKijun: false,
        exitPriceUnderKumo: false,
        exitChikuUnderPrice: false,
        exitChikuUnderTenkan: false,
        exitChikuUnderKijun: false,
        exitChikuUnderKumo: false,
        exitFuturDark: true,
        exitXma: false,
        xmaPeriod: 21
    };
    misc = {
        long: true,
        short: false,
    };
}

export default new class IchimokuLongStrategy extends Strategy<IchimokuLongInput, Persistence> {
    constructor() {
        super('IchimokuLongStrategy',
            new IchimokuLongInput(),
            {
                warm_up: 121,
                equity: 1000,
                riskType: RiskType.PERCENT,
                riskInTrade: 90
            });
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
    launchStrategy(candles: CandleModel[], trade: Trade | undefined, timeFrame: string, params: IchimokuLongInput): Trade {
        let lows: number[] = candles.map(c => Number(c.low)).slice(0, -1);
        let highs: number[] = candles.map(c => Number(c.high)).slice(0, -1);
        let myIchi = ichimokucloud({ low: lows, high: highs, conversionPeriod: params.ichimokuInput.conversionPeriod, basePeriod: params.ichimokuInput.basePeriod, displacement: params.ichimokuInput.displacement, spanPeriod: params.ichimokuInput.spanPeriod });

        let liveCandle: CandleModel = reverseIndex(candles);
        let lastCandle: CandleModel = reverseIndex(candles, 1);
        let lagCandle: CandleModel = reverseIndex(candles, params.ichimokuInput.displacement);
        let lastIchi = reverseIndex(myIchi);
        let lagIchi = reverseIndex(myIchi, params.ichimokuInput.displacement);
        let lagLagIchi = reverseIndex(myIchi, params.ichimokuInput.displacement * 2 - 1);

        let isAboveTenkan: boolean = params.entry.entryPriceAboveTenkan ? lastCandle.close > lastIchi.conversion : true;
        let isAboveKijun: boolean = params.entry.entryPriceAboveKijun ? lastCandle.close > lastIchi.base : true;
        let isCrossTKBull: boolean = params.entry.entryCrossTKBull ? lastIchi.conversion > lastIchi.base : true;
        let kumoMax: number = Math.max(lagIchi.spanA, lagIchi.spanB);
        let kumoMaxPast: number = Math.max(lagLagIchi.spanA, lagLagIchi.spanB);
        let isAboveKumo: boolean = params.entry.entryPriceAboveKumo ? lastCandle.close > kumoMax : true;
        let isFuturBright: boolean = params.entry.entryFuturBright ? lastIchi.spanA >= lastIchi.spanB : true;
        let isChikuAbovePrice: boolean = params.entry.entryChikuAbovePrice ? lastCandle.close > Math.max(lagCandle.open, lagCandle.close) : true;
        let isChikuAboveTenkan: boolean = params.entry.entryChikuAboveTenkan ? lastCandle.close > lagIchi.conversion : true;
        let isChikuAboveKijun: boolean = params.entry.entryChikuAboveKijun ? lastCandle.close > lagIchi.base : true;
        let isChikuAboveKumo: boolean = params.entry.entryChikuAboveKumo ? lastCandle.close > kumoMaxPast : true;

        let exitIsUnderTenkan: boolean = params.exit.exitPriceUnderTenkan ? lastCandle.close < lastIchi.conversion : true;
        let exitIsUnderKijun: boolean = params.exit.exitPriceUnderKijun ? lastCandle.close < lastIchi.base : true;
        let exitIsCrossTKBear: boolean = params.exit.exitCrossTKBear ? lastIchi.conversion <= lastIchi.base : true;
        let exitIsUnderKumo: boolean = params.exit.exitPriceUnderKumo ? lastCandle.close < kumoMax : true;
        let exitIsFuturDark: boolean = params.exit.exitFuturDark ? lastIchi.spanA <= lastIchi.spanB : true;
        let exitIsChikuUnderPrice: boolean = params.exit.exitChikuUnderPrice ? lastCandle.close < Math.min(lagCandle.open, lagCandle.close) : true;
        let exitIsChikuUnderTenkan: boolean = params.exit.exitChikuUnderTenkan ? lastCandle.close < lagIchi.conversion : true;
        let exitIsChikuUnderKijun: boolean = params.exit.exitChikuUnderKijun ? lastCandle.close < lagIchi.base : true;
        let exitIsChikuUnderKumo: boolean = params.exit.exitChikuUnderKumo ? lastCandle.close < kumoMaxPast : true;

        let entryOneCond: boolean = params.entry.entryCrossTKBull || params.entry.entryPriceAboveTenkan || params.entry.entryPriceAboveKijun || params.entry.entryPriceAboveKumo || params.entry.entryChikuAbovePrice || params.entry.entryChikuAboveTenkan || params.entry.entryChikuAboveKijun || params.entry.entryChikuAboveKumo || params.entry.entryFuturBright;
        let longCond: boolean = entryOneCond && isCrossTKBull && isAboveKijun && isAboveTenkan && isAboveKumo && isChikuAbovePrice && isChikuAboveTenkan && isChikuAboveKijun && isChikuAboveKumo && isFuturBright;

        let exitOneCond: boolean = params.exit.exitCrossTKBear || params.exit.exitPriceUnderTenkan || params.exit.exitPriceUnderKijun || params.exit.exitPriceUnderKumo || params.exit.exitChikuUnderPrice || params.exit.exitChikuUnderTenkan || params.exit.exitChikuUnderKijun || params.exit.exitChikuUnderKumo || params.exit.exitFuturDark;
        let exitCond: boolean = exitOneCond && (exitIsCrossTKBear && exitIsUnderTenkan && exitIsUnderKijun && exitIsUnderKumo && exitIsChikuUnderPrice && exitIsChikuUnderTenkan && exitIsChikuUnderKijun && exitIsChikuUnderKumo && exitIsFuturDark);
        let stopLossLong: number = params.useStopLoss ? lastCandle.close * (1 - params.stopPercentage / 100) : 0;

        let currentTrade: Trade | undefined = undefined

        if (!trade && longCond) {
            console.log("isAboveTenkan: " + isAboveTenkan);
            console.log("isAboveKijun: " + isAboveKijun);
            console.log("isCrossTKBull: " + isCrossTKBull);
            console.log("kumoMax: " + kumoMax);
            console.log("kumoMaxPast: " + kumoMaxPast);
            console.log("isAboveKumo: " + isAboveKumo);
            console.log("isFuturBright: " + isFuturBright);
            console.log("isChikuAbovePrice: " + isChikuAbovePrice);
            console.log("isChikuAboveTenkan: " + isChikuAboveTenkan);
            console.log("isChikuAboveKijun: " + isChikuAboveKijun);
            console.log("isChikuAboveKumo: " + isChikuAboveKumo);
            console.log(lagCandle)
            console.log("longCond: " + longCond);
            console.log()
            console.log()
        }

        if (!trade)
            currentTrade = longCond ? {
                entryType: EntryType.ENTRY,
                type: TradeTypes.LONG,
                price: lastCandle.close,
                stoploss: stopLossLong,
                exitType: ExitTypes.PROFIT,
                asset: this.defaultParams.asset,
                timeframe: timeFrame,
                date: new Date()
            } : undefined;
        else
            currentTrade = trade.type === TradeTypes.LONG ? (
                params.useStopLoss && trade.stoploss > lastCandle.low ? { //liveCandle.close
                    entryType: EntryType.EXIT,
                    type: TradeTypes.LONG,
                    price: trade.stoploss, //liveCandle.close
                    stoploss: 0,
                    exitType: ExitTypes.STOPLOSS,
                    asset: this.defaultParams.asset,
                    timeframe: timeFrame,
                    date: new Date()
                } : exitCond ? {
                    entryType: EntryType.EXIT,
                    type: TradeTypes.LONG,
                    price: lastCandle.close,
                    stoploss: 0,
                    exitType: trade.price < lastCandle.close ? ExitTypes.PROFIT : ExitTypes.LOSS,
                    asset: this.defaultParams.asset,
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
            asset: this.defaultParams.asset,
            timeframe: timeFrame,
            date: new Date()
        }
    }
}