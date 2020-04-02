import Strategy, {StrategyParams} from "./Strategy";
import {reverseIndex, ichimokucloud} from "@jordanbonaldi/indicatorsapi";
import {CandleModel} from "@jordanbonaldi/binancefetcher";
import {RiskType} from "../entity/BacktestParams";
import Trade from "../entity/Trade";
import { EntryType, TradeTypes } from "../entity/TradeTypes";

export class IchimokuLongInput implements StrategyParams {
    asset = 'BTCUSDT';
    timeframe = ['1h'];
    ichimokuInput = {
        conversionPeriod: 9,
        basePeriod: 26,
        spanPeriod: 52,
        displacement: 26
    };
    entry = {
        entryCrossTKBull: true,
        entryPriceAboveTenkan: false,
        entryPriceAboveKijun: true,
        entryPriceAboveKumo: true,
        entryChikuAboveAll: true,
        entryFuturBright: true,
    };
    exit = {
        exitCrossTKBear: false,
        exitPriceUnderTenkan: false,
        exitPriceUnderKijun: true,
        exitPriceUnderKumo: false,
        exitChikuUnderSmthg: false,
        exitFuturDark: false,
        useStopLoss: true,
        stopPerc: 1
    };
    misc = {
        long: true,
        short: false,
    };
}

export default new class IchimokuLongStrategy extends Strategy<IchimokuLongInput> {
    constructor() {
        super('IchimokuLongStrategy',
            new IchimokuLongInput(),
            {
                warm_up: 120,
                equity: 100,
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

        let printDebug: Function = (): void => {
            console.log(reverseIndex(candles, 1));
            console.log(reverseIndex(myIchi, params.ichimokuInput.displacement - 1));
            console.log(reverseIndex(myIchi));
        }

        let lows: number[] = candles.map(c => c.low).slice(0, -1);
        let highs: number[] = candles.map(c => c.high).slice(0, -1);
        let myIchi = ichimokucloud({ low: lows, high: highs, conversionPeriod: params.ichimokuInput.conversionPeriod, basePeriod: params.ichimokuInput.basePeriod, displacement: params.ichimokuInput.displacement, spanPeriod: params.ichimokuInput.spanPeriod });

        let lastCandle: CandleModel = reverseIndex(candles, 1);
        let lagCandle: CandleModel = reverseIndex(candles, params.ichimokuInput.displacement - 1);
        let lastIchi = reverseIndex(myIchi);
        let lagIchi = reverseIndex(myIchi, params.ichimokuInput.displacement - 1);
        let lagLagIchi = reverseIndex(myIchi, params.ichimokuInput.displacement * 2 - 1);

        let isAboveTenkan: boolean = params.entry.entryPriceAboveTenkan ? lastCandle.close > lastIchi.conversion : true;
        let isAboveKijun: boolean = params.entry.entryPriceAboveKijun ? lastCandle.close > lastIchi.base : true;
        let isCrossTKBull: boolean = params.entry.entryCrossTKBull ? lastIchi.conversion > lastIchi.base : true;
        let kumoMax: number = Math.max(lagIchi.spanA, lagIchi.spanB);
        let kumoMaxPast: number = Math.max(lagLagIchi.spanA, lagLagIchi.spanB);
        let isAboveKumo: boolean = params.entry.entryPriceAboveKumo ? lastCandle.close > kumoMax : true;
        let isFuturBright: boolean = params.entry.entryFuturBright ? lagIchi.spanA > lagIchi.spanB : true;
        let tmpChiku: boolean = lastCandle.close > lagCandle.close && lastCandle.close > lagIchi.conversion && lastCandle.close > lagIchi.base && lastCandle.close > kumoMaxPast;
        let isChikuAboveAll: boolean = params.entry.entryChikuAboveAll ? tmpChiku : true;

        let exitIsUnderTenkan: boolean = params.exit.exitPriceUnderTenkan ? lastCandle.close < lastIchi.conversion : true;
        let exitIsUnderKijun: boolean = params.exit.exitPriceUnderKijun ? lastCandle.close < lastIchi.base : true;
        let exitIsCrossTKBear: boolean = params.exit.exitCrossTKBear ? lastIchi.conversion < lastIchi.base : true;
        let exitIsUnderKumo: boolean = params.exit.exitPriceUnderKumo ? lastCandle.close < kumoMax : true;
        let exitIsFuturDark: boolean = params.exit.exitFuturDark ? lagIchi.spanA < lagIchi.spanB : true;
        let exitIsChikuUnderSmthg: boolean = params.exit.exitChikuUnderSmthg ? !tmpChiku : true;

        let entryOneCond: boolean = params.entry.entryCrossTKBull || params.entry.entryPriceAboveTenkan || params.entry.entryPriceAboveKijun || params.entry.entryPriceAboveKumo || params.entry.entryChikuAboveAll || params.entry.entryFuturBright;
        let longCond: boolean = entryOneCond && isCrossTKBull && isAboveKijun && isAboveTenkan && isAboveKumo && isChikuAboveAll && isFuturBright;

        let exitOneCond: boolean = params.exit.exitCrossTKBear || params.exit.exitPriceUnderTenkan || params.exit.exitPriceUnderKijun || params.exit.exitPriceUnderKumo || params.exit.exitChikuUnderSmthg || params.exit.exitFuturDark;
        let exitCond: boolean = exitOneCond && (exitIsCrossTKBear && exitIsUnderTenkan && exitIsUnderKijun && exitIsUnderKumo && exitIsChikuUnderSmthg && exitIsFuturDark);
        let stoploss: number = params.exit.useStopLoss ? lastCandle.close * (1 - params.exit.stopPerc / 100) : 0;

        let currentTrade: Trade | undefined =
            params.misc.long && longCond && !trade ? {
                entryType: EntryType.ENTRY,
                type: TradeTypes.LONG,
                price: lastCandle.close,
                stoploss: stoploss,
                asset: this.defaultParams.asset,
                timeframe: timeFrame,
            } : (exitCond || (trade && lastCandle.close < trade.stoploss)) && trade?.entryType == EntryType.ENTRY ? {
                entryType: EntryType.EXIT,
                type: TradeTypes.LONG,
                price: lastCandle.close < trade.stoploss ? trade.stoploss : lastCandle.close,
                stoploss: 0,
                asset: this.defaultParams.asset,
                timeframe: timeFrame,
            } : undefined;

        return currentTrade ? currentTrade : {
            entryType: EntryType.NOTHING,
            type: TradeTypes.LONG,
            price: 0,
            stoploss: 0,
            asset: this.defaultParams.asset,
            timeframe: timeFrame,
        };
    }
}