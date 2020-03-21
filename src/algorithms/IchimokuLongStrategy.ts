import Strategy, { StrategyParams } from "./Strategy";
import { EntryType, reverseIndex, ichimokucloud, Trade, TradeTypes, IchimokuCloud } from "@jordanbonaldi/indicatorsapi";
import { CandleChartResult, CandleModel } from "@jordanbonaldi/binancefetcher";

export interface IchimokuLongInput extends StrategyParams {
    ichimokuInput: {
        conversionPeriod: number;
        basePeriod: number;
        spanPeriod: number;
        displacement: number;
    },
    entry: {
        entryCrossTKBull: boolean;
        entryPriceAboveKijun: boolean;
        entryPriceAboveTenkan: boolean;
        entryPriceAboveKumo: boolean;
        entryChikuAboveAll: boolean;
        entryFuturBright: boolean;
    },
    exit: {
        exitCrossTKBear: boolean;
        exitPriceUnderKijun: boolean;
        exitPriceUnderTenkan: boolean;
        exitPriceUnderKumo: boolean;
        exitChikuUnderSmthg: boolean;
        exitFuturDark: boolean;
        useStopLoss: boolean;
        stopPerc: number;
    }
}

export default new class IchimokuLongStrategy extends Strategy<IchimokuLongInput> {

    constructor() {
        super('IchimokuLongStrategy', {
            ichimokuInput: {
                conversionPeriod: 9,
                basePeriod: 26,
                spanPeriod: 52,
                displacement: 26
            },
            entry: {
                entryCrossTKBull: true,
                entryPriceAboveTenkan: false,
                entryPriceAboveKijun: true,
                entryPriceAboveKumo: true,
                entryChikuAboveAll: true,
                entryFuturBright: true,
            },
            exit: {
                exitCrossTKBear: true,
                exitPriceUnderTenkan: false,
                exitPriceUnderKijun: true,
                exitPriceUnderKumo: true,
                exitChikuUnderSmthg: true,
                exitFuturDark: true,
                useStopLoss: false,
                stopPerc: 10,
            }
        });
    }

    backtest(candles: CandleModel[], assetDetail: string, assetTimeFrame: string, params: IchimokuLongInput): Trade[] {
        let Trades: Trade[] = [];
        let currentTrade: Trade | undefined = undefined;

        for (let a = params.ichimokuInput.spanPeriod + 1; a < candles.length; a++) {
            currentTrade = this.algorithm(candles.slice(0, a), assetDetail, assetTimeFrame, currentTrade, params);
            if (currentTrade.entryType != EntryType.NOTHING) {
                console.log(currentTrade);
                Trades.push(currentTrade);
                currentTrade = undefined;
            }
        }

        return Trades;
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
    algorithm(candles: CandleModel[], assetDetail: string, assetTimeFrame: string, trade: Trade | undefined, params: IchimokuLongInput): Trade {

        let printDebug: Function = (): void => {
            console.log(reverseIndex(candles, 1));
            console.log(reverseIndex(myIchi, params.ichimokuInput.displacement - 1));
            console.log(reverseIndex(myIchi));
        }

        let lows: number[] = candles.map(c => c.low).slice(0, -1);
        let highs: number[] = candles.map(c => c.high).slice(0, -1);
        let myIchi = ichimokucloud({ low: lows, high: highs, conversionPeriod: params.ichimokuInput.conversionPeriod, basePeriod: params.ichimokuInput.basePeriod, displacement: params.ichimokuInput.displacement, spanPeriod: params.ichimokuInput.spanPeriod });

        let lastCandle: CandleModel = reverseIndex(candles, 1)
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
        let exitCond: boolean = exitOneCond && exitIsCrossTKBear && exitIsUnderTenkan && exitIsUnderKijun && exitIsUnderKumo && exitIsChikuUnderSmthg && exitIsFuturDark;

        let currentTrade: Trade | undefined =
            longCond && !trade ? {
                entryType: EntryType.ENTRY,
                type: TradeTypes.LONG,
                price: reverseIndex(candles, 1).close,
                stoploss: 0,
                asset: assetDetail,
                timeframe: assetTimeFrame,
            } : exitCond && trade ? {
                entryType: EntryType.EXIT,
                type: TradeTypes.LONG,
                price: reverseIndex(candles, 1).close,
                stoploss: 0,
                asset: assetDetail,
                timeframe: assetTimeFrame,
            } : undefined

        return currentTrade ? currentTrade : {
            entryType: EntryType.NOTHING,
            type: TradeTypes.LONG,
            price: 0,
            stoploss: 0,
            asset: assetDetail,
            timeframe: assetTimeFrame,
        };
    }
}