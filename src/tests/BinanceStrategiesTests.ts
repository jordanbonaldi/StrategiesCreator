import binanceAPI, {BinanceAPI, CandleModel} from "@jordanbonaldi/binancefetcher";
import StrategyHandler from "../handlers/StrategyHandler";
import Strategy, {Persistence, StrategyParams} from "../strategies/Strategy";
import Config from "../../config/Config";
import StrategyResult from "../entity/StrategyResult";
import Trade from "../entity/Trade";

export interface BinanceProperties {
    asset: string,
    timeframe: string,
}

export default new class BinanceAlgorithmTests {

    binanceAPI!: BinanceAPI;

    constructor() {
        Config.strategies;
    }


    connect(): Promise<BinanceAlgorithmTests> {
        return binanceAPI().launch().then((instance: BinanceAPI) => {
            this.binanceAPI = instance;

            return this;
        })
    }

    runAllOnAllAssets(timeFrame: string): Promise<Trade[]> {
        let trades: Trade[] = [];

        return this.binanceAPI.getAllSymbols().then((symbols: string[]) =>
            Promise.all(symbols.map((symbol: string) =>
                this.binanceAPI.getCandles(symbol, timeFrame)
                    .then((candleResults: CandleModel[]) =>
                        trades.push(...StrategyHandler.getAll().map(
                            (strategy: Strategy<& StrategyParams, & Persistence>) => strategy.launchBootstrapStrategy(candleResults, timeFrame)
                        ))
                    )
            )).then(() => trades)
        )
    }

    /**
     *
     * @param properties
     */
    runAllOnAsset(properties: BinanceProperties): Promise<Trade[]> {
        return Promise.all(StrategyHandler.getAll().map((strategy: Strategy<& StrategyParams, & Persistence>) => this.binanceAPI.getCandles(
            properties.asset, properties.timeframe
        ).then((candles: CandleModel[]) => strategy.launchBootstrapStrategy(candles, properties.timeframe))));
    }

    /**
     *
     * @param strategy
     * @param timeFrame
     */
    runStrategyOnAllAssets(strategy: string, timeFrame: string): Promise<Trade[] | Error> {
        let trades: Trade[] = [];

        return this.binanceAPI.getAllSymbols().then((symbols: string[]) =>
            Promise.all(symbols.map((symbol: string) =>
                this.binanceAPI.getCandles(symbol, timeFrame)
                    .then((candleResults: CandleModel[]) => {
                        let foundStrategy: Strategy<& StrategyParams, & Persistence> | undefined = StrategyHandler.getStrategyByName(strategy);
                        if (foundStrategy == null) return Error('Strategy not found');

                        trades.push(foundStrategy.launchBootstrapStrategy(candleResults, timeFrame))
                    })
            )
            ).then(() => trades)
        )
    }

    /**
     *
     * @param strategy
     * @param binanceProperties
     */
    runStrategyOnAsset(strategy: string, binanceProperties: BinanceProperties): Promise<Trade | Error> {
        return this.binanceAPI.getCandles(binanceProperties.asset, binanceProperties.timeframe)
            .then((candles: CandleModel[]) => {
                let foundStrategy: Strategy<& StrategyParams, & Persistence> | undefined = StrategyHandler.getStrategyByName(strategy);
                if (foundStrategy == null) return Error('Strategy not found');

                return foundStrategy.launchBootstrapStrategy(candles, binanceProperties.timeframe)
            })
    }

    /**
     *
     * @param strategy
     * @param binanceProperties
     */
    runBacktestOnAsset(strategy: string, binanceProperties: BinanceProperties): Promise<StrategyResult | Error> {
        return this.binanceAPI.getCandles(binanceProperties.asset, binanceProperties.timeframe)
            .then((candles: CandleModel[]) => {
                let foundStrategy: Strategy<& StrategyParams, & Persistence> | undefined = StrategyHandler.getStrategyByName(strategy);
                if (foundStrategy == null) return Error('Strategy not found');

                return foundStrategy.tryStrategy(candles, binanceProperties.timeframe)
            })
    }

    /**
     *
     * @param strategy
     * @param binanceProperties
     * @param callback
     */
    runBootstrapStrategyOnProductionAPIAsset(strategy: string, binanceProperties: BinanceProperties, callback: (trade: Trade) => void): void {
        this.binanceAPI.socketWatcher(binanceProperties.asset, binanceProperties.timeframe, true, (candles: CandleModel[]) => {
            let foundStrategy: Strategy<& StrategyParams, & Persistence> | undefined = StrategyHandler.getStrategyByName(strategy);
            if (foundStrategy == null) return Error('Strategy not found');

            callback(foundStrategy.launchBootstrapStrategy(candles, binanceProperties.timeframe));
        });
    }
}
