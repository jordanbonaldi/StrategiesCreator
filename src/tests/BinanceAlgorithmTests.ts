import binanceAPI, {BinanceAPI, CandleChartResult} from "@jordanbonaldi/binancefetcher";
import {Trade} from "@jordanbonaldi/indicatorsapi";
import StrategyHandler from "../handlers/StrategyHandler";
import Strategy, {StrategyParams} from "../algorithms/Strategy";
import Config from "../../config/Config";

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
                    .then((candleResults: CandleChartResult[]) =>
                        trades.push(...StrategyHandler.getAll().map(
                            (strategy: Strategy<& StrategyParams>) => strategy.launchBootstrapAlgorithm(candleResults, symbol, timeFrame)
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
        return Promise.all(StrategyHandler.getAll().map((strategy: Strategy< & StrategyParams>) => this.binanceAPI.getCandles(
            properties.asset, properties.timeframe
        ).then((candles: CandleChartResult[]) => strategy.launchBootstrapAlgorithm(candles, properties.asset, properties.timeframe))));
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
                    .then((candleResults: CandleChartResult[]) => {
                        let foundStrategy: Strategy< & StrategyParams> | undefined = StrategyHandler.getStrategyByName(strategy);
                        if (foundStrategy == null) return Error('Strategy not found');

                        trades.push(foundStrategy.launchBootstrapAlgorithm(candleResults, symbol, timeFrame))
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
            .then((candles: CandleChartResult[]) => {
                let foundStrategy: Strategy< & StrategyParams> | undefined = StrategyHandler.getStrategyByName(strategy);
                if (foundStrategy == null) return Error('Strategy not found');

                return foundStrategy.launchBootstrapAlgorithm(candles, binanceProperties.asset, binanceProperties.timeframe)
            })
    }
}
